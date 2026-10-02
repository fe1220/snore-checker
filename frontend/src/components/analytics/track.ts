declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

type Event =
  | { name: "check_start" }
  | { name: "check_complete"; level: string }
  | { name: "share_click" }
  | {
      name: "clinic_click"
      hospital_id: string
      region: string
      target: "resmed" | "homepage" | "map"
    }
  | { name: "clinic_call"; hospital_id: string; region: string }
  | { name: "clinic_nearby"; result: "granted" | "denied" | "failed" }

// 메타에는 건강 정보(결과 단계)를 보내지 않는다. 체크 완료와 병원 이동만 전환으로 보낸다.
const PIXEL_EVENTS: Partial<Record<Event["name"], [string, string]>> = {
  check_complete: ["track", "Lead"],
  clinic_click: ["trackCustom", "ClinicClick"],
}

// 메타 픽셀은 주소를 해시까지 그대로 보낸다(GA는 해시를 뺀다). 리포트 해시에는 응답이 있으니
// 해시가 있는 동안에는 픽셀을 부르지 않는다.
export function pixel(...args: unknown[]) {
  if (window.location.hash) return
  window.fbq?.(...args)
}

export function track(event: Event) {
  const { name, ...params } = event
  window.gtag?.("event", name, params)
  const pixelEvent = PIXEL_EVENTS[name]
  if (pixelEvent) pixel(...pixelEvent)
}
