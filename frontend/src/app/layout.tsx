import type { Metadata } from "next"
import {
  AnalyticsPageView,
  AnalyticsScripts,
} from "@/components/analytics/analytics"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://snore-check.vercel.app"),
  title: "코골이 진단",
  description:
    "옆에서 본 코골이, 수면무호흡증일 수 있는지 3분 무료진단으로 확인해요",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <AnalyticsScripts />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
        <Toaster />
        <AnalyticsPageView />
      </body>
    </html>
  )
}
