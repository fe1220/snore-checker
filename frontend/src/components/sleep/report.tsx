import { AlertCircle, Check } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  LEVEL_COPY,
  QUESTIONS,
  type Level,
  type Question,
} from "@/lib/sleep-check"
import { cn } from "cn"

// 약한 단계부터 순서대로 보여준다. 색은 판정 띠와 칩이 같이 쓴다.
const LEVELS: { level: Level; band: string; chip: string }[] = [
  {
    level: "weak",
    band: "border-border",
    chip: "bg-secondary text-secondary-foreground",
  },
  {
    level: "moderate",
    band: "border-primary",
    chip: "bg-primary text-primary-foreground",
  },
  {
    level: "strong",
    band: "border-warning",
    chip: "bg-warning text-background",
  },
]

const SELF_BENEFITS = [
  "낮에 덜 졸리고 일할 때 집중이 잘 돼요",
  "코골이가 멎어요",
  "혈압이 높은 분은 혈압이 조금 내려갈 수 있어요",
]

const STEPS = [
  { title: "수면클리닉 외래 상담" },
  { title: "하룻밤 수면다원검사", note: "금요일·토요일 밤에 하는 곳도 있어요" },
  { title: "결과 듣고 치료 방법 정하기" },
]

function ReportCard({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <Card className="text-base">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          <h2>{title}</h2>
        </CardTitle>
        {note && <CardDescription>{note}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
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
        <li key={item} className="flex items-start gap-2">
          <Check className="mt-1 size-4 shrink-0 text-success" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  )
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-muted-foreground">{children}</h3>
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
  const band = LEVELS.find((item) => item.level === level)?.band

  return (
    <article className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground tabular-nums">
          수면 체크 리포트 · {date} · 배우자 관찰 {QUESTIONS.length}문항
        </p>
        <div className={cn("flex flex-col gap-3 border-l-4 pl-4", band)}>
          {shared && level !== "weak" && (
            <p className="text-sm font-semibold text-primary">
              당신의 낮 졸림과 피로도 이것 때문일 수 있어요
            </p>
          )}
          <ol
            className="flex flex-wrap gap-1"
            aria-label={`3단계 중 ${copy.chip}`}
          >
            {LEVELS.map((item) => (
              <li key={item.level}>
                <Badge
                  variant="outline"
                  className={cn(
                    item.level === level
                      ? cn("border-transparent font-semibold", item.chip)
                      : "text-muted-foreground",
                  )}
                >
                  {LEVEL_COPY[item.level].chip}
                </Badge>
              </li>
            ))}
          </ol>
          <h1 className="text-2xl leading-snug font-bold whitespace-pre-line">
            {copy.title}
          </h1>
          <p className="text-base text-muted-foreground">{copy.body}</p>
          <p className="text-sm text-muted-foreground">
            수면무호흡증은 자는 동안 숨이 반복해서 멈추거나 얕아지는 병이에요.
            코골이와 함께 나타나는 경우가 많고, 본인은 자는 중이라 잘 몰라요.
          </p>
        </div>
      </header>

      <ReportCard
        title="옆에서 본 신호"
        note={`${QUESTIONS.length}개 중 ${signals.length}개`}
      >
        {signals.length === 0 ? (
          <p className="text-muted-foreground">“네”라고 답한 신호가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {signals.map((signal) => (
              <li key={signal.id} className="flex items-start gap-2">
                {signal.strong ? (
                  <AlertCircle
                    className="mt-1 size-4 shrink-0 text-warning"
                    aria-hidden
                  />
                ) : (
                  <Check
                    className="mt-1 size-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span className="flex-1">{signal.text}</span>
                {signal.strong && (
                  <span className="mt-1 shrink-0 text-xs text-warning">
                    주요 신호
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </ReportCard>

      <ReportCard title="치료하지 않으면">
        <p className="font-semibold">교통사고 위험이 2.4배 높아요</p>
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
        <p className="mt-3 font-semibold">
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
      </ReportCard>

      <ReportCard title="치료하면">
        <GroupLabel>본인</GroupLabel>
        <CheckList items={SELF_BENEFITS} />
        <Separator className="my-1" />
        <GroupLabel>함께 자는 사람</GroupLabel>
        <p className="font-semibold">더 깊이 자요</p>
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
      </ReportCard>

      <ReportCard title="검사는 이렇게 받아요" note="본인부담 약 12~14만 원">
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs tabular-nums">
                {index + 1}
              </span>
              <span className="flex flex-col">
                {step.title}
                {step.note && (
                  <span className="text-sm text-muted-foreground">
                    {step.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </ReportCard>

      <footer className="flex flex-col gap-2">
        <Accordion>
          <AccordionItem value="criteria">
            <AccordionTrigger className="items-center py-3 text-base">
              판단 기준
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              <ul className="flex list-disc flex-col gap-1 pl-4">
                <li>
                  병원에서 쓰는 수면무호흡 선별 기준(STOP-Bang)의 항목을
                  배우자가 옆에서 볼 수 있는 것으로 바꿔 만들었어요.
                </li>
                <li>
                  숨 멈춤과 헐떡임은 미국수면학회 진료 지침이 수면무호흡을
                  의심하는 주요 증상으로 꼽아요. 숨 멈춤, 헐떡임, 운전 중 졸음
                  중 하나라도 있으면 “{LEVEL_COPY.strong.chip}”예요.
                </li>
                <li>
                  그 외 신호가 3개 이상이면 “{LEVEL_COPY.moderate.chip}”, 그보다
                  적으면 “{LEVEL_COPY.weak.chip}”이에요.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sources">
            <AccordionTrigger className="items-center py-3 text-base">
              출처
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              교통사고 위험 Tregear 2009(JCSM) 메타분석, 심혈관 Marin
              2005(Lancet), 배우자 수면 효율 Beninati 1999(Mayo Clin Proc), 낮
              졸림 Cochrane 2006, 혈압 Bratton 2015(JAMA), 증상 기준 Kapur
              2017(JCSM)
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <p className="text-xs text-muted-foreground">
          이 리포트는 진단이 아니에요. 정확한 판단은 진료로 받아요.
        </p>
      </footer>
    </article>
  )
}
