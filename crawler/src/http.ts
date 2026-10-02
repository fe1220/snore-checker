const USER_AGENT = "SleepCheckCrawler/1.0 (+https://github.com/fe1220/next-django-assignment)"
const REQUEST_INTERVAL_MS = 500

let lastRequestAt = 0

// 대상 사이트에 부담을 주지 않도록 요청 간격을 둔다.
export async function fetchText(url: string): Promise<string> {
  const wait = lastRequestAt + REQUEST_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
  lastRequestAt = Date.now()

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`)
  return res.text()
}
