export const metadata = { title: "개인정보처리방침" }

const SECTIONS = [
  {
    title: "체크 응답",
    body: [
      "체크에 답한 내용은 서버에 저장하지 않고 어디로도 보내지 않아요.",
      "응답은 리포트 주소의 # 뒤에만 담기고, 이 부분은 브라우저 밖으로 전송되지 않아요.",
    ],
  },
  {
    title: "방문 기록",
    body: [
      "서비스를 고치고 광고 성과를 보려고 Google 애널리틱스와 Meta 픽셀을 써요.",
      "Google 애널리틱스: 방문한 페이지, 체크 시작·완료와 결과 단계, 리포트 보내기와 병원 찾기 클릭, 기기와 브라우저 정보",
      "Meta 픽셀: 방문한 페이지, 체크 완료, 병원 찾기 클릭. 결과 단계와 응답은 보내지 않아요.",
      "이름, 연락처처럼 나를 알아볼 수 있는 정보는 받지 않아요.",
    ],
  },
  {
    title: "보관과 거부",
    body: [
      "방문 기록은 Google과 Meta의 정책에 따라 보관돼요.",
      "브라우저에서 쿠키를 막거나 광고 추적을 끄면 기록되지 않아요.",
    ],
  },
]

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-screen-md flex-col gap-8 px-4 py-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        <p className="text-sm text-muted-foreground">
          코골이체커 · 2026년 10월 2일부터 적용
        </p>
      </div>
      {SECTIONS.map((section) => (
        <section key={section.title} className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">{section.title}</h2>
          <ul className="flex list-disc flex-col gap-2 pl-6 text-base">
            {section.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}
