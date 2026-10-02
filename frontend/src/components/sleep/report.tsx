import { AlertCircle, Check } from "lucide-react"
import Link from "next/link"
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

// 잠이 닿아 있는 영역별로 묶는다. 치료 효과가 확인된 것만 넣는다(출처 아코디언 참고).
const SELF_BENEFITS: { area: string; text: string }[] = [
  { area: "잠", text: "깨지 않는 통잠" },
  { area: "머리", text: "덜 졸리고 집중이 잘 돼요" },
  { area: "기분", text: "짜증이 줄어요" },
  { area: "운전", text: "사고 위험이 약 70% 줄어요" },
  { area: "관계", text: "다툼이 줄어요" },
  { area: "혈압", text: "높았다면 조금 내려가요" },
  { area: "화장실", text: "자다가 덜 가요" },
  { area: "성기능", text: "나아질 수 있어요" },
]

const STEPS = [
  { title: "수면클리닉에서 진료 상담받기" },
  {
    title: "병원에서 하룻밤 자면서 검사받기(수면다원검사)",
    note: "금요일·토요일 밤에 하는 곳도 있어요",
  },
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
    <Card className="text-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          <h2>{title}</h2>
        </CardTitle>
        {note && (
          <CardDescription className="text-base">{note}</CardDescription>
        )}
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
            className="grid grid-cols-[minmax(4.5rem,auto)_1fr_auto] items-center gap-2 text-base"
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
  return <p className="text-base text-muted-foreground">{children}</p>
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
        <p className="text-base text-muted-foreground tabular-nums">
          수면 체크 리포트 · {date} · 옆에서 본 {QUESTIONS.length}가지 질문
        </p>
        <div className={cn("flex flex-col gap-3 border-l-4 pl-4", band)}>
          {shared && level !== "weak" && (
            <p className="text-lg font-semibold text-primary">
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
                    "h-auto px-3 py-1 text-base",
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
          <p className="text-lg text-muted-foreground">{copy.body}</p>
          <p className="text-lg text-muted-foreground">
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
                    className="mt-1 size-5 shrink-0 text-warning"
                    aria-hidden
                  />
                ) : (
                  <Check
                    className="mt-1 size-5 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                )}
                <span className="flex-1">{signal.text}</span>
                {signal.strong && (
                  <span className="shrink-0 text-base font-semibold text-warning">
                    주요 신호
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </ReportCard>

      {level !== "weak" && (
        <ReportCard title="자는 동안 이런 일이 생겨요">
          <p className="font-semibold">숨이 멈출 때마다 뇌가 잠깐 깨요</p>
          <p className="text-lg font-semibold text-primary tabular-nums">
            심한 편이면 한 시간에 15번 넘게 깨요. 하룻밤이면 100번이 넘어요
          </p>
          <p className="text-muted-foreground">
            본인은 기억하지 못해요. 하지만 깊은 잠에 들지 못해서 8시간을 자도
            피곤해요.
          </p>
          <Source>중등도 수면무호흡증 진단 기준 (Kapur 2017)</Source>
        </ReportCard>
      )}

      <ReportCard title="치료하지 않으면">
        <p className="font-semibold">교통사고 위험이 2.4배 높아요</p>
        <CompareBars
          tone="warning"
          max={2.4}
          summary="교통사고 위험: 일반인 1, 치료하지 않은 수면무호흡증 2.4배"
          bars={[
            { label: "일반인", value: 1, display: "1" },
            { label: "치료 안 함", value: 2.4, display: "2.4배" },
          ]}
        />
        <Source>메타분석 (Tregear 2009)</Source>
        <p className="mt-3 font-semibold">
          심한 경우 심장·혈관 병(심혈관 질환) 위험이 2.9배 높았어요
        </p>
        <CompareBars
          tone="warning"
          max={2.9}
          summary="심장·혈관 병 위험: 일반인 1, 심한데 치료하지 않으면 2.9배"
          bars={[
            { label: "일반인", value: 1, display: "1" },
            { label: "심한데 치료 안 함", value: 2.9, display: "2.9배" },
          ]}
        />
        <Source>남성 대상 관찰 연구 (Marin 2005)</Source>
      </ReportCard>

      <ReportCard title="치료하면">
        <p className="text-lg font-semibold text-primary">
          잠이 달라지면 삶이 달라져요
        </p>
        <dl className="grid grid-cols-[minmax(3.5rem,auto)_1fr] gap-x-3 gap-y-2">
          {SELF_BENEFITS.map((group) => (
            <div key={group.area} className="col-span-2 grid grid-cols-subgrid">
              <dt className="font-semibold text-muted-foreground">
                {group.area}
              </dt>
              <dd>{group.text}</dd>
            </div>
          ))}
        </dl>
        <Source>사고 위험 · 치료 전후 비교 연구 (Tregear 2010)</Source>
        <Separator className="my-1" />
        <p className="font-semibold">함께 자는 사람도 더 깊이 자요</p>
        <p className="text-muted-foreground">
          코골이 소리에 깨지 않고 잘 수 있어요.
        </p>
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
      </ReportCard>

      <ReportCard
        title="검사는 이렇게 받아요"
        note="내가 내는 돈은 약 12~14만 원이에요"
      >
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-base tabular-nums">
                {index + 1}
              </span>
              <span className="flex flex-col">
                {step.title}
                {step.note && (
                  <span className="text-base text-muted-foreground">
                    {step.note}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
      </ReportCard>

      <footer className="flex flex-col gap-2">
        <Accordion className="gap-2">
          <AccordionItem value="criteria">
            <AccordionTrigger className="min-h-12 items-center py-3 text-lg">
              판단 기준
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground">
              <ul className="flex list-disc flex-col gap-1 pl-4">
                <li>
                  병원에서 수면무호흡증을 가려낼 때 쓰는 질문(STOP-Bang)을
                  바탕으로 만들었어요. 옆에서 볼 수 있는 것만 묻도록 바꿨어요.
                </li>
                <li>
                  숨 멈춤과 헐떡임은 미국수면학회가 꼽는 주요 증상이에요. 숨
                  멈춤, 헐떡임, 운전 중 졸음 중 하나라도 있으면 “
                  {LEVEL_COPY.strong.chip}”예요.
                </li>
                <li>
                  그 외 신호가 3개 이상이면 “{LEVEL_COPY.moderate.chip}”, 그보다
                  적으면 “{LEVEL_COPY.weak.chip}”이에요.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sources">
            <AccordionTrigger className="min-h-12 items-center py-3 text-lg">
              출처
            </AccordionTrigger>
            <AccordionContent className="text-base text-muted-foreground">
              교통사고 위험 Tregear 2009(JCSM) 메타분석, 심혈관 Marin
              2005(Lancet), 배우자 수면 효율 Beninati 1999(Mayo Clin Proc), 낮
              졸림 Cochrane 2006, 혈압 Bratton 2015(JAMA), 치료 후 사고 위험
              Tregear 2010(Sleep, 치료 전후 비교 연구 9개), 기분 Povitz
              2014(PLoS Med), 야간뇨 Wang 2015(Int Neurourol J), 성기능 메타분석
              2021(Clin Respir J), 증상·진단 기준 Kapur 2017(JCSM)
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <p className="text-base text-muted-foreground">
          이 리포트는 진단이 아니에요. 정확한 것은 병원 진료로 확인하세요.
        </p>
        <Link
          href="/privacy"
          className="flex min-h-12 items-center text-base text-muted-foreground underline underline-offset-4"
        >
          개인정보처리방침 보기
        </Link>
      </footer>
    </article>
  )
}
