import Link from "next/link"
import { Eye, MapPin, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export const HEADLINES = {
  heal: "코골이가 이렇게\n사라질 수 있는 거였어요?",
  disease: "숨이 멈추는 코골이,\n병일 수도 있어요",
  sleep: "옆 사람 코골이에\n잠 못 드는 밤, 끝낼 수 있어요",
} as const

export type HeadlineKey = keyof typeof HEADLINES

const POINTS = [
  { icon: Eye, text: "옆에서 본 것만 답하면 돼요" },
  { icon: ShieldCheck, text: "수면무호흡 검사는 건강보험이 돼요" },
  { icon: MapPin, text: "근처 수면클리닉까지 알려드려요" },
]

export function Landing({ headline }: { headline: HeadlineKey }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col">
      <div className="flex flex-1 flex-col gap-4 px-4 pt-12">
        <Badge variant="secondary" className="self-start">
          3분 체크
        </Badge>
        <h1 className="text-2xl leading-snug font-bold whitespace-pre-line">
          {HEADLINES[headline]}
        </h1>
        <p className="text-base text-muted-foreground">
          옆에서 듣던 코골이에 숨이 멈추는 순간이 있다면, 치료로 나아질 수 있는
          병일 수 있어요.
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-base">
              <Icon className="size-5 text-primary" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className="sticky bottom-0 border-t bg-background p-4">
        <Link
          href={`/check?from=${headline}`}
          className={cn(buttonVariants(), "h-12 w-full text-base")}
        >
          지금 바로 3분 체크하기
        </Link>
      </div>
    </main>
  )
}
