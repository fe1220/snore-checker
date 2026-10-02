import { ExternalLink } from "lucide-react"
import { ClinicFinder } from "@/components/clinics/clinic-finder"
import { buttonVariants } from "@/components/ui/button"
import {
  CLINIC_FINDER_URL,
  formatCrawledAt,
  formatHiraVersion,
  getHospitalData,
} from "@/lib/hospitals"
import { cn } from "cn"

export const metadata = { title: "근처 수면클리닉" }

export default function ClinicsPage() {
  const { crawledAt, hiraVersion, items } = getHospitalData()

  // 수집 데이터가 비었을 때만 원 페이지로 대신 안내한다.
  if (items.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-lg">
          병원 목록을 준비하지 못했어요. 레즈메드 병원찾기에서 찾아보세요.
        </p>
        <a
          href={CLINIC_FINDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants(),
            "h-auto min-h-14 px-4 py-2 text-lg whitespace-normal",
          )}
        >
          레즈메드 병원찾기 열기
          <ExternalLink data-icon="inline-end" aria-hidden />
        </a>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col gap-4 px-4 pt-6 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">근처 수면클리닉</h1>
        <p className="text-base text-muted-foreground">
          레즈메드 병원찾기 · 건강보험심사평가원{" "}
          {formatHiraVersion(hiraVersion)} · {formatCrawledAt(crawledAt)} 수집
        </p>
        <p className="text-base">방문 전에 전화로 확인해 주세요.</p>
      </header>
      <ClinicFinder items={items} />
    </main>
  )
}
