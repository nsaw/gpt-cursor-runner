#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any, require-await, @typescript-eslint/no-unused-vars */
// run_eslint_fast_now_once.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const [,, budgetArg, jsonOut, outLog, errLog, ...globs] = process.argv;
const budget = Number(budgetArg || 120000);

if (!jsonOut || !outLog || !errLog) {
  console.error('Usage: run_eslint_fast_now_once.js <budget_ms> <json_out> <stdout_log> <stderr_log> [globs...]');
  // eslint-disable-next-line no-process-exit
  process.exit(2);
}

const ensure = p => fs.mkdirSync(path.dirname(p), { recursive: true });
ensure(jsonOut);
ensure(outLog);
ensure(errLog);

const outFD = fs.openSync(outLog, 'a');
const errFD = fs.openSync(errLog, 'a');

const scope = globs.length ? globs : [
  'scripts/g2o/**/*.{js,ts,tsx}',
  'scripts/ci/**/*.{js,ts,tsx}',
  'scripts/metrics/**/*.{js,ts,tsx}',
  'scripts/validate/**/*.{js,ts,tsx}',
  'config/**/*.{js,ts,tsx}'
];

// Use npx to find the correct ESLint binary
const eslintBin = 'npx';
const eslintArgs = ['eslint', '--format=json', '--ext=.js,.ts,.tsx', ...scope];

const child = spawn(eslintBin, eslintArgs, {
  stdio: ['ignore', 'pipe', 'pipe'],
  cwd: process.cwd()
});

let stdout = '';

child.stdout.on('data', data => {
  stdout += data.toString();
  fs.writeSync(outFD, data);
});

child.stderr.on('data', data => {
  fs.writeSync(errFD, data);
});

const timeout = setTimeout(() => {
  child.kill('SIGTERM');
  fs.writeSync(errFD, `\n[ERROR] ESLint timed out after ${budget}ms\n`);
}, budget);

child.on('close', code => {
  clearTimeout(timeout);
  fs.closeSync(outFD);
  fs.closeSync(errFD);

  try {
    const results = JSON.parse(stdout);
    fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2));
    console.log(`ESLint completed with exit code ${code}`);
  } catch (e) {
    fs.writeFileSync(jsonOut, JSON.stringify([], null, 2));
    console.error(`Failed to parse ESLint output: ${e.message}`);
  }
});
