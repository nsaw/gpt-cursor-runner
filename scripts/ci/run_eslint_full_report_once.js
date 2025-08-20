/* eslint-disable */
const { spawn } = require('child_process');
const out = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-full-report.json';
const p = spawn('npx', ['eslint', '.', '--ext', '.ts,.tsx,.js', '-f', 'json', '-o', out, '--no-error-on-unmatched-pattern'], {
  cwd: '/Users/sawyer/gitSync/gpt-cursor-runner', stdio: 'ignore'
});
const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } process.exit(0); }, 30000);
p.on('exit', ()=>{ clearTimeout(t); process.exit(0); });
