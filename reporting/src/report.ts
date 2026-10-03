// 메타 광고 숫자와 GA4 퍼널을 소재별로 합치고 마크다운으로 만든다. 순수 함수만 둔다.

export type MetaRow = {
  key: string // 광고 이름 = utm_content (A, B, C, D1, D2)
  spend: number // 원
  impressions: number
  linkClicks: number
  landingViews: number
}

export type GaRow = {
  key: string // utm_content. 없으면 UNKNOWN
  checkStart: number
  checkComplete: number
  clinicClick: number // 병원 외부 링크
  clinicCall: number // 병원 전화
  share: number
}

export type Row = MetaRow & Omit<GaRow, "key">

export const UNKNOWN = "알 수 없음"
const ORDER = ["A", "B", "C", "D1", "D2"]

const EMPTY_META = { spend: 0, impressions: 0, linkClicks: 0, landingViews: 0 }
const EMPTY_GA = {
  checkStart: 0,
  checkComplete: 0,
  clinicClick: 0,
  clinicCall: 0,
  share: 0,
}

function order(key: string): number {
  if (key === UNKNOWN) return ORDER.length + 1
  const i = ORDER.indexOf(key)
  return i === -1 ? ORDER.length : i
}

export function mergeRows(meta: MetaRow[], ga: GaRow[]): Row[] {
  const rows = new Map<string, Row>()
  const get = (key: string) =>
    rows.get(key) ??
    rows.set(key, { key, ...EMPTY_META, ...EMPTY_GA }).get(key)!
  for (const m of meta) {
    const r = get(m.key)
    r.spend += m.spend
    r.impressions += m.impressions
    r.linkClicks += m.linkClicks
    r.landingViews += m.landingViews
  }
  for (const g of ga) {
    const r = get(g.key)
    r.checkStart += g.checkStart
    r.checkComplete += g.checkComplete
    r.clinicClick += g.clinicClick
    r.clinicCall += g.clinicCall
    r.share += g.share
  }
  return [...rows.values()].sort(
    (a, b) => order(a.key) - order(b.key) || a.key.localeCompare(b.key),
  )
}

export function total(rows: Row[]): Row {
  return rows.reduce<Row>(
    (t, r) => ({
      key: "합계",
      spend: t.spend + r.spend,
      impressions: t.impressions + r.impressions,
      linkClicks: t.linkClicks + r.linkClicks,
      landingViews: t.landingViews + r.landingViews,
      checkStart: t.checkStart + r.checkStart,
      checkComplete: t.checkComplete + r.checkComplete,
      clinicClick: t.clinicClick + r.clinicClick,
      clinicCall: t.clinicCall + r.clinicCall,
      share: t.share + r.share,
    }),
    { key: "합계", ...EMPTY_META, ...EMPTY_GA },
  )
}

const int = (n: number) => Math.round(n).toLocaleString("ko-KR")
const won = (n: number) => `${int(n)}원`
const pct = (a: number, b: number) =>
  b === 0 ? "-" : `${((a / b) * 100).toFixed(1)}%`
const per = (a: number, b: number) => (b === 0 ? "-" : won(a / b))

// 병원 연결 = 외부 링크 클릭 + 전화. 같은 목적(병원으로 넘어감)의 두 수단이라 합쳐서 본다.
export function metrics(r: Row) {
  const connect = r.clinicClick + r.clinicCall
  return {
    spend: won(r.spend),
    impressions: int(r.impressions),
    linkClicks: int(r.linkClicks),
    ctr: pct(r.linkClicks, r.impressions),
    cpc: per(r.spend, r.linkClicks),
    landingViews: int(r.landingViews),
    checkComplete: int(r.checkComplete),
    checkRate: pct(r.checkComplete, r.landingViews),
    connect: int(connect),
    connectRate: pct(connect, r.checkComplete),
    costPerConnect: per(r.spend, connect),
    clinicClick: int(r.clinicClick),
    clinicCall: int(r.clinicCall),
  }
}

const HEADER =
  "| 소재 | 비용 | 노출 | 링크 클릭 | 클릭률 | 클릭당 비용 | 랜딩 조회 | 체크 완료 | 체크 완료율 | 병원 연결 | 병원 연결률 | 병원 연결 1건당 비용 | 링크 · 전화 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|"

function line(r: Row): string {
  const m = metrics(r)
  const name = r.key === "합계" ? "**합계**" : r.key
  return `| ${name} | ${m.spend} | ${m.impressions} | ${m.linkClicks} | ${m.ctr} | ${m.cpc} | ${m.landingViews} | ${m.checkComplete} | ${m.checkRate} | ${m.connect} | ${m.connectRate} | ${m.costPerConnect} | ${m.clinicClick} · ${m.clinicCall} |`
}

export function renderReport(input: {
  since: string
  until: string
  generatedAt: string
  rows: Row[]
}): string {
  const t = total(input.rows)
  return `# 메타 광고 결과: ${input.until}까지

- 집계 기간: ${input.since} ~ ${input.until} (누적)
- 생성: ${input.generatedAt}, \`make meta-report\`
- 전략과 볼 숫자: [strategy.md](../strategy.md)

## 합계

${HEADER}
${line(t)}

- 공유 클릭 ${int(t.share)}건, 체크 시작 ${int(t.checkStart)}건

## 소재별

메타가 예산을 반응 좋은 소재에 몰아주므로 소재별 숫자는 참고만 한다.

${HEADER}
${input.rows.map(line).join("\n")}

## 주의

- 병원 연결은 병원 외부 링크 클릭과 전화 걸기를 합친 수다. 실제 방문 여부는 추적하지 않는다.
- 비용·노출·클릭·랜딩 조회는 메타, 체크·병원 연결은 GA4 숫자다. 둘은 광고 이름과 \`utm_content\`로 잇는다.
- GA4는 광고 차단·추적 거부로 일부 이벤트가 빠져 실제보다 적을 수 있다.
- 메타 숫자는 며칠 동안 보정될 수 있다. "${UNKNOWN}" 줄은 \`utm_content\`가 없거나 광고 이름과 맞지 않는 GA4 숫자다.
`
}

export function renderSummary(rows: Row[], reportPath: string): string {
  const m = metrics(total(rows))
  return `| 숫자 | 값 |
|---|---|
| 노출 · 링크 클릭 · 클릭률 | ${m.impressions} · ${m.linkClicks} · ${m.ctr} |
| 클릭당 비용 | ${m.cpc} |
| 체크 완료율 | ${m.checkRate} |
| 병원 연결률 (링크 · 전화) | ${m.connectRate} (${m.clinicClick} · ${m.clinicCall}) |
| 병원 연결 1건당 비용 | ${m.costPerConnect} |

최신 리포트: [${reportPath}](${reportPath})`
}

export const START = "<!-- meta-report:start -->"
export const END = "<!-- meta-report:end -->"

export function replaceBetweenMarkers(doc: string, content: string): string {
  const s = doc.indexOf(START)
  const e = doc.indexOf(END)
  if (s === -1 || e === -1 || e < s)
    throw new Error(`결과 표 표시(${START}, ${END})를 찾을 수 없어요`)
  return `${doc.slice(0, s + START.length)}\n${content}\n${doc.slice(e)}`
}
