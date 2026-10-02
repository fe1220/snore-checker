"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

export function ShareButton({ path }: { path: string }) {
  async function share() {
    const url = `${window.location.origin}${path}`
    const text = "옆에서 본 당신의 수면 체크 리포트예요."
    if (navigator.share) {
      try {
        await navigator.share({ title: "수면 체크 리포트", text, url })
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
      <Share2 data-icon="inline-start" aria-hidden />
      리포트 보내기
    </Button>
  )
}
