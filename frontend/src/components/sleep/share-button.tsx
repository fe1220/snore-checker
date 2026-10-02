"use client"

import { Share2 } from "lucide-react"
import { toast } from "sonner"
import { track } from "@/components/analytics/track"
import { Button } from "@/components/ui/button"

export function ShareButton({ path }: { path: string }) {
  async function share() {
    track({ name: "share_click" })
    const url = `${window.location.origin}${path}`
    const text =
      "함께 자는 분이 만든 수면 진단 리포트예요. 결과를 확인해 보세요."
    if (navigator.share) {
      try {
        // title·url을 따로 넘기면 공유 창의 "복사"가 문구와 줄바꿈 없이 붙여 쓴다.
        await navigator.share({ text: `${text}\n${url}` })
      } catch {
        // 사용자가 공유 창을 닫은 경우
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast.success("링크를 복사했어요. 카톡에 붙여 넣어 보내세요")
    } catch {
      toast.error("링크를 복사하지 못했어요. 한 번 더 눌러 주세요")
    }
  }

  return (
    <Button variant="ghost" size="touch" className="w-full" onClick={share}>
      <Share2 data-icon="inline-start" aria-hidden />
      리포트 보내기
    </Button>
  )
}
