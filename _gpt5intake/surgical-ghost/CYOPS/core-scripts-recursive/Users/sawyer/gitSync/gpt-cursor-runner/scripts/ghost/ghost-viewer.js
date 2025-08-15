#!/usr/bin/env node

const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.GHOST_VIEWER_PORT || 3003;
const ROOT = "/Users/sawyer/gitSync/.cursor-cache/";

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "ghost-viewer",
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

app.get("/viewer", (req, res) => {
  const zone = (req.query.zone || "CYOPS").toUpperCase();
  const summariesPath = path.join(ROOT, zone, "summaries");
  try {
    const files = fs.existsSync(summariesPath)
      ? fs.readdirSync(summariesPath)
      : [];
    const items = files
      .filter((f) => f.endsWith(".md"))
      .map(
        (f) =>
          `<li><a href="/viewer/file?zone=${zone}&file=${encodeURIComponent(f)}">${f}</a></li>`,
      )
      .join("");
    res.send(
      `<html><body><h2>${zone} Summaries</h2><ul>${items}</ul></body></html>`,
    );
  } catch (_e) {
    res.status(500).send("Error reading summaries.");
  }
});

app.get("/viewer/file", (req, res) => {
  const zone = (req.query.zone || "CYOPS").toUpperCase();
  const file = req.query.file;
  if (!file) return res.status(400).send("file required");
  const filePath = path.join(ROOT, zone, "summaries", file);
  try {
    const content = fs.readFileSync(filePath, "utf8");
    res.type("html").send(`<pre>${content.replace(/</g, "&lt;")}</pre>`);
  } catch (_e) {
    res.status(404).send("Not found");
  }
});

app.listen(PORT, () => {
  console.log(`[GHOST-VIEWER] listening on http://localhost:${PORT}`);
});
