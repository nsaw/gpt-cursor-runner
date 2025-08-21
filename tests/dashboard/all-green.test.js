// E2E test: Dashboard must be all green
const { test, expect } = require("@playwright/test");
const DASHBOARD_URL =
  process.env.DASHBOARD_URL ||
  "https://gpt-cursor-runner.thoughtmarks.app/monitor";

test("Dashboard must be all green", async ({ page }) => {
  await page.goto(DASHBOARD_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector(".status-indicator", { timeout: 15000 });
  const statuses = await page.$$eval(".status-indicator", (els) =>
    els.map((e) => e.className),
  );
  // Fail on any non-green
  statuses.forEach((cls, _idx) => {
    expect(cls).toContain("status-ok");
  });
});
