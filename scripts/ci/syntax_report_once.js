#!/usr/bin/env node
// syntax_report_once.js — parse a target JS file with vm.Script; output JSON report with syntax errors.
const fs = require('fs'), vm = require('vm'), path = require('path');
const [,, target, outJson, todoMd] = process.argv;
if (!target || !outJson || !todoMd) {
  console.error('Usage: syntax_report_once.js <targetFile> <outJson> <todoMd>');
  // eslint-disable-next-line no-process-exit
  process.exit(2);
}
let ok = true, diag = null;
try {
  const code = fs.readFileSync(target, 'utf8');
  new vm.Script(code, { filename: target, displayErrors: true });
} catch (e) { ok = false; diag = String(e); }
const report = { ok, target, error: diag };
fs.mkdirSync(path.dirname(outJson), { recursive: true });
fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
if (!ok) {
  const md = [
    '# Orchestrator Syntax — MANUAL FIX REQUIRED',
    '',
    `- File: ${target}`,
    '',
    '## Parser error',
    '```',
    diag || '(no message)',
    '```',
    '',
    '### Guidance (manual; no auto-fix):',
    '- Repair the syntax at the indicated line/column.',
    '- Re-run this patch; once syntax is clean, the 10-minute lint loop can resume.',
    '',
    '> Note: Shebang & manifest prerequisites still apply:',
    '> - Shebang must be first line; no banners before (sentinel required).',
    '> - ESLint scope manifest must exclude the orchestrator (sentinel required).',
    ''
  ].join('\n');
  fs.writeFileSync(todoMd, md);
}
console.log(JSON.stringify(report, null, 2));