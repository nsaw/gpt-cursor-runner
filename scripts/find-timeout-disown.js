#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const root = process.argv[2] || process.cwd();
const out =
  process.argv[3] || path.join(root, "validations", "migration-report.md");
const ignore = new Set([
  "node_modules",
  ".git",
  "build",
  "dist",
  ".expo",
  ".next",
  "ios",
  "android",
]);
const hits = [];
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) {
      if (ent.name === ".maestro") {
      } else if (ent.name === ".github") {
      } else {
        continue;
      }
    }
    if (ignore.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else {
      const ext = path.extname(ent.name);
      if (
        ![
          ".js",
          ".ts",
          ".tsx",
          ".json",
          ".md",
          ".sh",
          ".zsh",
          ".yaml",
          ".yml",
        ].includes(ext)
      )
        continue;
      const text = fs.readFileSync(p, "utf8");
      const lines = text.split(/\r?\n/);
      lines.forEach((line, idx) => {
        if (/timeout\s+[^\n]*?&\s*disown/.test(line)) {
          hits.push({ file: p, line: idx + 1, code: line.trim() });
        }
      });
    }
  }
}
walk(root);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(
  out,
  [
    "# Timeout+disown occurrences",
    "",
    `Root: ${root}`,
    "",
    ...hits.map((h) => `- ${h.file}:${h.line}: ${`\`${h.code}\``}`),
  ].join("\n"),
);
console.log(`Wrote report: ${out} (hits=${hits.length})`);
