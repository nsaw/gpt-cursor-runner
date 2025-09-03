# GPT Cursor Runner

A comprehensive automation system for managing and executing patches across multiple projects.

## CI/CD Dashboard Green-State Enforcement

All pushes and PRs are blocked unless the dashboard shows ALL GREEN status.

- Playwright test fails on any non-green status indicator.
- Headless mode: no manual browser required.
- [CI config](.github/workflows/dashboard-green.yml) enforces this check.

```bash
yarn test:dashboard  # (manual, local check)
```

You must visually confirm green-state after each release or major update.
Contact an admin if this check is ever bypassed.

### Playwright Headless Testing Setup

The project includes automated Playwright testing for dashboard validation:

#### Installation

```bash
# Install Playwright and dependencies
yarn add --dev playwright @playwright/test
yarn playwright install --with-deps
```

#### Configuration

- **Headless by default**: Optimized for CI/CD environments
- **No retries**: Immediate failure on non-green status
- **60s timeout**: Suitable for dashboard loading
- **Environment configurable**: Custom dashboard URLs via `DASHBOARD_URL`

#### Test Structure

```javascript
// tests/dashboard/all-green.test.js
test("Dashboard must be all green", async ({ page }) => {
  await page.goto(DASHBOARD_URL, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector(".status-indicator", { timeout: 15000 });
  const statuses = await page.$$eval(".status-indicator", (els) =>
    els.map((e) => e.className),
  );
  statuses.forEach((cls, idx) => {
    expect(cls).toContain("status-ok");
  });
});
```

#### Usage

```bash
# Run headless dashboard validation
yarn test:dashboard

# Run with custom dashboard URL
DASHBOARD_URL=https://your-url yarn test:dashboard

# Run with headed browser for debugging
yarn playwright test tests/dashboard/all-green.test.js --headed
```

### Dashboard Green-State E2E Check

Run Playwright in headless mode to fail the build if ANY block is not green:

```bash
yarn test:dashboard
# or with custom dashboard URL:
DASHBOARD_URL=https://your-url yarn test:dashboard
```

The test will fail if any `.status-indicator` is not green (status-ok).

- Works headless by default (in CI/CD and local)
- Can be run in interactive mode via Playwright CLI if needed

## Available Scripts

- `yarn test:dashboard` - Run Playwright dashboard green-state validation
- `yarn lint:fix` - Fix ESLint issues
- `yarn lint:scripts` - Lint script files
- `yarn lint:server` - Lint server files

## Project Structure

- `tests/dashboard/` - Playwright E2E tests for dashboard validation
- `dashboard/` - Dashboard application files
- `scripts/` - Utility and automation scripts
- `gpt_cursor_runner/` - Main Python application
- `patches/` - Patch files for automation
- `summaries/` - Execution summaries and logs

## Non-Blocking Command Pattern (CI/CD + Local)

- **Bash/Zsh:**
  ```bash
  timeout 60s your_command_here & disown
  ```
- **PowerShell:**
  ```powershell
  $job = Start-Job -ScriptBlock { your_command_here }
  Start-Sleep -Seconds 60
  Stop-Job $job -Force
  ```
- Always tail logs if async:
  ```bash
  timeout 60s tail -f yourlog.log & disown
  ```

All daemons, launchers, and test scripts must use these patterns—never launch a process blocking the shell or main job runner.
**CI/CD pipeline will fail if any command blocks, hangs, or exceeds timeout.**

## NB 2.0 Non-Blocking Pattern Enforcement

### **CRITICAL: Never Block Cursor Terminal**

All terminal commands in agent chat MUST use non-blocking patterns to prevent:
- Cursor UI freezing
- GPT flow interruption
- Agent chat hanging
- User experience degradation

### **MANDATORY NON-BLOCKING PATTERN**

**Standard Non-Blocking Command Structure**
```bash
./scripts/nb-safe-detach.sh <label> 18s bash -lc '<ABSOLUTE_COMMAND>'
```

### **Writer vs Mirrors Policy**

- **WRITER (Authoritative):** `/Users/sawyer/gitSync/.cursor-cache/{CYOPS|MAIN}/artifacts/`
- **DOCS MIRROR (Publish):** `/Users/sawyer/gitSync/_GPTsync/__{CYOPS|MAIN}-SYNC__/`
- **STATUS MIRROR (Publish):** `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/`
  - Mirrors are publish-only; all authoring happens in WRITER
  - Public status is small JSON "lights" only

### **Enforcement**

- **Zero Tolerance**: No exceptions for non-blocking pattern
- **CI Hard-Block**: Build fails if any command blocks or hangs
- **Agent Responsibility**: All agents MUST follow nb-safe-detach pattern
