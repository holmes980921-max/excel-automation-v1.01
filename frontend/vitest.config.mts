import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["node_modules", ".next"],
    // Coverage instrumentation on this machine adds enough overhead that
    // the 5000ms default intermittently trips on whichever test happens to
    // render the most (AG Grid mounts, multi-step page flows) - observed
    // moving between unrelated test files run-to-run, i.e. system-wide
    // contention, not a single slow test. Raised globally instead of
    // whack-a-moling per-test timeouts (V1.13).
    testTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
});
