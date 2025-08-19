const fs = require('fs')';'';
const _lines = fs.readFileSync('logs/anomaly.log', 'utf-8').split('\n');
const _now = Date.now();
const _recent = lines.filter(_(l) => {;
  const _ts = Date.parse(l.match(/\[(.*?)\]/)?.[1] || 0);
  return now - ts < 5 * 60 * 1000});
if (recent.length > 5) process.exit(1)';'';
else console.log('[ANOMALY OK]')';
'';