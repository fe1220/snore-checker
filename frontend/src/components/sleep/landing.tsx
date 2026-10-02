import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export const HEADLINES = {
  heal: "코골이가 이렇게\n사라질 수 있는 거였어요?",
  disease: "숨이 멈추는 코골이,\n병일 수도 있어요",
  sleep: "옆 사람 코골이에\n잠 못 드는 밤, 끝낼 수 있어요",
} as const

export type HeadlineKey = keyof typeof HEADLINES

const POINTS = [
  "3분 무료진단으로 수면무호흡증 가능성 확인",
  "수면다원검사가 필요한지, 비용은 얼마인지 안내",
  "근처 수면클리닉 찾기",
]

const SPARKLE =
  "M0-10C1.5-3 3-1.5 10 0 3 1.5 1.5 3 0 10-1.5 3-3 1.5-10 0-3-1.5-1.5-3 0-10Z"

// 광고 소재의 달과 별만 가져왔다. 광고에서 넘어온 사람이 같은 서비스로 알아보게 한다.
function NightSky({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 343 160"
      preserveAspectRatio="xMaxYMid meet"
      className={cn("w-full fill-primary", className)}
      aria-hidden
    >
      <mask id="crescent">
        <rect width="343" height="160" fill="white" />
        <circle cx="291" cy="66" r="30" fill="black" />
      </mask>
      <circle cx="272" cy="80" r="36" mask="url(#crescent)" />
      <path d={SPARKLE} transform="translate(196 52)" />
      <path d={SPARKLE} transform="translate(222 104) scale(0.6)" />
      <g opacity="0.6">
        <circle cx="40" cy="48" r="2" />
        <circle cx="104" cy="112" r="2" />
        <circle cx="150" cy="30" r="2" />
        <circle cx="318" cy="136" r="2" />
      </g>
    </svg>
  )
}

export function Landing({ headline }: { headline: HeadlineKey }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col">
      <div className="flex flex-1 flex-col px-4 pt-6">
        <p className="text-base font-semibold text-muted-foreground">
          코골이체커
        </p>
        <h1 className="mt-8 text-3xl leading-tight font-extrabold tracking-tight whitespace-pre-line">
          {HEADLINES[headline]}
        </h1>
        <p className="mt-4 text-lg font-semibold text-balance text-primary">
          숨이 멈추는 코골이는 병일 수 있어요. 치료하면 나아질 수 있어요
        </p>
        <NightSky className="min-h-32 flex-1" />
        <ul className="divide-y border-t">
          {POINTS.map((text) => (
            <li key={text} className="py-3 text-lg">
              {text}
            </li>
          ))}
        </ul>
        {/* 고정 바에 두면 큰 글씨에서 본문을 많이 가려서 본문 끝에 둔다. */}
        <Link
          href="/privacy"
          className="flex min-h-12 items-center text-base text-muted-foreground underline underline-offset-4"
        >
          개인정보처리방침 보기
        </Link>
      </div>
      <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-background p-4">
        <Link
          href={`/check?from=${headline}`}
          className={cn(
            buttonVariants(),
            "h-auto min-h-14 w-full py-2 text-lg whitespace-normal",
          )}
        >
          3분 무료진단 시작하기
        </Link>
      </div>
    </main>
  )
}
