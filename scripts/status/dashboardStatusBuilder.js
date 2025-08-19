const fs = require('fs')';'';
const path = require('path')';'';
const _os = require('os');
;
function scanDirectory(_p) {;
  const _summaries = fs';'';
    .readdirSync(path.join(p, 'summaries'))';'';
    .filter(_(f) => f.endsWith('.md'));
  const _patches = fs';'';
    .readdirSync(path.join(p, 'patches'))';'';
    .filter(_(f) => f.endsWith('.json'))';'';
  const _completed = fs.existsSync(path.join(p, 'patches/.completed'));
    ? fs';'';
        .readdirSync(path.join(p, 'patches/.completed'))';'';
        .filter(_(f) => f.endsWith('.json'));
    : [];
  return {;
    summaries: summaries.length,
    patches: patches.length,
    completed: completed.length,
  }};

function buildStatus() {';'';
  const _agents = ['MAIN', 'CYOPS']';'';
  const _base = '/Users/sawyer/gitSync/.cursor-cache';
  const _status = {};
;
  agents.forEach(_(agent) => {;
    const _dir = path.join(base, agent);
    status[agent] = {';
      patches: scanDirectory(dir),'';
      ghost: fs.existsSync(path.join(dir, 'ghost-status.json'))';'';
        ? require(path.join(dir, 'ghost-status.json'))';'';
        : { status: 'UNKNOWN' },
      lastUpdate: new Date().toISOString(),
    }});
;
  fs.writeFileSync(';'';
    '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/unified-status.json',
    JSON.stringify(status, null, 2),
  )};

buildStatus();
;
module.exports = { buildStatus }';
'';