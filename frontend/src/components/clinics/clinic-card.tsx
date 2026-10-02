"use client"

import { ExternalLink, Phone } from "lucide-react"
import { track } from "@/components/analytics/track"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { clinicLink, mapSearchUrl, type Hospital } from "@/lib/hospitals"
import { cn } from "cn"

export function ClinicCard({
  hospital,
  distance,
}: {
  hospital: Hospital
  distance?: string
}) {
  const params = { hospital_id: hospital.id, region: hospital.region }
  const link = clinicLink(hospital)

  return (
    <Card className="gap-3 px-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere]">
            {hospital.name}
          </h2>
          {distance && (
            <span className="shrink-0 text-base text-muted-foreground tabular-nums">
              {distance}
            </span>
          )}
        </div>
        {/* 학회 명단에 있다는 뜻이다. 인증 제도인지 확인하지 못해 "인증"이라고 쓰지 않는다. */}
        {hospital.listed && (
          <Badge
            variant="outline"
            className="h-auto w-fit px-2 py-0.5 text-base text-primary"
          >
            수면학회 등록
          </Badge>
        )}
        {/* 주소를 누르면 지도에서 위치를 볼 수 있다. 버튼을 셋으로 늘리지 않으려고 주소에 건다. */}
        <a
          href={mapSearchUrl(hospital)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-12 min-w-0 items-center text-base [overflow-wrap:anywhere] text-muted-foreground underline underline-offset-4"
        >
          {hospital.address}
        </a>
      </div>
      <div className="flex flex-wrap gap-2">
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone}`}
            onClick={() => track({ name: "clinic_call", ...params })}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-auto min-h-12 flex-1 py-2 text-lg whitespace-normal",
            )}
          >
            <Phone data-icon="inline-start" aria-hidden />
            전화하기
          </a>
        )}
        {/* 이 화면의 주요 행동이다. 카드마다 채운 버튼을 두지 않고 글자·테두리 색으로만 강조한다. */}
        <a
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() =>
            track({ name: "clinic_click", ...params, target: link.target })
          }
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-auto min-h-12 flex-1 border-primary py-2 text-lg whitespace-normal text-primary",
          )}
        >
          {link.label}
          <ExternalLink data-icon="inline-end" aria-hidden />
        </a>
      </div>
    </Card>
  )
}
