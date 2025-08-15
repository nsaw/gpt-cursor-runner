// Queue stall validator
const fs = require("fs");
const path = require("path");
const logFile = path.resolve(__dirname, "../../logs/watchdog-patch-queue.log");
const summariesPath = path.resolve(__dirname, "../../summaries");
const patchesPath = path.resolve(__dirname, "../../tasks/patches");

function getFileTimes(dir) {
  return fs.readdirSync(dir).map((name) => {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    return { name, mtime: stat.mtime };
  });
}

function checkQueueHealth() {
  const patchFiles = getFileTimes(patchesPath).filter((f) =>
    f.name.endsWith(".json"),
  );
  const summaryFiles = getFileTimes(summariesPath).filter((f) =>
    f.name.endsWith(".md"),
  );
  const recentSummary = summaryFiles.sort((a, b) => b.mtime - a.mtime)[0];
  const stalePatches = patchFiles.filter(
    (p) => Date.now() - p.mtime > 15 * 60 * 1000,
  );

  if (stalePatches.length > 0) {
    fs.appendFileSync(
      logFile,
      `\n[${new Date().toISOString()}] [WARN] Stale patch queue: ${stalePatches.length} old patches\n`,
    );
  }
  if (recentSummary && Date.now() - recentSummary.mtime > 10 * 60 * 1000) {
    fs.appendFileSync(
      logFile,
      `\n[${new Date().toISOString()}] [WARN] No recent summary written in over 10 minutes.\n`,
    );
  }
}

setInterval(checkQueueHealth, 60000);
