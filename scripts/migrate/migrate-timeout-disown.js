#!/usr/bin/env node
"use strict";
/**
 * migrate-timeout-disown.js
 * Repo-wide, idempotent migration of brittle patterns like:
 *   { timeout 15s pm2 save & } >/dev/null 2>&1 & disown
 * …to nb.js invocations:
 *   node scripts/nb.js --ttl 15s --label pm2-save --log validations/logs/pm2-save.log --status validations/status -- pm2 save
 *
 * Defaults: ttl=30s if unspecified; labels derived from first non-env token.
 * Skips docs by default. Creates .bak on first change.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const root = process.argv.includes("--root")
  ? process.argv[process.argv.indexOf("--root") + 1]
  : process.cwd();
const apply = process.argv.includes("--apply");
const includeDocs = process.argv.includes("--include-docs");
const ttlDefault = process.argv.includes("--ttl-default")
  ? process.argv[process.argv.indexOf("--ttl-default") + 1]
  : "30s";
const includeArgIdx = process.argv.indexOf("--include");
const includeList =
  includeArgIdx !== -1
    ? process.argv[includeArgIdx + 1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
const exts = new Set([".sh", ".zsh", ".bash", ".env", ".service"]);
const docExts = new Set([".md", ".mdx"]);
const ignoreNames = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".expo",
  ".next",
  "ios",
  "android",
  "_backups",
  ".cursor-cache",
]);
const results = {
  scanned: 0,
  changed: 0,
  files: [],
  skippedDocs: 0,
  skippedAlreadyNB: 0,
};
const NB_CALL_RE = /scripts\/nb\.js/;
// Permissive matcher: any line with timeout/gtimeout and disown; captures TTL and the command-ish tail.
const LINE_RE =
  /(?<pre>.*?)(?<tbin>\bg?timeout\b)\s+(?:(?<kill>--kill-after=\S+)\s+)?(?<ttl>\d+[smhd]?)\s+(?<cmd>[^\n]*?)(?:\s*[;&|].*)?\s*(?:&)?\s*disown\b/;
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoreNames.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (includeList.length) {
        // If include filters exist, only descend into matching roots and their children
        const rel = path.relative(root, p);
        const top = rel.split(path.sep)[0];
        if (includeList.some((x) => top.startsWith(x) || rel.startsWith(x)))
          walk(p);
        else continue;
      } else {
        walk(p);
      }
      continue;
    }
    const ext = path.extname(ent.name).toLowerCase();
    const isDoc = docExts.has(ext);
    const isCode = exts.has(ext);
    if (!(isCode || (includeDocs && isDoc))) continue;
    const text = fs.readFileSync(p, "utf8");
    if (NB_CALL_RE.test(text)) {
      results.skippedAlreadyNB++;
    }
    const lines = text.split(/\r?\n/);
    let mutated = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!/disown/.test(line) || !/timeout/.test(line)) continue;
      const m = line.match(LINE_RE);
      if (!m) continue;
      const ttl = (m.groups.ttl || ttlDefault).trim();
      // Try to extract first command token (skip env assignments)
      const tail = (m.groups.cmd || "").trim().replace(/[\s;&|]*$/, "");
      const tokens = tail.split(/\s+/).filter(Boolean);
      let first = tokens.find(
        (t) => !t.includes("=") && !t.startsWith('"') && !t.startsWith("'"),
      );
      if (!first) first = "task";
      const label =
        first
          .replace(/[^a-zA-Z0-9._-]+/g, "-")
          .replace(/^[-_.]+|[-_.]+$/g, "") || "task";
      const log = `validations/logs/${label}.log`;
      const status = "validations/status";
      const replacement = `node scripts/nb.js --ttl ${ttl} --label ${label} --log ${log} --status ${status} -- ${tail}`;
      // Preserve original as a comment if shell file; for docs, rewrite code fences lightly.
      if (isCode) {
        const comment = line.trim().startsWith("#")
          ? ""
          : `# MIGRATED: ${line.trim()}`;
        lines[i] = comment ? `${comment}\n${replacement}` : replacement;
      } else {
        lines[i] = replacement;
      }
      mutated = true;
    }
    results.scanned++;
    if (mutated) {
      results.changed++;
      results.files.push(p);
      if (apply) {
        const bak = `${p}.bak`;
        if (!fs.existsSync(bak)) fs.copyFileSync(p, bak);
        fs.writeFileSync(p, lines.join("\n"), "utf8");
      }
    }
  }
}
walk(root);
const outDir = path.join(root, "validations");
fs.mkdirSync(outDir, { recursive: true });
const report = {
  root,
  ttlDefault,
  apply,
  includeDocs,
  includeList,
  ...results,
  ts: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(outDir, "migrate-nb-report.json"),
  JSON.stringify(report, null, 2),
);
fs.writeFileSync(
  path.join(outDir, "migrate-nb-report.md"),
  [
    "# nb.js Migration Report",
    `root: ${root}`,
    `apply: ${apply}`,
    `ttlDefault: ${ttlDefault}`,
    `include: ${includeList.join(",") || "(all)"}`,
    `changed files: ${results.changed}`,
    "",
    ...results.files.slice(0, 200).map((f) => `- ${f}`),
  ].join("\n"),
);
console.log(
  `[nb-migrate] scanned=${results.scanned} changed=${results.changed} apply=${apply} includeDocs=${includeDocs}`,
);
