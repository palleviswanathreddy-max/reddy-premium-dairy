import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Base Next.js rules
  ...nextVitals,
  ...nextTs,

  // Ignore build output and test files from ESLint
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/__tests__/**",   // Test files use Jest globals — handled by separate tsconfig
    "public/sw.js",
    "public/workbox-*.js",
    "public/fallback-*.js",
  ]),

  // ── Relaxed rules for infrastructure / utility files ────────────────────
  // These files (loggers, caches, analytics, middleware helpers, DB helpers)
  // legitimately use `any` for generic patterns and adapter code.
  // Strict typing in these layers would require complex conditional types
  // that add noise without meaningful safety gains.
  {
    files: [
      "src/db/**/*.ts",
      "src/utils/**/*.ts",
      "src/middleware/**/*.ts",
      "src/hooks/**/*.ts",
      "src/app/api/**/*.ts",
      // Admin dashboard uses dynamic API-shaped data (stats, orders, customers)
      // where strict typing would require duplicating every server type client-side.
      "src/app/admin/**/*.tsx",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },

  // ── App UI files: keep strict, but allow img for now (images are local) ─
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",   // warn, not error
      "@next/next/no-img-element": "warn",             // warn, not error
    },
  },
]);

export default eslintConfig;
