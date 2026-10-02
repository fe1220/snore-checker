import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShareButton } from "@/components/sleep/share-button"
import { LEVEL_COPY, isLevel } from "@/lib/sleep-check"
import { cn } from "cn"

export const metadata = { title: "코골이 체크 결과" }

const FACTS = [
  {
    title: "병일 수 있어요",
    body: "숨 멈춤이 있는 코골이는 수면무호흡의 신호예요. 자는 동안의 일이라 본인은 잘 몰라요.",
  },
  {
    title: "치료하면 사라질 수 있어요",
    body: "치료를 시작하면 코골이가 멎고, 낮 졸림과 피로도 줄어요. 옆 사람도 다시 푹 잘 수 있어요.",
  },
  {
    title: "그냥 두면 건강에 안 좋아요",
    body: "치료하지 않은 수면무호흡은 졸음운전 사고와 심혈관 질환 위험을 높여요.",
  },
]

export default async function ResultPage(props: PageProps<"/result">) {
  const { level, shared } = await props.searchParams

  if (!isLevel(level)) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base">결과를 찾을 수 없어요.</p>
        <Link href="/check" className={buttonVariants()}>
          다시 체크하기
        </Link>
      </main>
    )
  }

  const copy = LEVEL_COPY[level]

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col">
      <div className="flex flex-1 flex-col gap-8 px-4 pt-10 pb-8">
        <section className="flex flex-col gap-2">
          {shared === "1" && level !== "weak" && (
            <p className="text-sm font-semibold text-primary">
              당신의 낮 졸림과 피로도 이것 때문일 수 있어요
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {shared === "1" ? "옆에서 본 코골이 체크 결과" : "체크 결과"}
          </p>
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="text-base text-muted-foreground">{copy.body}</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">알아두면 좋은 네 가지</h2>
          {FACTS.map((fact) => (
            <Card key={fact.title} size="sm">
              <CardContent className="flex flex-col gap-1">
                <p className="text-base font-semibold">{fact.title}</p>
                <p className="text-sm text-muted-foreground">{fact.body}</p>
              </CardContent>
            </Card>
          ))}
          <Card size="sm" className="bg-primary/5 ring-primary/40">
            <CardContent className="flex flex-col gap-1">
              <p className="text-base font-semibold text-primary">
                수면클리닉에서 검사받으면 돼요
              </p>
              <p className="text-sm text-muted-foreground">
                외래 상담을 받은 뒤 하룻밤 검사를 해요. 건강보험이 돼서
                본인부담은 약 12~14만 원이에요. 금요일·토요일 밤에 검사하는 곳도
                있으니 예약할 때 물어보세요.
              </p>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            이 체크는 진단이 아니에요. 정확한 판단은 진료로 받아요.
          </p>
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-1 border-t bg-background p-4">
        <Link
          href="/go/clinic"
          className={cn(buttonVariants(), "h-12 w-full text-base")}
        >
          근처 수면클리닉 찾기
          <ExternalLink data-icon="inline-end" aria-hidden />
        </Link>
        {shared !== "1" && <ShareButton level={level} />}
      </div>
    </main>
  )
}
