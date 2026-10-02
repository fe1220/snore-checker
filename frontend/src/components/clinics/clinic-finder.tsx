"use client"

import { useState } from "react"
import { ChevronDown, SearchX } from "lucide-react"
import { ClinicCard } from "@/components/clinics/clinic-card"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  filterByRegion,
  listRegions,
  type Hospital,
  type Region,
} from "@/lib/hospitals"
import { cn } from "cn"

export function ClinicFinder({ items }: { items: Hospital[] }) {
  const [region, setRegion] = useState<Region | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const regions = listRegions(items)
  const visible = filterByRegion(items, region)

  function selectRegion(next: Region | null) {
    setRegion(next)
    setSheetOpen(false)
  }

  return (
    <>
      <Button
        variant="outline"
        className="h-11 w-full justify-between border-primary px-4 text-base text-primary"
        onClick={() => setSheetOpen(true)}
      >
        <span className="tabular-nums">
          {region ?? "전체"} · {visible.length}곳
        </span>
        <ChevronDown data-icon="inline-end" aria-hidden />
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>지역 선택</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <RegionOption
              label="전체"
              count={items.length}
              selected={region === null}
              onSelect={() => selectRegion(null)}
            />
            {regions.map((r) => (
              <RegionOption
                key={r.region}
                label={r.region}
                count={r.count}
                selected={region === r.region}
                onSelect={() => selectRegion(r.region)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-base">이 지역에는 아직 등록된 곳이 없어요</p>
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => selectRegion(null)}
          >
            전체 보기
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((hospital) => (
            <li key={hospital.id}>
              <ClinicCard hospital={hospital} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function RegionOption({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string
  count: number
  selected: boolean
  onSelect: () => void
}) {
  return (
    <Button
      variant="outline"
      aria-pressed={selected}
      className={cn(
        "h-11 justify-between px-3 text-base",
        selected && "border-primary text-primary",
      )}
      onClick={onSelect}
    >
      {label}
      <span className="text-sm text-muted-foreground tabular-nums">
        {count}
      </span>
    </Button>
  )
}
