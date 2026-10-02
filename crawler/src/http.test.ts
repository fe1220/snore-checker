import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"

import { fetchText } from "./http.ts"

const NO_DELAY = [0, 0]

function respond(...results: (number | Error)[]) {
  let call = 0
  return mock.method(globalThis, "fetch", async () => {
    const result = results[Math.min(call++, results.length - 1)]
    if (result instanceof Error) throw result
    return new Response(result === 200 ? "ok" : "", { status: result })
  })
}

afterEach(() => mock.restoreAll())

test("요청마다 타임아웃 신호를 건다", async () => {
  const fetch = respond(200)
  assert.equal(await fetchText("https://example.com", NO_DELAY), "ok")
  const init = fetch.mock.calls[0].arguments[1] as RequestInit
  assert.ok(init.signal instanceof AbortSignal)
})

test("5xx와 네트워크 오류는 두 번까지 다시 시도한다", async () => {
  const fetch = respond(503, new TypeError("fetch failed"), 200)
  assert.equal(await fetchText("https://example.com", NO_DELAY), "ok")
  assert.equal(fetch.mock.callCount(), 3)
})

test("세 번 모두 실패하면 마지막 오류로 실패한다", async () => {
  const fetch = respond(500, 502, 503)
  await assert.rejects(fetchText("https://example.com", NO_DELAY), /503/)
  assert.equal(fetch.mock.callCount(), 3)
})

test("4xx는 다시 시도하지 않는다", async () => {
  const fetch = respond(404, 200)
  await assert.rejects(fetchText("https://example.com", NO_DELAY), /404/)
  assert.equal(fetch.mock.callCount(), 1)
})
