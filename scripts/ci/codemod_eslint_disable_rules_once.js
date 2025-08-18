#!/usr/bin/env node
/*
  codemod_eslint_disable_rules_once.js
  Usage: node codemod ... <eslintReportJson> <rulesCsv> <maxFilesPerRule> <logOut>
  Reads an ESLint JSON report, finds files with given ruleIds, and injects a single
  file-top banner like:
    // eslint-disable rule1, rule2
  Skips files already containing an eslint-disable banner. Writes an audit log.
*/
const fs = require('fs'), path = require('path');
const [,, reportPath, rulesCsv, maxFilesStr, logOut] = process.argv;
const rules = (rulesCsv||'').split(',').map(s=>s.trim()).filter(Boolean);
const maxFilesPerRule = Math.max(1, parseInt(maxFilesStr||'25',10));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const byRule = new Map(); const seen = new Set();

for (const f of report) {
  const fp = f.filePath || '';
  for (const m of (f.messages||[])) {
    const r = m.ruleId || '';
    if (!rules.includes(r)) continue;
    if (!byRule.has(r)) byRule.set(r, new Map());
    const map = byRule.get(r);
    map.set(fp, (map.get(fp)||0)+1);
  }
}

const log = { ts: new Date().toISOString(), rules, changes: [] };

for (const r of rules) {
  const filesMap = byRule.get(r) || new Map();
  const files = [...filesMap.entries()]
    .sort((a,b)=> b[1]-a[1])
    .slice(0, maxFilesPerRule)
    .map(([fp])=>fp);
  
  for (const fp of files) {
    if (seen.has(fp)) continue;
    seen.add(fp);
    try {
      const txt = fs.readFileSync(fp, 'utf8');
      if (/^\s*\/\*\s*eslint-disable\b/m.test(txt)) {
        log.changes.push({file:fp, rule:r, action:"skip-already-disabled"});
        continue;
      }
      const banner = `/* eslint-disable ${rules.join(', ')} */\n`;
      fs.writeFileSync(fp, banner + txt);
      log.changes.push({file:fp, rule:r, action:"insert-banner"});
    } catch (e) {
      log.changes.push({file:fp, rule:r, action:"error", error:String(e)});
    }
  }
}

if (logOut) fs.writeFileSync(logOut, JSON.stringify(log,null,2));
console.log(JSON.stringify({ok:true, inserted:log.changes.filter(c=>c.action==='insert-banner').length},null,2));
