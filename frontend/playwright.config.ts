import { defineConfig } from "@playwright/test"

// 빌드된 결과를 띄워서 잰다. 개발 서버는 오버레이가 끼어 측정이 달라진다.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3100",
    viewport: { width: 375, height: 812 },
    locale: "ko-KR",
  },
  webServer: {
    command: "pnpm exec next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
  },
})
