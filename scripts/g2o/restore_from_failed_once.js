#!/usr/bin/env node
const fs = require('fs'), p = require('path');
const ROOT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const FAILED = p.join(ROOT,".failed");
const P1 = p.join(ROOT,"G2o","P1");
const name = process.argv[2];
if (!name) { console.log("USAGE: restore_from_failed_once.js <patch-file.json>"); process.exit(2); }
const src = p.join(FAILED, name);
const dst = p.join(P1, name.replace(/\.json(\.hold)?$/i, ".json"));
try {
  fs.mkdirSync(P1, { recursive: true });
  if (!fs.existsSync(src)) { console.log("NO_FAILED_SRC"); process.exit(0); }
  fs.writeFileSync(dst, fs.readFileSync(src));
  try { fs.unlinkSync(src); } catch {}
  console.log("RESTORED_TO_P1:"+dst);
} catch (e) {
  console.log("RESTORE_ERROR:"+e.message);
  process.exit(2);
}
