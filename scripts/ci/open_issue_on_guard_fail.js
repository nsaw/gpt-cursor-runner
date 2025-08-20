#!/usr/bin/env node
// Opens a GitHub issue if prior job failed (best-effort; no-op without token)
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const repo = process.env.GITHUB_REPOSITORY || '';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const title = process.env.ISSUE_TITLE || 'Green Gate: guard failure detected';
const body  = process.env.ISSUE_BODY  || 'A guard failed. Please inspect logs and repair immediately.';

// Check for --emit-json flag
const emitJson = process.argv.includes('--emit-json');
const jsonPath = process.argv[process.argv.indexOf('--emit-json') + 1];

if (emitJson && jsonPath) {
  // Create SARIF-like drift findings
  const findings = {
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'GREEN Drift Sentry',
          version: '2.0.270'
        }
      },
      results: [{
        ruleId: 'green-drift-detected',
        level: 'error',
        message: {
          text: 'GREEN drift detected - guard failure or budget breach'
        },
        locations: [{
          physicalLocation: {
            artifactLocation: {
              uri: 'workflow'
            }
          }
        }]
      }]
    }]
  };

  // Ensure directory exists
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(jsonPath, JSON.stringify(findings, null, 2));
  console.log(`DRIFT_FINDINGS_EMITTED: ${jsonPath}`);
  return;
}

if (!repo || !token) {
  console.log('ISSUE_SKIP: missing repo or token');
  return;
}

const url = `https://api.github.com/repos/${repo}/issues`;
const payload = JSON.stringify({ title, body, labels: ['governance','quality','security','green-drift'] });
const r = spawnSync('curl', ['-sS','-X','POST','-H','Accept: application/vnd.github+json','-H',`Authorization: Bearer ${token}`,url,'-d',payload], { stdio:'inherit' });
if (r.status !== 0) {
  throw new Error(`Failed to create GitHub issue: ${r.status}`);
}
console.log('ISSUE_CREATED_SUCCESSFULLY');
