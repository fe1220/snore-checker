import { AlertCircle, Check } from "lucide-react"
import { LEVEL_COPY, type Level, type Question } from "@/lib/sleep-check"
import { cn } from "cn"

const LEVELS: { level: Level; label: string; bar: string; text: string }[] = [
  { level: "weak", label: "약함", bar: "bg-success", text: "text-success" },
  {
    level: "moderate",
    label: "상담 권유",
    bar: "bg-primary",
    text: "text-primary",
  },
  {
    level: "strong",
    label: "검사 권유",
    bar: "bg-warning",
    text: "text-warning",
  },
]

const RISKS = [
  { value: "2.4", unit: "배", label: "교통사고 위험" },
  { value: "2.9", unit: "배", label: "심혈관 질환 위험 (중증, 관찰 연구)" },
]

const BENEFIT_STATS = [
  { value: "약 70", unit: "%", label: "줄어드는 교통사고 위험" },
  { value: "+62", unit: "분", label: "옆 사람이 더 자는 시간 (소규모 연구)" },
]

const BENEFITS = [
  "낮에 덜 졸리고 일할 때 집중이 잘 돼요",
  "코골이가 멎어요",
  "혈압이 높은 분은 혈압이 조금 내려갈 수 있어요",
  "기분과 우울감이 다소 나아질 수 있어요",
  "밤에 화장실 가는 횟수가 줄었다는 보고가 있어요",
]

const STEPS = [
  { title: "수면클리닉 외래 상담" },
  { title: "하룻밤 수면다원검사", note: "금요일·토요일 밤에 하는 곳도 있어요" },
  { title: "결과 듣고 치료 방법 정하기" },
]

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 border-t p-4">
      <h2 className="text-sm text-muted-foreground">{title}</h2>
      {children}
    </section>
  )
}

function Stat({
  value,
  unit,
  label,
  tone,
}: {
  value: string
  unit: string
  label: string
  tone: "muted" | "primary"
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg p-3",
        tone === "muted" ? "bg-muted" : "bg-primary/10 text-primary",
      )}
    >
      <p className="text-2xl font-bold tabular-nums">
        {value}
        <span className="text-sm">{unit}</span>
      </p>
      <p
        className={cn(
          "text-xs",
          tone === "muted" ? "text-muted-foreground" : "text-primary",
        )}
      >
        {label}
      </p>
    </div>
  )
}

export function Report({
  level,
  signals,
  date,
  shared,
}: {
  level: Level
  signals: Question[]
  date: string
  shared: boolean
}) {
  const copy = LEVEL_COPY[level]

  return (
    <article className="overflow-hidden rounded-xl border bg-card">
      <header className="flex flex-col gap-1 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>수면 체크 리포트</span>
          <span className="tabular-nums">{date} · 배우자 관찰</span>
        </div>
        {shared && level !== "weak" && (
          <p className="mt-3 text-sm font-semibold text-primary">
            당신의 낮 졸림과 피로도 이것 때문일 수 있어요
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">수면무호흡 신호</p>
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        <div className="mt-3 grid grid-cols-3 gap-1" aria-hidden>
          {LEVELS.map((item) => (
            <div
              key={item.level}
              className={cn(
                "h-1.5 rounded-full",
                item.level === level ? item.bar : "bg-muted",
              )}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 text-xs text-muted-foreground">
          {LEVELS.map((item, index) => (
            <span
              key={item.level}
              className={cn(
                index === 1 && "text-center",
                index === 2 && "text-right",
                item.level === level && cn("font-semibold", item.text),
              )}
            >
              {item.label}
            </span>
          ))}
        </div>
      </header>

      <Section title={`옆에서 본 신호 ${signals.length}개`}>
        {signals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            “네”라고 답한 신호가 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {signals.map((signal) => (
              <li key={signal.id} className="flex items-center gap-2 text-sm">
                {signal.strong ? (
                  <AlertCircle className="size-4 text-warning" aria-hidden />
                ) : (
                  <Check className="size-4 text-muted-foreground" aria-hidden />
                )}
                {signal.text}
                {signal.strong && (
                  <span className="ml-auto text-xs text-warning">
                    주요 신호
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="치료하지 않으면">
        <div className="grid grid-cols-2 gap-2">
          {RISKS.map((risk) => (
            <Stat key={risk.label} {...risk} tone="muted" />
          ))}
        </div>
      </Section>

      <Section title="치료하면 달라지는 것">
        <div className="grid grid-cols-2 gap-2">
          {BENEFIT_STATS.map((stat) => (
            <Stat key={stat.label} {...stat} tone="primary" />
          ))}
        </div>
        <ul className="flex flex-col gap-2">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-center gap-2 text-sm">
              <Check className="size-4 text-primary" aria-hidden />
              {benefit}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="검사는 이렇게 받아요 · 본인부담 약 12~14만 원">
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">
                {index + 1}
              </span>
              <span className="flex flex-col">
                {step.title}
                {step.note && (
                  <span className="text-xs text-muted-foreground">
                    {step.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="이 체크의 기준">
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-muted-foreground">
          <li>
            병원에서 쓰는 수면무호흡 선별 기준(STOP-Bang)의 항목을 배우자가
            옆에서 볼 수 있는 것으로 바꿔 만들었어요.
          </li>
          <li>
            숨 멈춤과 헐떡임은 미국수면학회 진료 지침이 수면무호흡을 의심하는
            주요 증상으로 꼽아요. 이 체크에서는 숨 멈춤, 헐떡임, 운전 중 졸음 중
            하나라도 있으면 검사를 권해요.
          </li>
          <li>그 외 신호가 3개 이상이면 상담을 권해요.</li>
        </ul>
      </Section>

      <footer className="border-t p-4 text-xs text-muted-foreground">
        <p>이 리포트는 진단이 아니에요. 정확한 판단은 진료로 받아요.</p>
        <p className="mt-2">
          출처: 교통사고 위험 Tregear 2009(JCSM)·2010(Sleep) 메타분석, 심혈관
          Marin 2005(Lancet), 옆 사람 수면 Beninati 1999(Mayo Clin Proc), 낮
          졸림 Cochrane 2006, 혈압 Bratton 2015(JAMA), 기분 Zheng
          2019(eClinicalMedicine), 증상 기준 Kapur 2017(JCSM)
        </p>
      </footer>
    </article>
  )
}
