#!/usr/bin/env node
// eslint_fix_marathon_runner_once.js — auto-fix marathon (report → fix → report) until gate passes
const fs = require('fs'),
  { spawnSync } = require('child_process'),
  path = require('path');
const [
  ,
  ,
  passBudget,
  intervalMs,
  maxMs,
  jsonOut,
  outLog,
  errLog,
  stateFile,
  hotspotsScript,
  hotspotsOut,
  ...globs
] = process.argv;
const B = Number(passBudget || 120000),
  I = Number(intervalMs || 15000),
  M = Number(maxMs || 5400000);
const started = Date.now();
let pass = 0;

// Fix: Replace Atomics.wait with proper sleep function
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const update = (s) =>
  fs.writeFileSync(
    stateFile,
    JSON.stringify({ ...s, ts: new Date().toISOString() }, null, 2),
  );

const lint = () =>
  spawnSync(
    process.execPath,
    [
      path.resolve(__dirname, 'run_eslint_fast_now_once.js'),
      String(B),
      jsonOut,
      outLog,
      errLog,
      ...globs,
    ],
    { stdio: 'inherit' },
  ).status ?? 1;
const fix = () =>
  spawnSync('npx', ['eslint', '--fix', '--ext=.js,.ts,.tsx', ...globs], {
    stdio: 'inherit',
  }).status ?? 1;

// Helper function to parse ESLint results
const parseEslintResults = () => {
  let errors = 1,
    warnings = 999999;
  try {
    const data = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
    errors = 0;
    warnings = 0;
    for (const x of data) {
      errors += x.errorCount || 0;
      warnings += x.warningCount || 0;
    }
  } catch {
    /* ignore parse errors */
  }
  return { errors, warnings };
};

// Helper function to run hotspots analysis
const runHotspots = () => {
  spawnSync(process.execPath, [hotspotsScript, jsonOut, hotspotsOut, '25'], {
    stdio: 'ignore',
  });
};

// Helper function to perform one marathon iteration
const runMarathonIteration = async () => {
  pass++;
  lint();
  const { errors, warnings } = parseEslintResults();
  runHotspots();

  const ok = errors === 0 && warnings < 20;
  update({
    ok,
    pass,
    phase: 'post-lint',
    errors,
    warnings,
    elapsed_ms: Date.now() - started,
    report: jsonOut,
    hotspots: hotspotsOut,
  });

  if (ok) return false; // Stop
  if (Date.now() - started > M) return false; // Stop

  // attempt auto-fix and re-check
  fix();
  lint();
  const { errors: errorsAfterFix, warnings: warningsAfterFix } =
    parseEslintResults();
  runHotspots();

  update({
    ok: errorsAfterFix === 0 && warningsAfterFix < 20,
    pass,
    phase: 'post-fix',
    errors: errorsAfterFix,
    warnings: warningsAfterFix,
    elapsed_ms: Date.now() - started,
  });

  if (errorsAfterFix === 0 && warningsAfterFix < 20) return false; // Stop
  if (Date.now() - started > M) return false; // Stop

  // Fix: Use proper sleep instead of Atomics.wait
  await sleep(Number.isFinite(I) ? I : 15000);
  return true; // Continue
};

// Main marathon loop with reduced complexity
(async () => {
  while (await runMarathonIteration()) {
    // Continue loop
  }
})();
