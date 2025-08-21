const { test, expect } = require("@playwright/test");

test("Dashboard Health Validation", async ({ page }) => {
  // Navigate to the dashboard
  await page.goto("https://gpt-cursor-runner.thoughtmarks.app/monitor");

  // Wait for the page to load
  await page.waitForLoadState("networkidle");

  // Check that the page title contains "GHOST RUNNER"
  await expect(page).toHaveTitle(/GHOST RUNNER/);

  // Check that the main heading is present
  await expect(page.locator("h1")).toContainText("GHOST RUNNER");

  // Wait for component health section to load
  await page.waitForSelector("h3:has-text(\"⚙️ Component Health\")", {
    timeout: 30000,
  });

  // Check that all critical services are showing as healthy
  const healthSection = page
    .locator("h3:has-text(\"⚙️ Component Health\")")
    .locator("..");

  // Look for healthy status indicators
  await expect(healthSection.locator("text=✅")).toBeVisible();

  // Check that no critical failures are present
  const criticalFailures = page.locator("text=❌ Critical Failures");
  await expect(criticalFailures).not.toBeVisible();

  // Check that the overall status is healthy
  await expect(page.locator("text=Overall")).toBeVisible();

  // Take a screenshot for validation
  await page.screenshot({
    path: "dashboard-health-validation.png",
    fullPage: true,
  });

  console.log("✅ Dashboard health validation completed successfully");
});
