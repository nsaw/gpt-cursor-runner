/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT,'package.json'),'utf8'));
const script = process.argv[2];
if (!script) { console.error('[npm-script] missing script name'); process.exit(1); }
if (!pkg.scripts || !pkg.scripts[script]) {
  console.log(`[npm-script] script "${script}" not found — soft skip.`);
  process.exit(0);
}
const p = spawn('npm', ['run', script, '--silent'], { cwd: ROOT, stdio: 'inherit' });
const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } process.exitCode = 124; }, 30000);
p.on('exit', code => { clearTimeout(t); process.exit(code ?? 1); });
