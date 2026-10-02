"use client"

import { useEffect } from "react"
import { track } from "@/components/analytics/track"
import { buttonVariants } from "@/components/ui/button"
import { CLINIC_FINDER_URL } from "@/lib/sleep-check"

export function ClinicRedirect() {
  useEffect(() => {
    track({ name: "clinic_click" })
    const timer = setTimeout(
      () => window.location.replace(CLINIC_FINDER_URL),
      600,
    )
    return () => clearTimeout(timer)
  }, [])

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-base">
        레즈메드 수면다원검사 병원찾기로 이동하고 있어요
      </p>
      <a
        href={CLINIC_FINDER_URL}
        className={buttonVariants({ variant: "outline" })}
      >
        바로 이동하기
      </a>
    </main>
  )
}
