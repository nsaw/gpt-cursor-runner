const fs = require('fs');
const path = require('path');
const os = require('os');

function scanDirectory(p) {
  const summaries = fs.readdirSync(path.join(p, 'summaries')).filter(f => f.endsWith('.md'));
  const patches = fs.readdirSync(path.join(p, 'patches')).filter(f => f.endsWith('.json'));
  const completed = fs.existsSync(path.join(p, 'patches/.completed'))
    ? fs.readdirSync(path.join(p, 'patches/.completed')).filter(f => f.endsWith('.json'))
    : [];
  return { summaries: summaries.length, patches: patches.length, completed: completed.length };
}

function buildStatus() {
  const agents = ['MAIN', 'CYOPS'];
  const base = '/Users/sawyer/gitSync/.cursor-cache';
  const status = {};

  agents.forEach(agent => {
    const dir = path.join(base, agent);
    status[agent] = {
      patches: scanDirectory(dir),
      ghost: fs.existsSync(path.join(dir, 'ghost-status.json')) ? require(path.join(dir, 'ghost-status.json')) : { status: 'UNKNOWN' },
      lastUpdate: new Date().toISOString()
    };
  });

  fs.writeFileSync(
    '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/unified-status.json',
    JSON.stringify(status, null, 2)
  );
}

buildStatus();

module.exports = { buildStatus }; 