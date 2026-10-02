"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">문제가 생겼어요</h1>
      <p className="text-lg text-muted-foreground">
        잠시 뒤에 다시 눌러 주세요.
      </p>
      <Button size="cta" className="px-6" onClick={() => retry()}>
        다시 시도
      </Button>
    </main>
  )
}
