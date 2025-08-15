#!/usr/bin/env node
"use strict";
// tail-log.js: TTL-bounded, safe tail helper with line limits and status files
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

let file = "";
let lines = 1000;
let ttl = "5m";
let label = `tail-${Date.now()}`;
let logFile = "";
let statusDir = "validations/status";
let cwd = process.cwd();

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--file") file = args[++i];
  else if (a === "--lines") lines = parseInt(args[++i] || "1000", 10) || 1000;
  else if (a === "--ttl") ttl = args[++i];
  else if (a === "--label") label = args[++i];
  else if (a === "--log") logFile = args[++i];
  else if (a === "--status") statusDir = args[++i];
  else if (a === "--cwd") cwd = args[++i];
}

if (!file) {
  console.error(
    "Usage: tail-log.js --file /path/to/log [--lines 1000] [--ttl 2m] [--label name] [--log out.log] [--status validations/status]",
  );
  process.exit(2);
}

const absStatus = path.isAbsolute(statusDir)
  ? statusDir
  : path.join(cwd, statusDir);
fs.mkdirSync(absStatus, { recursive: true });
const startedFile = path.join(absStatus, `${label}.tail.started`);
const doneFile = path.join(absStatus, `${label}.tail.done`);
const codeFile = path.join(absStatus, `${label}.tail.exitcode`);
fs.writeFileSync(startedFile, new Date().toISOString());

const redirect = logFile ? `>> ${JSON.stringify(logFile)} 2>&1` : "";
const safeLines = Math.max(1, Math.min(10000, lines));
const shellLine = [
  `timeout --kill-after=10s ${ttl} tail -n ${safeLines} -F ${JSON.stringify(file)} ${redirect}`,
  "code=$?",
  `echo $code > ${JSON.stringify(codeFile)}`,
  `date +%FT%T%z > ${JSON.stringify(doneFile)}`,
].join(" && ");

const child = spawn("/bin/zsh", ["-lc", shellLine], {
  cwd,
  detached: true,
  stdio: "ignore",
});
child.unref();
process.exit(0);
