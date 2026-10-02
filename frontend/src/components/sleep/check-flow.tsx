"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QUESTIONS, judge, type Answer } from "@/lib/sleep-check"

const OPTIONS: { value: Answer; label: string }[] = [
  { value: "yes", label: "네" },
  { value: "no", label: "아니요" },
  { value: "unknown", label: "잘 모르겠어요" },
]

export function CheckFlow() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const question = QUESTIONS[step]
  const total = QUESTIONS.length

  function answer(value: Answer) {
    const next = { ...answers, [question.id]: value }
    setAnswers(next)
    if (step + 1 < total) {
      setStep(step + 1)
      return
    }
    const signals = QUESTIONS.filter((q) => next[q.id] === "yes")
      .map((q) => q.id)
      .join(",")
    router.push(`/result?level=${judge(next)}&s=${signals}`)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col px-4">
      <div className="flex h-14 items-center">
        {step > 0 && (
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="이전 질문"
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft className="size-5" />
          </Button>
        )}
      </div>
      <div
        className="h-1 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={step + 1}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${((step + 1) / total) * 100}%` }}
        />
      </div>
      <p className="mt-6 text-sm text-muted-foreground tabular-nums">
        {step + 1} / {total} · 옆에서 본 대로 답해 주세요
      </p>
      <h1 className="mt-2 text-2xl leading-snug font-bold">{question.text}</h1>
      <div className="mt-8 flex flex-col gap-3">
        {OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={
              answers[question.id] === option.value ? "default" : "outline"
            }
            className="h-12 w-full text-base"
            onClick={() => answer(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </main>
  )
}
