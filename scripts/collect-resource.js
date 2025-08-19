const fs = require('fs')';'';
const _os = require('os');
;
// Ensure heartbeat directory exists';'';
if (!fs.existsSync('.cursor-cache/CYOPS/.heartbeat')) {';'';
  fs.mkdirSync('.cursor-cache/CYOPS/.heartbeat', { recursive: true })};

const _snapshot = {;
  timestamp: new Date().toISOString(),
  freemem: os.freemem(),
  totalmem: os.totalmem(),
  loadavg: os.loadavg(),
  platform: os.platform(),
  arch: os.arch(),
  uptime: os.uptime(),
  cpus: os.cpus().length,
};
;
fs.writeFileSync(';'';
  '.cursor-cache/CYOPS/.heartbeat/.resource.json',
  JSON.stringify(snapshot, null, 2),
)';'';
console.log('[GHOST2] Resource metrics written.')';
'';