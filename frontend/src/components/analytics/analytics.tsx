"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"
import { pixel } from "@/components/analytics/track"

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

// 분석 도구 초기화. 하이드레이션 전에 큐가 준비되도록 <head>의 인라인 스크립트로 넣는다.
export function AnalyticsScripts() {
  return (
    <>
      {GA_ID && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:false});`,
            }}
          />
        </>
      )}
      {PIXEL_ID && (
        <script
          dangerouslySetInnerHTML={{
            // 메타 기본 스니펫. 자동 이벤트 수집(autoConfig)과 주소 변경 자동 PageView는 끈다.
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq.disablePushState=true;fbq('set','autoConfig',false,'${PIXEL_ID}');fbq('init','${PIXEL_ID}');`,
          }}
        />
      )}
    </>
  )
}

// 페이지 이동마다 페이지뷰를 보낸다. 리포트 응답은 해시에 있으니 GA에는 해시를 뺀 주소만 보낸다.
export function AnalyticsPageView() {
  const pathname = usePathname()

  useEffect(() => {
    const { origin, search } = window.location
    window.gtag?.("event", "page_view", {
      page_location: `${origin}${pathname}${search}`,
    })
    pixel("track", "PageView")
  }, [pathname])

  return null
}
