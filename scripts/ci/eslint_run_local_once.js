/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const BIN = "/Users/sawyer/gitSync/gpt-cursor-runner/node_modules/eslint/bin/eslint.js";
if (!fs.existsSync(BIN)) { console.error("[eslint-run-local] missing bin:", BIN); process.exit(2); }
const args = [BIN, "--no-ignore", ...process.argv.slice(2)];
const p = spawn(process.execPath, args, { cwd: ROOT, stdio: "inherit" });
const t = setTimeout(()=>{ try{ p.kill("SIGKILL"); }catch(_){} process.exit(124); }, 900000);
p.on('exit', c=>{ clearTimeout(t); process.exit(c ?? 1); });
