import assert from "node:assert/strict"
import { afterEach, mock, test } from "node:test"

import { checkHomepage, dropDeadHomepages } from "./homepage.ts"
import type { Hospital } from "./merge.ts"

const NO_DELAY = [0, 0]

function respond(...results: (number | Error)[]) {
  let call = 0
  return mock.method(globalThis, "fetch", async () => {
    const result = results[Math.min(call++, results.length - 1)]
    if (result instanceof Error) throw result
    return new Response("", { status: result })
  })
}

function hospital(id: string, homepage: string | null): Hospital {
  return {
    id,
    name: `${id}의원`,
    region: "서울",
    address: "서울특별시 중구 을지로 1",
    phone: null,
    lat: 37.566,
    lng: 126.978,
    sourceUrl: null,
    homepage,
    listed: false,
    kind: "의원",
  }
}

afterEach(() => mock.restoreAll())

test("열리는 홈페이지는 null", async () => {
  respond(200)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("봇을 막는 403·406은 사람에게 열리므로 살아 있다고 본다", async () => {
  respond(403)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
  mock.restoreAll()
  respond(406)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("404는 두 번 더 확인한 뒤 죽었다고 본다", async () => {
  const fetch = respond(404)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "HTTP 404")
  assert.equal(fetch.mock.callCount(), 3)
})

test("DNS·인증서 오류는 cause의 메시지를 이유로 남긴다", async () => {
  respond(new TypeError("fetch failed", { cause: new Error("self-signed certificate") }))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "self-signed certificate")
})

function tlsError(message: string, code: string) {
  return new TypeError("fetch failed", { cause: Object.assign(new Error(message), { code }) })
}

test("서버가 중간 인증서를 빼먹은 사이트는 브라우저가 열므로 살아 있다고 본다", async () => {
  respond(tlsError("unable to verify the first certificate", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("만료·자체 서명 인증서는 브라우저도 경고하므로 죽었다고 본다", async () => {
  respond(tlsError("certificate has expired", "CERT_HAS_EXPIRED"))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "certificate has expired")
  mock.restoreAll()
  respond(tlsError("self-signed certificate", "DEPTH_ZERO_SELF_SIGNED_CERT"))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "self-signed certificate")
})

test("쿠키가 없어 리다이렉트가 끝나지 않는 사이트는 살아 있다고 본다", async () => {
  respond(new TypeError("fetch failed", { cause: new Error("redirect count exceeded") }))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("cause 메시지가 비어 있으면 코드나 이름을 이유로 남긴다", async () => {
  respond(new TypeError("fetch failed", { cause: Object.assign(new Error(""), { code: "ECONNREFUSED" }) }))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "ECONNREFUSED")
  mock.restoreAll()
  respond(new TypeError("fetch failed", { cause: new AggregateError([]) }))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "AggregateError")
})

test("시간 초과는 죽은 것으로 보고 메시지를 남긴다", async () => {
  respond(new DOMException("The operation was aborted due to timeout", "TimeoutError"))
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), "The operation was aborted due to timeout")
})

test("한 번 실패해도 다시 열리면 살아 있다", async () => {
  respond(503, 200)
  assert.equal(await checkHomepage("https://a.example", NO_DELAY), null)
})

test("죽은 홈페이지만 null로 바꾸고 이유를 남긴다", async () => {
  const dead = new Set(["https://dead.example"])
  const check = async (url: string) => (dead.has(url) ? "HTTP 404" : null)
  const { hospitals, dropped } = await dropDeadHomepages(
    [
      hospital("a", "https://dead.example"),
      hospital("b", "https://ok.example"),
      hospital("c", "https://ok2.example"),
      hospital("d", null),
    ],
    check,
  )
  assert.deepEqual(
    hospitals.map((h) => [h.id, h.homepage]),
    [
      ["a", null],
      ["b", "https://ok.example"],
      ["c", "https://ok2.example"],
      ["d", null],
    ],
  )
  assert.deepEqual(
    dropped.map((d) => [d.hospital.id, d.reason]),
    [["a", "HTTP 404"]],
  )
})

test("같은 주소는 한 번만 확인한다", async () => {
  let calls = 0
  const check = async () => {
    calls++
    return null
  }
  await dropDeadHomepages([hospital("a", "https://x.example"), hospital("b", "https://x.example")], check)
  assert.equal(calls, 1)
})

// 러너 네트워크가 끊기면 모든 홈페이지가 죽은 것처럼 보인다. 그때는 저장하지 않는다.
test("절반 넘게 죽었으면 네트워크 문제로 보고 실패한다", async () => {
  const check = async () => "fetch failed"
  await assert.rejects(
    dropDeadHomepages([hospital("a", "https://a.example"), hospital("b", "https://b.example")], check),
    /홈페이지/,
  )
})
