#!/usr/bin/env node
const fs = require('fs');
const bad = [];
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, 'utf8');
  const firstLine = t.split(/\r?\n/, 1)[0] ?? '';
  if (!firstLine.startsWith('#!/usr/bin/env node')) bad.push(p);
}
if (bad.length) {
  console.error('Shebang guard: first line must be \'#!/usr/bin/env node\' — offenders:', bad.join(', '));
  process.exit(1); // eslint-disable-line no-process-exit
}
