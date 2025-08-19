import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/playwright",
  reporter: "list",
  timeout: 20000,
  use: { viewport: { width: 1200, height: 800 } },
});
