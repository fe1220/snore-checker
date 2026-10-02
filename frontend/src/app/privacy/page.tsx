import Link from "next/link"

export const metadata = { title: "개인정보처리방침" }

const SECTIONS = [
  {
    title: "진단 응답",
    body: [
      "진단에 답한 내용은 어디에도 저장하지 않고 보내지 않아요.",
      "답은 리포트 주소(링크) 안에만 담겨요. 이 주소를 받은 사람만 리포트를 볼 수 있어요.",
    ],
  },
  {
    title: "방문 기록",
    body: [
      "서비스를 고치고 광고 성과를 보려고 Google 애널리틱스와 Meta 픽셀을 써요.",
      "Google 애널리틱스에는 본 화면, 진단 시작과 완료, 결과 단계, 누른 버튼, 기기 종류를 보내요.",
      "Meta 픽셀에는 본 화면, 진단 완료, 병원 찾기를 눌렀는지만 보내요. 결과 단계와 답은 보내지 않아요.",
      "이름, 연락처처럼 나를 알아볼 수 있는 정보는 받지 않아요.",
    ],
  },
  {
    title: "기록 보관과 끄는 방법",
    body: [
      "방문 기록은 Google과 Meta가 각자 정한 기간 동안 보관해요.",
      "브라우저에서 쿠키를 막거나 광고 추적을 끄면 기록되지 않아요.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-screen-md flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        <p className="text-base text-muted-foreground">
          코골이 진단 · 2026년 10월 2일부터 적용
        </p>
      </div>
      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">{section.title}</h2>
          <ul className="flex list-disc flex-col gap-2 pl-6 text-lg">
            {section.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
      <Link
        href="/"
        className="flex min-h-12 items-center text-lg text-primary underline underline-offset-4"
      >
        처음으로 가기
      </Link>
    </main>
  )
}
