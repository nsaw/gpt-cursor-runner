/* eslint-disable */
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const hookDir = path.join(ROOT, '.git', 'hooks');
const hookFile = path.join(hookDir, 'pre-commit');
try { fs.mkdirSync(hookDir, { recursive: true }); } catch {}
const content = `#!/usr/bin/env node
const { spawnSync } = require('child_process');
const p = spawnSync('node', ['scripts/ci/nb2_precommit_scan_once.js'], { stdio: 'inherit' });
process.exit(p.status || 0);
`;
fs.writeFileSync(hookFile, content, { mode: 0o755 });
console.log('[precommit] installed:', hookFile);
