import type { Hospital } from "./merge.ts"

// 일부 병원 사이트는 크롤러 UA를 막는다. 사용자가 실제로 여는 것과 같게 휴대폰 브라우저 UA로 확인한다.
const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"
const TIMEOUT_MS = 15_000
// 일시 장애로 멀쩡한 링크를 지우지 않도록 두 번 더 확인한다.
const RETRY_DELAYS_MS = [1000, 3000]
const CONCURRENCY = 8

// 없는 페이지와 서버 오류만 죽은 것으로 본다. 403·406처럼 봇을 막는 응답은 사람에게는 열린다.
function deadStatus(status: number): boolean {
  return status === 404 || status === 410 || status >= 500
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function checkOnce(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(TIMEOUT_MS) })
    await res.body?.cancel()
    return deadStatus(res.status) ? `HTTP ${res.status}` : null
  } catch (error) {
    // DNS 실패, 연결 거부, 인증서 오류는 fetch가 TypeError로 감싸고 원인을 cause에 둔다.
    const cause = error instanceof Error ? error.cause : undefined
    if (isOpenableInBrowser(cause)) return null
    return failureReason(error, cause)
  }
}

// 브라우저는 열리지만 fetch는 못 여는 경우다. 확인할 수 없으니 지우지 않는다.
// - 서버가 중간 인증서를 빼먹은 경우: 브라우저는 AIA로 받아오지만 Node는 못 한다. 만료·자체 서명·도메인 불일치는 브라우저도 경고하므로 죽은 것으로 본다.
// - 리다이렉트 한도 초과: fetch에는 쿠키 저장소가 없어 쿠키를 심어야 끝나는 사이트에서 반복된다. undici는 코드 없이 메시지만 준다.
function isOpenableInBrowser(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false
  return (cause as NodeJS.ErrnoException).code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" || cause.message === "redirect count exceeded"
}

function failureReason(error: unknown, cause: unknown): string {
  if (cause instanceof Error) {
    const code = (cause as NodeJS.ErrnoException).code
    const reason = cause.message || code || cause.name
    if (reason) return reason
  }
  if (error instanceof Error) return error.message || error.name
  return String(error)
}

export async function checkHomepage(url: string, retryDelaysMs: readonly number[] = RETRY_DELAYS_MS): Promise<string | null> {
  let reason = await checkOnce(url)
  for (const delay of retryDelaysMs) {
    if (reason === null) return null
    await sleep(delay)
    reason = await checkOnce(url)
  }
  return reason
}

export type DroppedHomepage = { hospital: Hospital; reason: string }

// 열리지 않는 홈페이지를 지운다. 화면은 홈페이지가 없으면 네이버 지도 검색으로 보낸다(frontend/src/lib/hospitals.ts clinicLink).
export async function dropDeadHomepages(
  hospitals: Hospital[],
  check: (url: string) => Promise<string | null> = checkHomepage,
  concurrency = CONCURRENCY,
): Promise<{ hospitals: Hospital[]; dropped: DroppedHomepage[] }> {
  const urls = [...new Set(hospitals.flatMap((h) => (h.homepage ? [h.homepage] : [])))]
  const dead = new Map<string, string>()
  let next = 0
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++]
      const reason = await check(url)
      if (reason !== null) dead.set(url, reason)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker))

  if (dead.size > urls.length / 2) {
    throw new Error(`홈페이지 ${urls.length}곳 중 ${dead.size}곳이 열리지 않습니다. 네트워크 문제일 수 있어 저장하지 않습니다`)
  }

  const dropped: DroppedHomepage[] = []
  const result = hospitals.map((h) => {
    const reason = h.homepage ? dead.get(h.homepage) : undefined
    if (reason === undefined) return h
    dropped.push({ hospital: h, reason })
    return { ...h, homepage: null }
  })
  return { hospitals: result, dropped }
}
