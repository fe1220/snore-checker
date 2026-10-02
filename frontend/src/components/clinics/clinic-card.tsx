"use client"

import { ExternalLink, Phone } from "lucide-react"
import { track } from "@/components/analytics/track"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  CLINIC_LINK_LABEL,
  clinicLink,
  clinicTags,
  mapSearchUrl,
  type Hospital,
} from "@/lib/hospitals"
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
  const tags = clinicTags(hospital)

  return (
    // 화면 밖 카드는 그리기를 건너뛴다. li에 주면 카드 테두리(ring)가 잘려서 카드 자체에 준다.
    <Card className="gap-3 px-4 offscreen-skip">
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
        {/* 규모와 학회 명단 여부를 한 줄에 둔다. 학회는 인증 제도인지 확인하지 못해 "인증"이라고 쓰지 않는다. */}
        {tags && (
          <Badge
            variant="outline"
            className="h-auto w-fit px-2 py-0.5 text-base whitespace-normal text-foreground"
          >
            {tags}
          </Badge>
        )}
        {/* 주소를 누르면 지도에서 위치를 볼 수 있다. 버튼을 셋으로 늘리지 않으려고 주소에 건다.
            주요 버튼이 이미 지도로 가는 병원은 같은 링크가 둘이 되지 않게 글자로만 둔다. */}
        {link.target === "map" ? (
          <p className="text-base [overflow-wrap:anywhere] text-muted-foreground">
            {hospital.address}
          </p>
        ) : (
          <a
            href={mapSearchUrl(hospital)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-12 min-w-0 items-center text-base [overflow-wrap:anywhere] text-muted-foreground underline underline-offset-4"
          >
            {hospital.address}
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone}`}
            onClick={() => track({ name: "clinic_call", ...params })}
            className={cn(
              buttonVariants({ variant: "outline", size: "touch" }),
              "flex-1",
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
            buttonVariants({ variant: "outline", size: "touch" }),
            "flex-1 border-primary text-primary",
          )}
        >
          {CLINIC_LINK_LABEL}
          <ExternalLink data-icon="inline-end" aria-hidden />
        </a>
      </div>
    </Card>
  )
}
