#!/usr/bin/env node
const express = require("express");
const os = require("os");

const app = express();

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "telemetry-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/metrics", (_req, res) => {
  res.json({
    loadavg: os.loadavg(),
    freemem: os.freemem(),
    uptime: os.uptime(),
  });
});

app.get("/components", (_req, res) => {
  res.json({ components: [] });
});

const PORT = process.env.PORT || 8788;
app.listen(PORT, () => {
  console.log(`[telemetry-api] listening on http://localhost:${PORT}`);
});
