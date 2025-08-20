#!/usr/bin/env node
// Verifies branch-protection required checks ⟷ workflow job IDs
const fs = require('fs');
const req = JSON.parse(fs.readFileSync('.github/required-checks.json','utf8'));
const workflows = [
  '.github/workflows/ci.yml',
  '.github/workflows/dashboard-green.yml',
  '.github/workflows/python-tests.yml'
].filter(fs.existsSync);
const jobs = new Set();
const getJobsFromYaml = (y) => {
  // Lightweight extraction to avoid extra deps
  const m = [...y.matchAll(/^\s{0,2}jobs:\s*\n([\s\S]*?)(^\S|$)/gm)];
  if(!m.length) return;
  m.forEach(mm => {
    const block = mm[1]||'';
    [...block.matchAll(/^\s{2,}([A-Za-z0-9_-]+):\s*$/gm)]
      .forEach(x => jobs.add(x[1]));
  });
};
workflows.forEach(fp => getJobsFromYaml(fs.readFileSync(fp,'utf8')));
const missing = req.checks.filter(c => !jobs.has(c));
if (missing.length) {
  console.error('REQUIRED_CHECKS_DRIFT', { missing, have:[...jobs].sort() });
  throw new Error('Required checks drift detected');
}
console.log('REQUIRED_CHECKS_SYNC_OK');
