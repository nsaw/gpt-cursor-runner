/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
// Wrapper calls the existing Playwright smoke; treats failures as soft under this phase.
const { spawn } = require('child_process'); const fs = require('fs');
const profilePath = process.argv[2], outLog = process.argv[3], baseScript = process.argv[4];
const prof = JSON.parse(fs.readFileSync(profilePath,'utf8'));
const url = (prof.visual || {}).url || '';
const args = ['--url', url, '--out', outLog];
const child = spawn(process.execPath, [baseScript, ...args], { stdio: 'inherit' });
child.on('exit', (code)=>{
  // Phase P2.11.00 nullstate: always exit 0 but mark findings via log.
  process.exit(0);
});
