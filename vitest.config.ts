import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    env: { TZ: "Asia/Kolkata" },
    coverage: {
      provider: "v8",
      // Logic layers. UI components and browser-only glue are covered by the Playwright E2E suite instead.
      include: ["src/lib/**", "src/server/**", "src/app/api/**"],
      exclude: ["src/lib/types.ts", "src/lib/store.ts", "src/lib/prefs*.ts", "src/lib/ondevice.ts"],
      reporter: ["text-summary", "text", "json-summary"],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
});
