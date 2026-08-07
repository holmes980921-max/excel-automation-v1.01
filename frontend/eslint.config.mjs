import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// Manually authored flat config (V1.08 - production readiness / static
// analysis). `next lint`'s first-run setup is an interactive wizard that
// can't be driven non-interactively in this environment, so this config is
// hand-written instead of generated, using the same next/core-web-vitals +
// next/typescript presets it would have produced.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // next-env.d.ts is auto-generated and rewritten by `next dev`/`next
    // build` on every run - not something to hand-edit to satisfy a lint
    // rule, so it's excluded rather than "fixed" (the same exception
    // Next.js's own project scaffolding makes).
    ignores: [".next/**", "coverage/**", "node_modules/**", "next-env.d.ts"],
  },
];

export default eslintConfig;
