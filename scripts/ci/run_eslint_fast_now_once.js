#!/usr/bin/env node
// run_eslint_fast_now_once.js
// Runs ESLint for the allowlist scope with a hard time budget, dumping JSON + stdio logs.
// Usage: run_eslint_fast_now_once.js <budget_ms> <json_out> <stdout_log> <stderr_log>
const { spawn } = require('child_process');
const fs = require('fs'), path = require('path');
const [,, budgetArg, jsonOut, outLog, errLog] = process.argv;
const budget = Number(budgetArg || 120000);
if (!jsonOut || !outLog || !errLog) {
  console.error("Usage: run_eslint_fast_now_once.js <budget_ms> <json_out> <stdout_log> <stderr_log>");
  process.exit(2);
}
fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
fs.mkdirSync(path.dirname(outLog), { recursive: true });
fs.mkdirSync(path.dirname(errLog), { recursive: true });
const outFD = fs.openSync(outLog,'a'), errFD = fs.openSync(errLog,'a');

// Allowlist scope (tight):
const globs = [
  "scripts/g2o/**/*.{js,ts,tsx}",
  "scripts/ci/**/*.{js,ts,tsx}",
  "scripts/metrics/**/*.{js,ts,tsx}",
  "scripts/validate/**/*.{js,ts,tsx}",
  "config/**/*.{js,ts,tsx}",
];

// Programmatic call to local ESLint binary via Node.
const args = [
  "--format","json",
  "--output-file", jsonOut,
  "--max-warnings","1000000", // we will evaluate gate separately; capture all
  ...globs
];

const child = spawn(process.execPath, [path.join(__dirname, '../../node_modules/.bin/eslint'), ...args], {
  cwd: process.cwd(),
  stdio: ['ignore', outFD, errFD]
});

const timer = setTimeout(() => {
  try { process.kill(child.pid, 'SIGTERM'); } catch {}
}, budget);

child.on('exit', (code) => {
  clearTimeout(timer);
  // Exit 0 if we produced JSON; otherwise propagate code.
  const ok = fs.existsSync(jsonOut);
  process.exit(ok ? 0 : (code ?? 1));
});
