// 메타 Insights API에서 캠페인의 광고별 숫자를 읽는다. 읽기만 한다.
import type { MetaRow } from "./report.ts"

type InsightsResponse = {
  data: {
    ad_name?: string
    spend?: string
    impressions?: string
    inline_link_clicks?: string
    actions?: { action_type: string; value: string }[]
  }[]
  paging?: { next?: string }
}

export function parseInsights(res: InsightsResponse): MetaRow[] {
  return res.data.map((d) => ({
    key: (d.ad_name ?? "").trim(),
    spend: Number(d.spend ?? 0),
    impressions: Number(d.impressions ?? 0),
    linkClicks: Number(d.inline_link_clicks ?? 0),
    landingViews: Number(
      d.actions?.find((a) => a.action_type === "landing_page_view")?.value ??
        0,
    ),
  }))
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const body = await res.json()
  if (!res.ok)
    throw new Error(`메타 API ${res.status}: ${JSON.stringify(body.error ?? body)}`)
  return body as T
}

export type MetaConfig = {
  token: string
  campaignId: string
  version: string
}

export async function fetchCampaignStart(c: MetaConfig): Promise<string> {
  const url = new URL(`https://graph.facebook.com/${c.version}/${c.campaignId}`)
  url.searchParams.set("fields", "start_time")
  url.searchParams.set("access_token", c.token)
  const body = await getJson<{ start_time: string }>(url.toString())
  return body.start_time
}

export async function fetchMetaRows(
  c: MetaConfig,
  since: string,
  until: string,
): Promise<MetaRow[]> {
  const url = new URL(
    `https://graph.facebook.com/${c.version}/${c.campaignId}/insights`,
  )
  url.searchParams.set("level", "ad")
  url.searchParams.set(
    "fields",
    "ad_name,spend,impressions,inline_link_clicks,actions",
  )
  url.searchParams.set("time_range", JSON.stringify({ since, until }))
  url.searchParams.set("limit", "100")
  url.searchParams.set("access_token", c.token)

  const rows: MetaRow[] = []
  let next: string | undefined = url.toString()
  while (next) {
    const body: InsightsResponse = await getJson<InsightsResponse>(next)
    rows.push(...parseInsights(body))
    next = body.paging?.next
  }
  return rows
}
