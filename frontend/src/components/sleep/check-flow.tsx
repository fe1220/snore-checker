"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { track } from "@/components/analytics/track"
import { QUESTIONS, judge, toReportHash, type Answer } from "@/lib/sleep-check"

const OPTIONS: { value: Answer; label: string }[] = [
  { value: "yes", label: "네" },
  { value: "no", label: "아니요" },
  { value: "unknown", label: "잘 모르겠어요" },
]

export function CheckFlow() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [picked, setPicked] = useState<Answer | null>(null)
  const locked = useRef(false)
  const question = QUESTIONS[step]
  const total = QUESTIONS.length
  const selected = picked ?? answers[question.id]

  // 고른 답을 잠깐 보여준 뒤 넘어간다. 바로 넘어가면 눌렸는지 알기 어렵다.
  // 상태는 다시 그려진 뒤에야 바뀌어서, 연달아 누른 두 번째 답은 ref로 막는다.
  function pick(value: Answer) {
    if (locked.current) return
    locked.current = true
    setPicked(value)
    setTimeout(() => {
      locked.current = false
      setPicked(null)
      answer(value)
    }, 200)
  }

  function answer(value: Answer) {
    if (Object.keys(answers).length === 0) track({ name: "check_start" })
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    if (step + 1 < total) {
      setStep(step + 1)
      return
    }
    const signals = QUESTIONS.filter((q) => next[q.id] === "yes")
    track({ name: "check_complete", level: judge(signals) })
    router.push(`/r#${toReportHash(signals)}`)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col px-4">
      <div className="flex min-h-14 items-center">
        {step > 0 && (
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-12"
            aria-label="이전 질문으로 가기"
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft className="size-6" />
          </Button>
        )}
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="진행 상황"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step + 1}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
      <p className="mt-6 text-base text-muted-foreground tabular-nums">
        {step + 1} / {total} · 남편을 옆에서 본 대로 답해 주세요
      </p>
      <div
        key={step}
        className="animate-in duration-200 fade-in slide-in-from-right-2 motion-reduce:animate-none"
      >
        <h1 className="mt-2 text-2xl leading-snug font-bold">
          {question.text}
        </h1>
        <div className="mt-8 flex flex-col gap-3">
          {OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={selected === option.value ? "default" : "outline"}
              className="h-auto min-h-14 w-full justify-start px-4 py-3 text-left text-lg whitespace-normal"
              onClick={() => pick(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>
    </main>
  )
}
