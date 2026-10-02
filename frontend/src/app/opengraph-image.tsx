import { ImageResponse } from "next/og"

export const alt = "수면 체크 리포트"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const FONT_URL =
  "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/Pretendard-Bold.otf"

// ImageResponse는 CSS 변수를 못 읽어서 globals.css 토큰 값을 그대로 옮겨 쓴다.
const COLOR = {
  background: "#1b2142",
  card: "#252c54",
  foreground: "#fff8ec",
  muted: "#a9aec8",
  track: "#2f3866",
  primary: "#f5d57a",
  warning: "#f28b6c",
}

export default async function OgImage() {
  const font = await fetch(FONT_URL).then((res) => res.arrayBuffer())

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: COLOR.background,
        padding: 56,
        fontFamily: "Pretendard",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          background: COLOR.card,
          borderRadius: 32,
          padding: "48px 56px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 28,
            color: COLOR.muted,
          }}
        >
          <span>수면 체크 리포트</span>
          <span>옆에서 본 9가지</span>
        </div>
        <div
          style={{
            marginTop: 56,
            fontSize: 72,
            color: COLOR.foreground,
            lineHeight: 1.25,
          }}
        >
          옆에서 본 코골이,
        </div>
        <div style={{ fontSize: 72, color: COLOR.primary, lineHeight: 1.25 }}>
          병원에 가볼 만할까요?
        </div>
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            gap: 12,
          }}
        >
          {[COLOR.track, COLOR.track, COLOR.warning].map((color, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                height: 14,
                borderRadius: 7,
                background: color,
              }}
            />
          ))}
        </div>
      </div>
    </div>,
    { ...size, fonts: [{ name: "Pretendard", data: font, weight: 700 }] },
  )
}
