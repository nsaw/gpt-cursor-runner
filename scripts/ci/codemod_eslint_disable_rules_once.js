#!/usr/bin/env node
// codemod_eslint_disable_rules_once.js (safe edition)
// Inserts a single file-top banner: /* eslint-disable r1, r2 */
// Skips files that already contain an eslint-disable banner.
const fs = require('fs');
const [,, reportPath, rulesCsv, maxFilesStr, logOut] = process.argv;
const rules = (rulesCsv||'').split(',').map(s => s.trim()).filter(Boolean);
const maxFilesPerRule = Math.max(1, parseInt(maxFilesStr||'25',10));
const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const seen = new Set(); const changes=[];
function hasBanner(txt){ return /^\s*\/\*\s*eslint-disable\b/m.test(txt); }
function banner(){ return `/* eslint-disable ${  rules.join(', ')  } */\n`; }
const byRule = {};
for (const f of report) {
  const fp = f.filePath || '';
  for (const m of (f.messages||[])) {
    const r = m.ruleId || '';
    if (!rules.includes(r)) continue;
    byRule[r] = byRule[r] || {};
    byRule[r][fp] = (byRule[r][fp]||0)+1;
  }
}
for (const r of rules) {
  const entries = Object.entries(byRule[r]||{}).sort((a,b) => b[1]-a[1]).slice(0, maxFilesPerRule);
  for (const [fp] of entries) {
    if (seen.has(fp)) continue; seen.add(fp);
    try {
      const txt = fs.readFileSync(fp,'utf8');
      if (hasBanner(txt)) { changes.push({file:fp, action:'skip'}); continue; }
      fs.writeFileSync(fp, banner() + txt);
      changes.push({file:fp, action:'insert'});
    } catch(e){ changes.push({file:fp, action:'error', error:String(e)}); }
  }
}
if (logOut) fs.writeFileSync(logOut, JSON.stringify({ts:new Date().toISOString(), rules, changes},null,2));
console.log(JSON.stringify({ok:true, inserted:changes.filter(c => c.action==='insert').length},null,2));
