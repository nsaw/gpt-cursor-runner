#!/usr/bin/env node
"use strict";
// Rolls back files listed in migrate-nb-report.json by restoring <file>.bak -> <file>.
// Default keeps .bak; pass --delete-bak to remove backups after restore.
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
const root = args.includes("--root")
  ? args[args.indexOf("--root") + 1]
  : process.cwd();
const reportPath = args.includes("--report")
  ? args[args.indexOf("--report") + 1]
  : path.join(root, "validations", "migrate-nb-report.json");
const deleteBak = args.includes("--delete-bak");

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return null;
  }
}
const rep = readJSON(reportPath);
if (!rep || !Array.isArray(rep.files)) {
  console.error(`[rollback] malformed or missing report: ${reportPath}`);
  process.exit(2);
}
let restored = 0,
  missing = 0;
for (const file of rep.files) {
  const bak = `${file}.bak`;
  if (!fs.existsSync(bak)) {
    missing++;
    continue;
  }
  const mode = fs.statSync(bak).mode & 0o777;
  fs.copyFileSync(bak, file);
  fs.chmodSync(file, mode);
  if (deleteBak) {
    try {
      fs.unlinkSync(bak);
    } catch (_) {}
  }
  restored++;
}
console.log(
  `[rollback] restored=${restored} missingBak=${missing} deleteBak=${deleteBak}`,
);
