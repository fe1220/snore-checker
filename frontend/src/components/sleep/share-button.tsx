"use client"

import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { Level } from "@/lib/sleep-check"

export function ShareButton({ level }: { level: Level }) {
  async function share() {
    const url = `${window.location.origin}/result?level=${level}&shared=1`
    const text = "같이 자는 사람이 본 코골이 체크 결과예요."
    if (navigator.share) {
      try {
        await navigator.share({ title: "코골이 체크 결과", text, url })
      } catch {
        // 사용자가 공유 창을 닫은 경우
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("링크를 복사했어요. 카톡에 붙여 넣어 보내세요")
    } catch {
      toast.error("링크를 복사하지 못했어요. 다시 시도해 주세요")
    }
  }

  return (
    <Button variant="ghost" className="h-11 w-full text-base" onClick={share}>
      카톡으로 보내기
    </Button>
  )
}
