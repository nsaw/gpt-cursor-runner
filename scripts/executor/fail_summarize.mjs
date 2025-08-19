import { promises as fsp } from "fs";
import fs from "fs";
import path from "path";

const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const FAILED = path.join(
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
  ".failed",
);
const SUMS = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";
const LOGS = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs";
const now = () => new Date().toISOString();

async function ensureSummaries() {
  await fsp.mkdir(SUMS, { recursive: true });
  const items = await fsp.readdir(FAILED).catch(() => []);
  for (const n of items) {
    if (!n.startsWith("patch-") || !n.endsWith(".json")) continue;
    const base = n.replace(/\.json$/, "");
    const sumName = `summary-${base}.md`;
    const sumPath = path.join(SUMS, sumName);
    if (fs.existsSync(sumPath)) continue;

    // Try to include last executor log lines if available
    let tail = "";
    const execLog = path.join(LOGS, "patch-executor.log");
    if (fs.existsSync(execLog)) {
      const s = fs.readFileSync(execLog, "utf8");
      tail = s.split("\n").slice(-80).join("\n");
    }

    const body = [
      `# ${base} — FAILED`,
      `_ts: ${now()}_`,
      "",
      "## Cause (best-effort)",
      "- Executor-level failure. Common cause: missing dependencies or invalid shell step.",
      "",
      "## Hints",
      "- Check dependency scan report: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/meta/P1.depcheck.json`",
      "- Verify referenced source files exist inside P1.",
      "",
      "## Executor Log Tail (last 80 lines, best-effort)",
      "```",
      tail,
      "```",
      "",
    ].join("\n");

    await fsp.writeFile(sumPath, body);
  }
}

ensureSummaries().catch((e) => {
  console.error(e);
  process.exit(2);
});
