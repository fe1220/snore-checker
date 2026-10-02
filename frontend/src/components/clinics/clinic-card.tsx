"use client"

import { ExternalLink, Phone } from "lucide-react"
import { track } from "@/components/analytics/track"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Hospital } from "@/lib/hospitals"
import { cn } from "cn"

export function ClinicCard({
  hospital,
  distance,
}: {
  hospital: Hospital
  distance?: string
}) {
  const params = { hospital_id: hospital.id, region: hospital.region }

  return (
    <Card className="gap-3 px-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-base font-semibold">{hospital.name}</h2>
          {distance && (
            <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
              {distance}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{hospital.address}</p>
      </div>
      <div className="flex gap-2">
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone}`}
            onClick={() => track({ name: "clinic_call", ...params })}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-11 flex-1 text-base",
            )}
          >
            <Phone data-icon="inline-start" aria-hidden />
            전화하기
          </a>
        )}
        {/* 이 화면의 주요 행동이다. 카드마다 채운 버튼을 두지 않고 글자·테두리 색으로만 강조한다. */}
        <a
          href={hospital.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track({ name: "clinic_click", ...params })}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-11 flex-1 border-primary text-base text-primary",
          )}
        >
          병원 정보 보기
          <ExternalLink data-icon="inline-end" aria-hidden />
        </a>
      </div>
    </Card>
  )
}
