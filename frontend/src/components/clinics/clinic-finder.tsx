"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, LocateFixed, SearchX, X } from "lucide-react"
import { track } from "@/components/analytics/track"
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
  formatDistance,
  groupByRegion,
  listRegions,
  sortByDistance,
  type Coords,
  type Hospital,
  type Region,
} from "@/lib/hospitals"
import { cn } from "cn"

// 지역으로 보거나 내 주변 순으로 본다. 둘을 조합하지 않는다.
type View =
  { kind: "region"; region: Region | null } | { kind: "nearby"; origin: Coords }

const LOCATION_MESSAGES = {
  denied: "위치 권한이 꺼져 있어요. 지역을 골라 주세요",
  failed: "위치를 확인할 수 없어요. 지역을 골라 주세요",
}

export function ClinicFinder({ items }: { items: Hospital[] }) {
  const [view, setView] = useState<View>({ kind: "region", region: null })
  const [sheetOpen, setSheetOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState<
    keyof typeof LOCATION_MESSAGES | null
  >(null)

  const regions = listRegions(items)
  const selectedRegion = view.kind === "region" ? view.region : null
  const byRegion = filterByRegion(items, selectedRegion)

  // 진행 중인 위치 요청을 가리키는 토큰. 바뀌면 늦게 도착한 콜백은 버린다.
  const requestId = useRef(0)
  useEffect(() => {
    const token = requestId
    return () => {
      token.current++
    }
  }, [])

  function selectRegion(next: Region | null) {
    requestId.current++
    setLocating(false)
    setView({ kind: "region", region: next })
    setLocationError(null)
    setSheetOpen(false)
  }

  function failLocation(result: keyof typeof LOCATION_MESSAGES) {
    setLocating(false)
    setView((current) =>
      current.kind === "nearby" ? { kind: "region", region: null } : current,
    )
    setLocationError(result)
    track({ name: "clinic_nearby", result })
  }

  // 권한은 사용자가 이 버튼을 눌렀을 때만 요청한다. 좌표는 거리 계산에만 쓰고 보내지 않는다.
  function requestNearby() {
    if (!("geolocation" in navigator)) {
      failLocation("failed")
      return
    }
    const id = ++requestId.current
    setLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (id !== requestId.current) return
        setLocating(false)
        setView({
          kind: "nearby",
          origin: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
        })
        track({ name: "clinic_nearby", result: "granted" })
      },
      (error) => {
        if (id !== requestId.current) return
        failLocation(
          error.code === error.PERMISSION_DENIED ? "denied" : "failed",
        )
      },
      { enableHighAccuracy: false, timeout: 10000 },
    )
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={cn(
              "h-11 min-w-0 flex-1 justify-between px-3 text-base",
              view.kind === "region" && "border-primary text-primary",
            )}
            onClick={() => setSheetOpen(true)}
          >
            <span className="truncate tabular-nums">
              {view.kind === "region"
                ? `${view.region ?? "전국"} · ${byRegion.length}곳`
                : "지역 선택"}
            </span>
            <ChevronDown data-icon="inline-end" aria-hidden />
          </Button>
          <Button
            variant="outline"
            disabled={locating}
            aria-pressed={view.kind === "nearby"}
            className={cn(
              "h-11 shrink-0 px-3 text-base",
              view.kind === "nearby" && "border-primary text-primary",
            )}
            onClick={requestNearby}
          >
            <LocateFixed data-icon="inline-start" aria-hidden />
            {locating ? "위치 확인 중…" : "내 주변 순으로 보기"}
          </Button>
        </div>
        {locationError && (
          <p role="alert" className="text-sm text-muted-foreground">
            {LOCATION_MESSAGES[locationError]}
          </p>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" showCloseButton={false}>
          <SheetHeader className="flex-row items-center justify-between">
            <SheetTitle>지역 선택</SheetTitle>
            <Button
              variant="ghost"
              className="size-11"
              aria-label="닫기"
              onClick={() => setSheetOpen(false)}
            >
              <X aria-hidden />
            </Button>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <RegionOption
              label="전국"
              count={items.length}
              selected={view.kind === "region" && view.region === null}
              onSelect={() => selectRegion(null)}
            />
            {regions.map((r) => (
              <RegionOption
                key={r.region}
                label={r.region}
                count={r.count}
                selected={view.kind === "region" && view.region === r.region}
                onSelect={() => selectRegion(r.region)}
              />
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {view.kind === "nearby" ? (
        <ClinicList
          hospitals={sortByDistance(items, view.origin)}
          showDistance
        />
      ) : byRegion.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <SearchX className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-base">이 지역에는 아직 등록된 곳이 없어요</p>
          <Button
            variant="outline"
            className="h-11 px-4 text-base"
            onClick={() => selectRegion(null)}
          >
            전국 보기
          </Button>
        </div>
      ) : selectedRegion === null ? (
        <div className="flex flex-col gap-8">
          {groupByRegion(items).map((group) => (
            <section key={group.region} className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold">
                {group.region}{" "}
                <span className="text-base font-normal text-muted-foreground tabular-nums">
                  {group.items.length}곳
                </span>
              </h2>
              <ClinicList hospitals={group.items} />
            </section>
          ))}
        </div>
      ) : (
        <ClinicList hospitals={byRegion} />
      )}
    </>
  )
}

function ClinicList({
  hospitals,
  showDistance = false,
}: {
  hospitals: (Hospital & { distanceKm?: number })[]
  showDistance?: boolean
}) {
  return (
    <ul className="flex flex-col gap-3">
      {hospitals.map((hospital) => (
        <li key={hospital.id}>
          <ClinicCard
            hospital={hospital}
            distance={
              showDistance && hospital.distanceKm !== undefined
                ? formatDistance(hospital.distanceKm)
                : undefined
            }
          />
        </li>
      ))}
    </ul>
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
