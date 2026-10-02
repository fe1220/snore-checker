const USER_AGENT = "SleepCheckCrawler/1.0 (+https://github.com/fe1220/snore-checker)"
const REQUEST_INTERVAL_MS = 500
// 응답이 멈추면 워크플로우 제한 시간까지 기다리게 되어 요청마다 끊는다.
const TIMEOUT_MS = 30_000
// 일시적인 5xx·네트워크 오류 한 번에 그 주 갱신이 통째로 실패하지 않도록 두 번 더 시도한다.
const RETRY_DELAYS_MS = [1000, 2000]

let lastRequestAt = 0

class HttpError extends Error {
  readonly status: number
  constructor(status: number, statusText: string, url: string) {
    super(`${status} ${statusText}: ${url}`)
    this.status = status
  }
}

// 4xx는 다시 보내도 같은 결과라 바로 실패한다.
function retryable(error: unknown): boolean {
  return !(error instanceof HttpError) || error.status >= 500
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 대상 사이트에 부담을 주지 않도록 요청 간격을 둔다.
async function fetchOnce(url: string): Promise<string> {
  const wait = lastRequestAt + REQUEST_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait)
  lastRequestAt = Date.now()

  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new HttpError(res.status, res.statusText, url)
  return res.text()
}

export async function fetchText(url: string, retryDelaysMs: readonly number[] = RETRY_DELAYS_MS): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fetchOnce(url)
    } catch (error) {
      if (attempt >= retryDelaysMs.length || !retryable(error)) throw error
      console.warn(`다시 시도 ${attempt + 1}/${retryDelaysMs.length}: ${error instanceof Error ? error.message : error}`)
      await sleep(retryDelaysMs[attempt])
    }
  }
}
