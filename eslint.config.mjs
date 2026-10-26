import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Node 스크립트는 Next 설정 대상이 아니라 no-undef가 꺼져 있다.
  // 템플릿 리터럴 안의 백틱을 빠뜨리면 문법 오류 없이 통과한 뒤
  // 실행 시점에 ReferenceError로 터지므로 여기서만 따로 켠다.
  {
    files: ["scripts/news/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      "no-undef": "error",
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
]);

export default eslintConfig;
