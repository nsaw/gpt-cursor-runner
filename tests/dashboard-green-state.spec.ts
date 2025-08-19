import { test, expect } from "@playwright/test";

test.describe("Dashboard Green-State Enforcement", () => {
  test("all dashboard components must show green status", async ({ page }) => {
    const dashboardUrl =
      process.env.DASHBOARD_URL ||
      "https://gpt-cursor-runner.thoughtmarks.app/monitor";

    // Navigate to dashboard
    await page.goto(dashboardUrl);

    // Wait for dashboard to load
    await page.waitForLoadState("networkidle");

    // Wait for component health indicators to appear
    await page.waitForSelector(
      '[data-testid="component-health"], .component-status, .status-indicator',
      { timeout: 30000 },
    );

    // Check for any red (❌) or yellow (⚠️) status indicators
    const redIndicators = await page.locator("text=❌").count();
    const yellowIndicators = await page.locator("text=⚠️").count();
    const loadingDots = await page.locator("text=…").count();

    // Fail if any non-green indicators are found
    expect(redIndicators, "Dashboard contains red (❌) status indicators").toBe(
      0,
    );
    expect(
      yellowIndicators,
      "Dashboard contains yellow (⚠️) status indicators",
    ).toBe(0);
    expect(loadingDots, "Dashboard contains loading dots (…)").toBe(0);

    // Verify green indicators are present for critical components
    const greenIndicators = await page.locator("text=✅").count();
    expect(
      greenIndicators,
      "Dashboard must have green (✅) status indicators",
    ).toBeGreaterThan(0);

    // Check specific critical components (adjust selectors based on actual dashboard structure)
    const criticalComponents = [
      "summary-monitor",
      "patch-executor",
      "telemetry-orchestrator-daemon",
      "alert-engine-daemon",
      "comprehensive-dashboard",
      "autonomous-decision-daemon",
      "metrics-aggregator-daemon",
    ];

    for (const component of criticalComponents) {
      // Look for component status in various possible formats
      const componentStatus = await page
        .locator(
          `[data-component="${component}"], [data-testid="${component}"], .${component}`,
        )
        .first();

      if ((await componentStatus.count()) > 0) {
        const statusText = await componentStatus.textContent();
        expect(
          statusText,
          `Component ${component} must show green status`,
        ).toMatch(/✅|running|healthy/);
      }
    }

    // Additional validation: check API endpoints return running status
    const apiResponse = await page.request.get(
      `${dashboardUrl.replace("/monitor", "/api/status")}`,
    );
    expect(apiResponse.status()).toBe(200);

    const apiData = await apiResponse.json();
    const daemonStatus = apiData.daemon_status || {};

    // Verify critical components show "running" in API
    for (const component of criticalComponents) {
      if (daemonStatus[component]) {
        expect(
          daemonStatus[component],
          `API reports ${component} as ${daemonStatus[component]}`,
        ).toBe("running");
      }
    }
  });

  test("dashboard must be accessible and responsive", async ({ page }) => {
    const dashboardUrl =
      process.env.DASHBOARD_URL ||
      "https://gpt-cursor-runner.thoughtmarks.app/monitor";

    // Navigate to dashboard
    await page.goto(dashboardUrl);

    // Verify page loads successfully
    expect(page.url()).toContain("monitor");

    // Check for dashboard title or header
    const title = await page.title();
    expect(title.toLowerCase()).toContain("dashboard");

    // Verify no console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForLoadState("networkidle");

    expect(
      consoleErrors.length,
      "Dashboard should not have console errors",
    ).toBe(0);
  });
});
