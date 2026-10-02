import { ReportView } from "@/components/sleep/report-view"

export const metadata = {
  title: "수면 체크 리포트",
  description: "옆에서 본 코골이, 병원에 가볼 만한지 알려드려요",
}

export default async function ReportPage(props: PageProps<"/r">) {
  const { shared } = await props.searchParams
  return <ReportView shared={shared === "1"} />
}
