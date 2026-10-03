export type Answer = "yes" | "no" | "unknown"

export type Level = "strong" | "moderate" | "weak"

export type Question = {
  id: string
  text: string
  strong?: boolean
  short?: string // 판단 기준 문구에 쓰는 짧은 이름. 주요 신호에만 둔다
}

// STOP-Bang 구조를 참고해 배우자가 옆에서 볼 수 있는 것만 다시 썼다. 원문 문항은 쓰지 않는다.
export const QUESTIONS: Question[] = [
  { id: "snore-often", text: "일주일에 3번 이상 코를 골아요" },
  { id: "snore-loud", text: "코 고는 소리가 문을 닫아도 들릴 만큼 커요" },
  {
    id: "apnea",
    text: "자다가 숨이 멈추는 걸 본 적 있어요",
    strong: true,
    short: "숨 멈춤",
  },
  {
    id: "gasp",
    text: "자다가 컥 하거나 헐떡이며 숨을 몰아쉬어요",
    strong: true,
    short: "헐떡임",
  },
  {
    id: "drowsy-driving",
    text: "운전하다 조는 걸 본 적 있어요",
    strong: true,
    short: "운전 중 졸음",
  },
  { id: "sleepy", text: "앉아 있거나 TV를 보면 금방 졸아요" },
  { id: "pressure", text: "남편에게 고혈압이 있어요" },
  { id: "age", text: "남편이 50세 이상이에요" },
  { id: "body", text: "남편이 최근 몇 년 사이 체중이 늘었어요" },
]

// 판정 기준. 리포트의 "판단 기준" 문구도 이 값으로 만든다.
export const STRONG_QUESTIONS = QUESTIONS.filter((q) => q.strong)
export const MODERATE_MIN = 3

// 리포트 주소에는 답만 코드로 담고, 단계는 항상 여기서 다시 계산한다.
export function judge(signals: Question[]): Level {
  if (signals.some((q) => q.strong)) return "strong"
  if (signals.length >= MODERATE_MIN) return "moderate"
  return "weak"
}

// 문항마다 비트 하나를 쓰고 36진수로 줄인다. 건강 정보가 단어로 주소에 남지 않게 하려는 것이고 암호화는 아니다.
const MAX_CODE = 2 ** QUESTIONS.length - 1
const CODE_PATTERN = new RegExp(`^[0-9a-z]{1,${MAX_CODE.toString(36).length}}$`)

function encodeBits(questions: Question[]): string {
  const ids = new Set(questions.map((q) => q.id))
  return QUESTIONS.reduce(
    (acc, q, index) => (ids.has(q.id) ? acc | (1 << index) : acc),
    0,
  ).toString(36)
}

function decodeBits(code: string): number | null {
  if (!CODE_PATTERN.test(code)) return null
  const bits = parseInt(code, 36)
  return bits > MAX_CODE ? null : bits
}

const fromBits = (bits: number) =>
  QUESTIONS.filter((_, index) => bits & (1 << index))

export type ReportAnswers = { signals: Question[]; unknowns: Question[] }

// 응답은 주소 해시에만 담는다. 해시는 서버·분석 도구로 전송되지 않는다.
// v2: "네"와 "잘 모르겠어요"를 따로 담는다(#v2-<네>-<모름>).
// v1: "네"만 담던 이전 형식(#v1-<네>). 이미 퍼진 공유 링크라 계속 읽는다.
// 문항이 바뀌면 버전을 올려 옛 링크가 다른 문항으로 해석되지 않게 한다.
export function toReportHash({ signals, unknowns }: ReportAnswers): string {
  return `v2-${encodeBits(signals)}-${encodeBits(unknowns)}`
}

export function fromReportHash(hash: string): ReportAnswers | null {
  const parts = hash.replace(/^#/, "").split("-")
  if (parts[0] === "v1" && parts.length === 2) {
    const yes = decodeBits(parts[1])
    return yes === null ? null : { signals: fromBits(yes), unknowns: [] }
  }
  if (parts[0] === "v2" && parts.length === 3) {
    const yes = decodeBits(parts[1])
    const unknown = decodeBits(parts[2])
    if (yes === null || unknown === null || yes & unknown) return null
    return { signals: fromBits(yes), unknowns: fromBits(unknown) }
  }
  return null
}

// 단계 이름(chip)은 칩, 제목, 판단 기준에서 같은 말을 쓴다.
export const LEVEL_COPY: Record<
  Level,
  { chip: string; title: string; body: string }
> = {
  strong: {
    chip: "검사 권유",
    title: "수면무호흡증 신호가 보여요.\n수면검사를 권해요",
    body: "숨 멈춤이나 헐떡임, 운전 중 졸음은 수면무호흡증에서 자주 보이는 신호예요.",
  },
  moderate: {
    chip: "상담 권유",
    title: "수면무호흡증 신호가 여러 개예요.\n상담을 권해요",
    body: "수면무호흡증과 함께 보이는 신호가 여러 개 있어요.",
  },
  weak: {
    chip: "신호 약함",
    title: "지금은 걱정 신호가 적어요",
    body: "그래도 걱정되면 언제든 상담받아 보세요.",
  },
}

// 주요 신호는 자는 동안 봐야 알 수 있다. 그걸 모르는데 "신호가 적다"고 하면 잘못된 안심을 준다.
// 단계는 그대로 두고 제목·설명만 바꾼다.
export function isTooEarly(level: Level, unknowns: Question[]): boolean {
  return level === "weak" && unknowns.some((q) => q.strong)
}

export const TOO_EARLY_COPY = {
  title: "아직 판단하기 일러요",
  body: "숨 멈춤은 자는 동안 지켜봐야 알 수 있어요. 며칠 밤 옆에서 본 뒤 다시 해 보세요.",
}
