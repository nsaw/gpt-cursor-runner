#!/usr/bin/env node

'use strict';

const { spawn } = require('child_process');
const args = process.argv.slice(2);

if (args.includes('--version')) {
  console.log('run-shell.js via /bin/zsh -lc (detached supported)');
  process.exit(0);
}

let detached = false;
const cmd = [];

for (const a of args) {
  if (a === '--detached') detached = true;
  else cmd.push(a);
}

const line = cmd.join(' ').trim();

if (!line) {
  console.error('Usage: run-shell.js [--detached] <command>');
  process.exit(2);
}

const child = spawn('/bin/zsh', ['-lc', line], {
  stdio: detached ? 'ignore' : 'inherit',
  detached,
});

if (detached) {
  child.unref();
  process.exit(0);
}

child.on('exit', (code) => process.exit(code));