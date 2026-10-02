export type Answer = "yes" | "no" | "unknown"

export type Level = "strong" | "moderate" | "weak"

export type Question = {
  id: string
  text: string
  strong?: boolean
}

// STOP-Bang 구조를 참고해 배우자가 옆에서 볼 수 있는 것만 다시 썼다. 원문 문항은 쓰지 않는다.
export const QUESTIONS: Question[] = [
  { id: "snore-often", text: "일주일에 3번 이상 코를 골아요" },
  { id: "snore-loud", text: "코 고는 소리가 문을 닫아도 들릴 만큼 커요" },
  { id: "apnea", text: "자다가 숨이 멈추는 걸 본 적 있어요", strong: true },
  {
    id: "gasp",
    text: "자다가 컥 하거나 헐떡이며 숨을 몰아쉬어요",
    strong: true,
  },
  { id: "drowsy-driving", text: "운전하다 조는 걸 본 적 있어요", strong: true },
  { id: "sleepy", text: "앉아 있거나 TV를 보면 금방 졸아요" },
  { id: "pressure", text: "고혈압이 있어요" },
  { id: "age", text: "50세 이상이에요" },
  { id: "body", text: "최근 몇 년 사이 체중이 늘었어요" },
]

// 리포트 주소에는 "네"라고 답한 문항만 코드로 담고, 단계는 항상 여기서 다시 계산한다.
export function judge(signals: Question[]): Level {
  if (signals.some((q) => q.strong)) return "strong"
  if (signals.length >= 3) return "moderate"
  return "weak"
}

// 문항마다 비트 하나를 쓰고 36진수로 줄인다. 건강 정보가 단어로 주소에 남지 않게 하려는 것이고 암호화는 아니다.
const MAX_CODE = 2 ** QUESTIONS.length - 1

function encodeSignals(signals: Question[]): string {
  const bits = QUESTIONS.reduce(
    (acc, q, index) => (signals.includes(q) ? acc | (1 << index) : acc),
    0,
  )
  return bits.toString(36)
}

function decodeSignals(code: string): Question[] | null {
  if (!/^[0-9a-z]{1,2}$/.test(code)) return null
  const bits = parseInt(code, 36)
  if (bits > MAX_CODE) return null
  return QUESTIONS.filter((_, index) => bits & (1 << index))
}

// 응답은 주소 해시(#v1-dh)에만 담는다. 해시는 서버·분석 도구로 전송되지 않는다.
// 문항이 바뀌면 버전을 올려 옛 링크가 다른 문항으로 해석되지 않게 한다.
const HASH_VERSION = "v1"

export function toReportHash(signals: Question[]): string {
  return `${HASH_VERSION}-${encodeSignals(signals)}`
}

export function fromReportHash(hash: string): Question[] | null {
  const match = hash.replace(/^#/, "").match(/^([a-z0-9]+)-(.*)$/)
  if (!match || match[1] !== HASH_VERSION) return null
  return decodeSignals(match[2])
}

export const LEVEL_COPY: Record<Level, { title: string; body: string }> = {
  strong: {
    title: "수면무호흡증\n검사를 권해요",
    body: "숨 멈춤이나 헐떡임, 운전 중 졸음은 수면무호흡증에서 자주 보이는 신호예요.",
  },
  moderate: {
    title: "수면무호흡증\n상담을 권해요",
    body: "수면무호흡증과 함께 보이는 신호가 여러 개 있어요.",
  },
  weak: {
    title: "수면무호흡증\n신호가 약해요",
    body: "그래도 걱정된다면 상담은 언제든 괜찮아요.",
  },
}

export const CLINIC_FINDER_URL = "https://www.resmed.kr/psg-finder"
