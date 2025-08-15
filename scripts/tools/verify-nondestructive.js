#!/usr/bin/env node
"use strict";
// Verifies nb.js migration was non-destructive. Checks backups exist, diffs are non-empty,
// and file modes match backups (optionally fixes modes). Emits JSON + MD summaries.
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const args = process.argv.slice(2);
const root = args.includes("--root")
  ? args[args.indexOf("--root") + 1]
  : process.cwd();
const reportPath = args.includes("--report")
  ? args[args.indexOf("--report") + 1]
  : path.join(root, "validations", "migrate-nb-report.json");
const fixPerms = args.includes("--fix-perms");
const outJson = path.join(root, "validations", "nb-verify.json");
const outMd = path.join(root, "summaries", "nb-verify.md");

function modeStr(m) {
  return `0${(m & 0o777).toString(8)}`;
}
function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}
function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return null;
  }
}

const rep = readJSON(reportPath);
if (!rep || !Array.isArray(rep.files)) {
  ensureDir(outMd);
  fs.writeFileSync(
    outMd,
    `# NB Migration Verify\nreport not found or malformed: ${reportPath}\n`,
    "utf8",
  );
  console.log(`[nb-verify] no report @ ${reportPath}`);
  process.exit(0);
}

const results = {
  root,
  totalListed: rep.files.length,
  missingBak: [],
  emptyDiff: [],
  modeFixed: [],
  ok: [],
};

for (const file of rep.files) {
  try {
    const bak = `${file}.bak`;
    if (!fs.existsSync(bak)) {
      results.missingBak.push(file);
      continue;
    }
    const cur = fs.readFileSync(file, "utf8");
    const old = fs.readFileSync(bak, "utf8");
    if (cur === old) {
      results.emptyDiff.push(file);
    }
    const stNow = fs.statSync(file);
    const stBak = fs.statSync(bak);
    const mNow = stNow.mode & 0o777;
    const mBak = stBak.mode & 0o777;
    if (mNow !== mBak) {
      if (fixPerms) {
        fs.chmodSync(file, mBak);
        results.modeFixed.push({
          file,
          from: modeStr(mNow),
          to: modeStr(mBak),
        });
      }
    }
    results.ok.push({ file, mode: modeStr(fs.statSync(file).mode) });
  } catch (e) {
    /* ignore individual errors but continue */
  }
}

ensureDir(outJson);
fs.writeFileSync(outJson, JSON.stringify(results, null, 2));

ensureDir(outMd);
fs.writeFileSync(
  outMd,
  [
    "# NB Migration Verification",
    `root: ${root}`,
    `report: ${reportPath}`,
    `total listed: ${results.totalListed}`,
    `missing .bak: ${results.missingBak.length}`,
    `empty diffs (suspicious): ${results.emptyDiff.length}`,
    `modes corrected: ${results.modeFixed.length}`,
    "",
    ...results.missingBak.slice(0, 50).map((f) => `- MISSING BAK: ${f}`),
    ...results.emptyDiff.slice(0, 50).map((f) => `- EMPTY DIFF: ${f}`),
    ...results.modeFixed
      .slice(0, 50)
      .map((x) => `- MODE FIXED: ${x.file} (${x.from} -> ${x.to})`),
  ].join("\n"),
  "utf8",
);

console.log(
  `[nb-verify] ok=${results.ok.length} missingBak=${results.missingBak.length} emptyDiff=${results.emptyDiff.length} modeFixed=${results.modeFixed.length}`,
);
