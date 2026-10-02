// GA4 Data API에서 광고로 들어온 세션의 퍼널 이벤트 수를 utm_content별로 읽는다.
import { BetaAnalyticsDataClient } from "@google-analytics/data"
import { UNKNOWN, type GaRow } from "./report.ts"

const EVENTS = {
  check_start: "checkStart",
  check_complete: "checkComplete",
  clinic_click: "clinicClick",
  share_click: "share",
} as const

type EventName = keyof typeof EVENTS

export type GaApiRow = {
  dimensionValues?: { value?: string | null }[] | null
  metricValues?: { value?: string | null }[] | null
}

export function parseGaRows(rows: GaApiRow[]): GaRow[] {
  const byKey = new Map<string, GaRow>()
  for (const row of rows) {
    const [content, event] = (row.dimensionValues ?? []).map(
      (d) => d.value ?? "",
    )
    const field = EVENTS[event as EventName]
    if (!field) continue
    const key = !content || content === "(not set)" ? UNKNOWN : content.trim()
    const r =
      byKey.get(key) ??
      byKey
        .set(key, {
          key,
          checkStart: 0,
          checkComplete: 0,
          clinicClick: 0,
          share: 0,
        })
        .get(key)!
    r[field] += Number(row.metricValues?.[0]?.value ?? 0)
  }
  return [...byKey.values()]
}

export type GaConfig = {
  propertyId: string
  keyFile: string
  source: string // utm_source 값
}

export async function fetchGaRows(
  c: GaConfig,
  since: string,
  until: string,
): Promise<GaRow[]> {
  const client = new BetaAnalyticsDataClient({ keyFilename: c.keyFile })
  const [res] = await client.runReport({
    property: `properties/${c.propertyId}`,
    dateRanges: [{ startDate: since, endDate: until }],
    dimensions: [{ name: "sessionManualAdContent" }, { name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "sessionSource",
              stringFilter: { value: c.source, matchType: "EXACT" },
            },
          },
          {
            filter: {
              fieldName: "eventName",
              inListFilter: { values: Object.keys(EVENTS) },
            },
          },
        ],
      },
    },
    limit: 1000,
  })
  return parseGaRows(res.rows ?? [])
}
