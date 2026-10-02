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

const SELF_BENEFITS = [
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

type Bar = { label: string; value: number; display: string }

// 두 값만 비교하는 막대라 숫자를 막대 끝에 바로 적고 범례는 두지 않는다.
function CompareBars({
  bars,
  max,
  tone,
  summary,
}: {
  bars: [Bar, Bar]
  max: number
  tone: "warning" | "primary"
  summary: string
}) {
  return (
    <div className="flex flex-col gap-2" role="img" aria-label={summary}>
      {bars.map((bar, index) => {
        const emphasis = index === 1
        return (
          <div
            key={bar.label}
            className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-sm"
          >
            <span className={cn(!emphasis && "text-muted-foreground")}>
              {bar.label}
            </span>
            <div
              className={cn(
                "h-5 rounded-r-sm",
                emphasis
                  ? tone === "warning"
                    ? "bg-warning"
                    : "bg-primary"
                  : "bg-muted-foreground/30",
              )}
              style={{ width: `${(bar.value / max) * 100}%` }}
            />
            <span
              className={cn(
                "text-right font-semibold tabular-nums",
                !emphasis && "font-normal text-muted-foreground",
              )}
            >
              {bar.display}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Source({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm">
          <Check className="size-4 shrink-0 text-primary" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
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
        <h1 className="mt-3 text-2xl leading-snug font-bold whitespace-pre-line">
          {copy.title}
        </h1>
        <p className="text-sm text-muted-foreground">{copy.body}</p>
        <p className="mt-2 rounded-lg bg-muted p-3 text-sm">
          <span className="font-semibold">수면무호흡증</span>은 자는 동안 숨이
          반복해서 멈추거나 얕아지는 병이에요. 코골이와 함께 나타나는 경우가
          많고, 본인은 자는 중이라 잘 몰라요.
        </p>
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
        <p className="text-base font-semibold">교통사고 위험이 2.4배 높아요</p>
        <CompareBars
          tone="warning"
          max={2.4}
          summary="교통사고 위험: 일반인 1, 치료하지 않은 수면무호흡증 2.4배"
          bars={[
            { label: "일반인", value: 1, display: "1" },
            { label: "미치료", value: 2.4, display: "2.4배" },
          ]}
        />
        <Source>메타분석 (Tregear 2009)</Source>
        <p className="mt-3 text-base font-semibold">
          심한 경우 심혈관 질환 위험이 2.9배 높았어요
        </p>
        <CompareBars
          tone="warning"
          max={2.9}
          summary="심혈관 질환 위험: 일반인 1, 치료하지 않은 중증 수면무호흡증 2.9배"
          bars={[
            { label: "일반인", value: 1, display: "1" },
            { label: "중증 미치료", value: 2.9, display: "2.9배" },
          ]}
        />
        <Source>남성 대상 관찰 연구 (Marin 2005)</Source>
      </Section>

      <Section title="치료하면 본인도">
        <CheckList items={SELF_BENEFITS} />
      </Section>

      <Section title="치료하면 옆 사람도">
        <p className="text-base font-semibold">더 깊이 자요</p>
        <CompareBars
          tone="primary"
          max={100}
          summary="배우자 수면 효율: 치료 전 74%, 치료 후 87%"
          bars={[
            { label: "치료 전", value: 74, display: "74%" },
            { label: "치료 후", value: 87, display: "87%" },
          ]}
        />
        <Source>
          배우자 수면 효율 · 부부 10쌍 소규모 연구 (Beninati 1999)
        </Source>
        <CheckList items={["코골이 소리 없이 잘 수 있어요"]} />
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
          출처: 교통사고 위험 Tregear 2009(JCSM) 메타분석, 심혈관 Marin
          2005(Lancet), 배우자 수면 효율 Beninati 1999(Mayo Clin Proc), 낮 졸림
          Cochrane 2006, 혈압 Bratton 2015(JAMA), 기분 Zheng
          2019(eClinicalMedicine), 증상 기준 Kapur 2017(JCSM)
        </p>
      </footer>
    </article>
  )
}
