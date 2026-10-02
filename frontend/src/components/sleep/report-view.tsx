"use client"

import Link from "next/link"
import { useSyncExternalStore } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Report } from "@/components/sleep/report"
import { ShareButton } from "@/components/sleep/share-button"
import { fromReportHash, judge, toReportHash } from "@/lib/sleep-check"
import { cn } from "cn"

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange)
  return () => window.removeEventListener("hashchange", onChange)
}

// 응답은 해시에만 있어서 서버에서는 읽을 수 없다. 서버 렌더링 동안은 null로 두고 Skeleton을 보여준다.
function useHash() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => null,
  )
}

export function ReportView({ shared }: { shared: boolean }) {
  const hash = useHash()

  if (hash === null) return <ReportSkeleton />

  const signals = fromReportHash(hash)
  if (!signals) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg">리포트를 찾을 수 없어요.</p>
        <Link
          href="/check"
          className={cn(
            buttonVariants(),
            "h-auto min-h-14 px-6 py-2 text-lg whitespace-normal",
          )}
        >
          {shared ? "체크하기" : "다시 체크하기"}
        </Link>
      </main>
    )
  }

  const level = judge(signals)
  const date = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  const sharePath = `/r?shared=1#${toReportHash(signals)}`

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col">
      <div className="flex-1 px-4 pt-6 pb-8">
        <Report level={level} signals={signals} date={date} shared={shared} />
      </div>
      <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background p-4">
        <Link
          href="/clinics"
          className={cn(
            buttonVariants(),
            "h-auto min-h-14 w-full py-2 text-lg whitespace-normal",
          )}
        >
          근처 수면클리닉 찾기
        </Link>
        {!shared && <ShareButton path={sharePath} />}
      </div>
    </main>
  )
}

function ReportSkeleton() {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col gap-6 px-4 pt-6"
      aria-busy
      aria-label="리포트를 불러오는 중"
    >
      <Skeleton className="h-4 w-48" />
      <div className="flex flex-col gap-3 border-l-4 pl-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-16 w-3/4" />
        <Skeleton className="h-12 w-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </main>
  )
}
