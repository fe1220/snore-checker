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
  { id: "body", text: "살이 많이 쪘거나 목이 굵은 편이에요" },
]

export function judge(answers: Record<string, Answer>): Level {
  const yes = QUESTIONS.filter((q) => answers[q.id] === "yes")
  if (yes.some((q) => q.strong)) return "strong"
  if (yes.length >= 3) return "moderate"
  return "weak"
}

export function isLevel(value: unknown): value is Level {
  return value === "strong" || value === "moderate" || value === "weak"
}

export const LEVEL_COPY: Record<Level, { title: string; body: string }> = {
  strong: {
    title: "검사받아 볼 만해요",
    body: "숨 멈춤이나 헐떡임, 운전 중 졸음은 수면무호흡에서 자주 보이는 신호예요.",
  },
  moderate: {
    title: "상담받아 볼 만해요",
    body: "수면무호흡과 함께 보이는 신호가 여러 개 있어요.",
  },
  weak: {
    title: "지금은 신호가 약해요",
    body: "그래도 걱정된다면 상담은 언제든 괜찮아요.",
  },
}

export const CLINIC_FINDER_URL = "https://www.resmed.kr/psg-finder"
