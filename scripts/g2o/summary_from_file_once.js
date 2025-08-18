#!/usr/bin/env node
// summary_from_file_once.js — direct Node; writes dual summaries from a content file.
// Usage: summary_from_file_once.js <patchId> <contentFile> <cyopsDir> <mainDir>
const fs = require("fs"), path = require("path");
const [,, patchId, contentFile, cyopsDir, mainDir] = process.argv;
if (!patchId || !contentFile || !cyopsDir || !mainDir) {
  console.error("Usage: summary_from_file_once.js <patchId> <contentFile> <cyopsDir> <mainDir>");
  process.exit(2);
}
const content = fs.readFileSync(contentFile, "utf8");
const name = `summary-${patchId}.md`;
for (const dir of [cyopsDir, mainDir]) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), content);
}
console.log(JSON.stringify({ ok:true, written:[path.join(cyopsDir,name), path.join(mainDir,name)] }, null, 2));