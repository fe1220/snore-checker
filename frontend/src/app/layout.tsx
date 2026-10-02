import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { Providers } from "./providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "코골이 체크",
  description: "옆에서 본 코골이, 병원에 가볼 만한지 3분 만에 체크해요",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Providers>{children}</Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
