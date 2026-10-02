import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 레이어 경계: app → components → lib → data. 규칙 설명은 frontend/CLAUDE.md
  {
    files: ["src/lib/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "next", "next/*"],
              message: "lib는 프레임워크에 의존하지 않는 순수 로직만 둔다.",
            },
            {
              group: ["@/components/*", "@/app/*"],
              message: "lib는 상위 레이어를 import하지 않는다.",
            },
          ],
        },
      ],
    },
  },
  {
    // 같은 파일에 여러 블록이 걸리면 마지막 블록이 규칙을 덮어쓰므로 components 블록에도 data 제한을 반복한다.
    files: ["src/app/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/data/*"],
              message: "크롤링 JSON은 src/lib의 조회 함수를 통해서만 읽는다.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*"],
              message: "components는 app을 import하지 않는다.",
            },
            {
              group: ["@/data/*"],
              message: "크롤링 JSON은 src/lib의 조회 함수를 통해서만 읽는다.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/ui/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/*",
                "!@/components/ui",
                "@/lib/*",
                "@/app/*",
                "@/data/*",
              ],
              message: "ui는 기능 컴포넌트·도메인 로직에 의존하지 않는다.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
])

export default eslintConfig
