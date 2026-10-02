import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Report } from "@/components/sleep/report"
import { ShareButton } from "@/components/sleep/share-button"
import { QUESTIONS, isLevel } from "@/lib/sleep-check"
import { cn } from "cn"

export const metadata = {
  title: "수면 체크 리포트",
  description: "옆에서 본 코골이로 정리한 수면무호흡 신호와 검사 방법",
}

export default async function ResultPage(props: PageProps<"/result">) {
  const { level, s, shared } = await props.searchParams

  if (!isLevel(level)) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-base">리포트를 찾을 수 없어요.</p>
        <Link href="/check" className={buttonVariants()}>
          다시 체크하기
        </Link>
      </main>
    )
  }

  const ids = typeof s === "string" ? s.split(",") : []
  const signals = QUESTIONS.filter((q) => ids.includes(q.id))
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const isShared = shared === "1"
  const sharePath = `/result?level=${level}&s=${signals.map((q) => q.id).join(",")}&shared=1`

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col">
      <div className="flex-1 px-4 pt-6 pb-8">
        <Report level={level} signals={signals} date={date} shared={isShared} />
      </div>
      <div className="sticky bottom-0 flex flex-col gap-1 border-t bg-background p-4">
        <Link
          href="/go/clinic"
          className={cn(buttonVariants(), "h-12 w-full text-base")}
        >
          근처 수면클리닉 찾기
          <ExternalLink data-icon="inline-end" aria-hidden />
        </Link>
        {!isShared && <ShareButton path={sharePath} />}
      </div>
    </main>
  )
}
