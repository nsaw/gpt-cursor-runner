#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const dir = 'summaries';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const now = new Date().toISOString();
const metricsJson = (glob) => {
  const list = fs.readdirSync(dir).filter(f => f.startsWith(glob)).sort().reverse();
  if (!list.length) return null;
  try { return JSON.parse(fs.readFileSync(path.join(dir, list[0]), 'utf8')); }
  catch { return null; }
};

// ESLint metrics (from eslint-report.json created earlier)
let eslintIssues = 0;
try {
  const rep = JSON.parse(fs.readFileSync(path.join(dir, 'eslint-report.json'), 'utf8'));
  eslintIssues = rep.reduce((a, r) => a + (r.errorCount + r.warningCount), 0);
} catch {}

// TSC errors (from tsc-nb2-report.txt produced by previous patch) — count lines containing error TS
let tscErrors = 0;
try {
  const tscTxt = fs.readFileSync(path.join(dir, 'tsc-nb2-report.txt'), 'utf8');
  tscErrors = (tscTxt.match(/error TS[0-9]+/g) || []).length;
} catch {}

const row = { ts: now, eslint_issues: eslintIssues, tsc_errors: tscErrors };
const jsonl = path.join(dir, 'ci-trend.jsonl');
const csv = path.join(dir, 'ci-trend.csv');

fs.appendFileSync(jsonl, JSON.stringify(row) + '\n');
if (!fs.existsSync(csv)) fs.writeFileSync(csv, 'ts,eslint_issues,tsc_errors\n');
fs.appendFileSync(csv, `${now},${eslintIssues},${tscErrors}\n`);
console.log('[ci_trend_append_once] appended metrics row:', row);
