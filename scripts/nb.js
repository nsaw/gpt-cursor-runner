#!/usr/bin/env node
"use strict";
// nb.js: Non-blocking, TTL-bounded runner via /bin/zsh -lc
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const args = process.argv.slice(2);
let cwd = process.cwd();
let ttl = "20m";
let label = `task-${Date.now()}`;
let logFile = "validations/logs/task.log";
let statusDir = "validations/status";
let nice = "";
const envPairs = [];
const envFiles = [];
const sep = args.indexOf("--");
const flags = sep === -1 ? args : args.slice(0, sep);
const cmdParts = sep === -1 ? [] : args.slice(sep + 1);
for (let i = 0; i < flags.length; i++) {
  const a = flags[i];
  if (a === "--cwd") cwd = flags[++i];
  else if (a === "--ttl") ttl = flags[++i];
  else if (a === "--label") label = flags[++i];
  else if (a === "--log") logFile = flags[++i];
  else if (a === "--status") statusDir = flags[++i];
  else if (a === "--nice") nice = flags[++i];
  else if (a === "--env") envPairs.push(flags[++i]);
  else if (a === "--env-file") envFiles.push(flags[++i]);
}
if (!cmdParts.length) {
  console.error(
    "Usage: nb.js [--cwd DIR] [--ttl 30s|5m|1h] [--label NAME] [--log FILE] [--status DIR] [--nice N] [--env K=V]* [--env-file FILE]* -- <command ...>",
  );
  process.exit(2);
}
const absLog = path.isAbsolute(logFile) ? logFile : path.join(cwd, logFile);
const absStatus = path.isAbsolute(statusDir)
  ? statusDir
  : path.join(cwd, statusDir);
fs.mkdirSync(path.dirname(absLog), { recursive: true });
fs.mkdirSync(absStatus, { recursive: true });
const startedFile = path.join(absStatus, `${label}.started`);
const doneFile = path.join(absStatus, `${label}.done`);
const codeFile = path.join(absStatus, `${label}.exitcode`);
fs.writeFileSync(startedFile, new Date().toISOString());
const exportsStr = [];
for (const p of envPairs) {
  const [k, ...rest] = p.split("=");
  const v = rest.join("=");
  exportsStr.push(`export ${k}=${JSON.stringify(v)}`);
}
for (const f of envFiles) {
  exportsStr.push(
    `[ -f ${JSON.stringify(f)} ] && source ${JSON.stringify(f)} || true`,
  );
}
const cmd = cmdParts.join(" ");
const nicePart = nice ? `nice -n ${nice} ` : "";
const shellLine = [
  exportsStr.join(" && "),
  `mkdir -p ${JSON.stringify(absStatus)} ${JSON.stringify(path.dirname(absLog))}`,
  `(${nicePart}timeout --kill-after=10s ${ttl} ${cmd}) >> ${JSON.stringify(absLog)} 2>&1`,
  "code=$?",
  `echo $code > ${JSON.stringify(codeFile)}`,
  `date +%FT%T%z > ${JSON.stringify(doneFile)}`,
]
  .filter(Boolean)
  .join(" && ");
const child = spawn("/bin/zsh", ["-lc", shellLine], {
  cwd,
  detached: true,
  stdio: "ignore",
});
child.unref();
process.exit(0);
