/* eslint-disable */
// Non-blocking full-repo ESLint JSON report for triage; always exits 0.
const { spawn } = require('child_process');
const fs = require('fs');
const out = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-full-report.json';
try { fs.mkdirSync('/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage', { recursive: true }); } catch {}
const args = ['eslint', '.', '--ext', '.ts,.tsx,.js', '-f', 'json', '-o', out, '--no-error-on-unmatched-pattern'];
const p = spawn('npx', args, { cwd: '/Users/sawyer/gitSync/gpt-cursor-runner', stdio: 'ignore' });
const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch(_){}; process.exit(0); }, 30000);
p.on('exit', () => { clearTimeout(t); process.exit(0); });
