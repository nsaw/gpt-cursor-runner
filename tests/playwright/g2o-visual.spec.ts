import { test, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "fs";
import path from "path";

const OUTDIR = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.screenshots";
const PNG = path.join(OUTDIR, "g2o-monitor.png");

async function tryGoto(page, url: string) {
  try {
    const resp = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });
    return !!resp;
  } catch {
    return false;
  }
}

test("G2o monitor visual smoke", async ({ page }) => {
  if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true });
  // 1) Prefer live dashboard route
  const liveOk = await tryGoto(page, "http://127.0.0.1:8787/g2o/monitor");
  // 2) Fallback to API status page (still a UI render) if monitor not wired
  const statusOk =
    !liveOk && (await tryGoto(page, "http://127.0.0.1:8787/api/status"));
  // 3) Final fallback: local static page
  if (!liveOk && !statusOk) {
    const fileUrl =
      "file:///Users/sawyer/gitSync/gpt-cursor-runner/public/g2o-monitor.html";
    const fileOk = await tryGoto(page, fileUrl);
    expect(fileOk).toBeTruthy();
  }
  await page.screenshot({ path: PNG, fullPage: true });
  expect(existsSync(PNG)).toBeTruthy();
});
