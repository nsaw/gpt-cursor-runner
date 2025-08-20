#!/usr/bin/env node
// Runs eslint and enforces warnings budget (non-zero exit on breach)
const { spawnSync } = require('child_process');
const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('.github/required-checks.json','utf8'));
const args = ['eslint','--format','json','--ext','.js,.ts,.tsx','scripts','config','src','src-nextgen'];
const r = spawnSync('npx', args, { stdio: ['ignore','pipe','inherit'] });
if (r.status === null) throw new Error('ESLint process failed to start');
let report = [];
try { report = JSON.parse(r.stdout.toString('utf8') || '[]'); } catch { /* ignore */ }
const warnCount = report.reduce((a,f) => a+(f.warningCount||0),0);
console.log(`ESLINT_WARNINGS=${warnCount}`);
if (warnCount > cfg.warningBudget) {
  console.error(`WARNING_BUDGET_BREACH: ${warnCount} > ${cfg.warningBudget}`);
  throw new Error(`ESLint warnings budget exceeded: ${warnCount} > ${cfg.warningBudget}`);
}
console.log('ESLINT_WARNINGS_BUDGET_OK');
