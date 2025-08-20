#!/usr/bin/env node
// Opens a GitHub issue if prior job failed (best-effort; no-op without token)
const { spawnSync } = require('child_process');
const repo = process.env.GITHUB_REPOSITORY || '';
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const title = process.env.ISSUE_TITLE || 'Green Gate: guard failure detected';
const body  = process.env.ISSUE_BODY  || 'A guard failed. Please inspect logs and repair immediately.';
if (!repo || !token) {
  console.log('ISSUE_SKIP: missing repo or token');
  return;
}
const url = `https://api.github.com/repos/${repo}/issues`;
const payload = JSON.stringify({ title, body, labels: ['governance','quality','security'] });
const r = spawnSync('curl', ['-sS','-X','POST','-H','Accept: application/vnd.github+json','-H',`Authorization: Bearer ${token}`,url,'-d',payload], { stdio:'inherit' });
if (r.status !== 0) {
  throw new Error(`Failed to create GitHub issue: ${r.status}`);
}
console.log('ISSUE_CREATED_SUCCESSFULLY');
