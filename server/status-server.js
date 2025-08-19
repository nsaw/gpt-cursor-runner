// ghost status JSON endpoint
const express = require("express");
const fs = require("fs");
const app = express();
const PORT = 3222;

app.get("/status.json", (req, res) => {
  const logPath =
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_ghost-tunnel-health.log";
  const tunnel = fs.existsSync(logPath)
    ? fs.readFileSync(logPath, "utf8").split("\n").slice(-3).join("\n")
    : "❌ Log missing";
  const status = {
    tunnel: tunnel.includes("✅") ? "✅" : "❌",
    summaryMonitor: !!process.env.SUMMARY_MONITOR_RUNNING,
    patchExecutor: !!process.env.PATCH_EXECUTOR_RUNNING,
    ghostBridge: !!process.env.***REMOVED***_BRIDGE_RUNNING,
    realtimeMonitor: !!process.env.REALTIME_MONITOR_RUNNING,
    timestamp: new Date().toISOString(),
  };
  res.json(status);
});

app.get("/ghost-status.json", (req, res) => {
  const logPath =
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_ghost-tunnel-health.log";
  const tunnel = fs.existsSync(logPath)
    ? fs.readFileSync(logPath, "utf8").split("\n").slice(-3).join("\n")
    : "❌ Log missing";
  const status = {
    tunnel: tunnel.includes("✅") ? "✅" : "❌",
    summaryMonitor: !!process.env.SUMMARY_MONITOR_RUNNING,
    patchExecutor: !!process.env.PATCH_EXECUTOR_RUNNING,
    ghostBridge: !!process.env.***REMOVED***_BRIDGE_RUNNING,
    realtimeMonitor: !!process.env.REALTIME_MONITOR_RUNNING,
    timestamp: new Date().toISOString(),
  };
  res.json(status);
});

app.listen(PORT, () => console.log(`🔭 Status server running on :${PORT}`));
