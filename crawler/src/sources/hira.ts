import { readFile } from "node:fs/promises"

// 심평원 "전국 병의원 및 약국 현황"에서 수면다원검사 실시기관만 뽑은 스냅샷. 만드는 방법은 crawler/README.md에 있다.
const SNAPSHOT = new URL("../../data/hira-psg.json", import.meta.url)

export type HiraItem = {
  ykiho: string
  name: string
  kind: string
  address: string
  phone: string | null
  homepage: string | null
  lat: number
  lng: number
}

export type HiraSnapshot = { version: string; items: HiraItem[] }

export function inKorea(lat: number, lng: number): boolean {
  return lat >= 33 && lat <= 38.7 && lng >= 124.5 && lng <= 131.9
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function isTextOrNull(value: unknown): value is string | null {
  return value === null || isText(value)
}

// 스냅샷은 사람이 분기마다 다시 만든다. 형식이 어긋난 파일로 좌표를 덮어쓰지 않도록 하나라도 틀리면 멈춘다.
export function parseSnapshot(data: unknown): HiraSnapshot {
  const { version, items } = (data ?? {}) as { version?: unknown; items?: unknown }
  if (!isText(version)) throw new Error("스냅샷에 version이 없습니다")
  if (!Array.isArray(items) || items.length === 0) throw new Error("스냅샷에 items가 없습니다")

  const seen = new Set<string>()
  for (const [index, raw] of items.entries()) {
    const item = (raw ?? {}) as Record<string, unknown>
    const label = `스냅샷 ${index + 1}번째 (${isText(item.name) ? item.name : "이름 없음"})`

    for (const field of ["ykiho", "name", "kind", "address"]) {
      if (!isText(item[field])) throw new Error(`${label}: ${field}가 없습니다`)
    }
    for (const field of ["phone", "homepage"]) {
      if (!isTextOrNull(item[field])) throw new Error(`${label}: ${field}는 문자열이거나 null이어야 합니다`)
    }
    if (typeof item.lat !== "number" || typeof item.lng !== "number" || !inKorea(item.lat, item.lng)) {
      throw new Error(`${label}: 좌표가 없거나 한국 범위 밖입니다`)
    }
    if (seen.has(item.ykiho as string)) throw new Error(`${label}: ykiho가 겹칩니다`)
    seen.add(item.ykiho as string)
  }

  return { version, items: items as HiraItem[] }
}

export async function loadSnapshot(): Promise<HiraSnapshot> {
  return parseSnapshot(JSON.parse(await readFile(SNAPSHOT, "utf8")))
}
