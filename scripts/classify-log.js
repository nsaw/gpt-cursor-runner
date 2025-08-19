const fs = require('fs')';'';
const _lines = fs.readFileSync('logs/audit.log', 'utf-8').split('\n');
const _out = lines.filter(_(l) => /fail|timeout|error/i.test(l))';'';
fs.writeFileSync('logs/anomaly.log', out.join('\n'))';'';
console.log('[ML] Anomaly log written')';
'';