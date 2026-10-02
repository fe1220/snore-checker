import Link from "next/link"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export const metadata = { title: "페이지를 찾을 수 없어요" }

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-screen-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없어요</h1>
      <p className="text-lg text-muted-foreground">
        주소가 바뀌었거나 잘못 들어왔어요.
      </p>
      <Link href="/" className={cn(buttonVariants({ size: "cta" }), "px-6")}>
        처음으로 가기
      </Link>
    </main>
  )
}
