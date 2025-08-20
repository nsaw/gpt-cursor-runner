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
  const jobMatches = [...y.matchAll(/^\s{0,2}([A-Za-z0-9_-]+):\s*$/gm)];
  jobMatches.forEach(match => {
    const jobName = match[1];
    // Skip if it's not a job (could be other YAML keys)
    if (jobName && !['on', 'name', 'jobs', 'runs-on', 'steps', 'uses', 'with', 'env'].includes(jobName)) {
      jobs.add(jobName);
    }
  });
};
workflows.forEach(fp => getJobsFromYaml(fs.readFileSync(fp,'utf8')));
const missing = req.checks.filter(c => !jobs.has(c));
if (missing.length) {
  console.error('REQUIRED_CHECKS_DRIFT', { missing, have:[...jobs].sort() });
  throw new Error('Required checks drift detected');
}
console.log('REQUIRED_CHECKS_SYNC_OK');
