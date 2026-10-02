import { ReportView } from "@/components/sleep/report-view"

export const metadata = {
  title: "수면 체크 리포트",
  description: "옆에서 본 코골이로 정리한 수면무호흡 신호와 검사 방법",
}

export default async function ReportPage(props: PageProps<"/r">) {
  const { shared } = await props.searchParams
  return <ReportView shared={shared === "1"} />
}
