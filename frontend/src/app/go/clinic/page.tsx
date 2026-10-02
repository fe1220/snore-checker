import { ClinicRedirect } from "@/components/sleep/clinic-redirect"

export const metadata = { title: "수면클리닉 찾기로 이동" }

// 외부 링크 클릭을 페이지뷰로 집계하려고 한 번 거쳐 간다.
export default function GoClinicPage() {
  return <ClinicRedirect />
}
