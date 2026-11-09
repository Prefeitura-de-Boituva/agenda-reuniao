import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefatos gerados pelo `prisma contract emit` (não seguem nossas regras):
    "src/prisma/contract.d.ts",
    "migrations/snapshots/**",
    // Scripts CommonJS de teste manual da API, executados direto no Node:
    "test-post.js",
    "test-post.cjs",
  ]),
]);

export default eslintConfig;
