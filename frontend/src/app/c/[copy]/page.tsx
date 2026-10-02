import { notFound } from "next/navigation"
import {
  HEADLINES,
  Landing,
  type HeadlineKey,
} from "@/components/sleep/landing"

export function generateStaticParams() {
  return Object.keys(HEADLINES).map((copy) => ({ copy }))
}

export default async function CopyLanding(props: PageProps<"/c/[copy]">) {
  const { copy } = await props.params
  if (!(copy in HEADLINES)) notFound()
  return <Landing headline={copy as HeadlineKey} />
}
