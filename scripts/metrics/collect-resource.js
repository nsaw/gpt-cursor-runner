const fs = require('fs');
const os = require('os');

// Ensure heartbeat directory exists
if (!fs.existsSync('summaries/_heartbeat')) {
  fs.mkdirSync('summaries/_heartbeat', { recursive: true });
}

const snapshot = {
  timestamp: new Date().toISOString(),
  freemem: os.freemem(),
  totalmem: os.totalmem(),
  loadavg: os.loadavg(),
  platform: os.platform(),
  arch: os.arch(),
  uptime: os.uptime(),
  cpus: os.cpus().length
};

fs.writeFileSync('summaries/_heartbeat/.resource.json', JSON.stringify(snapshot, null, 2));
console.log('[GHOST2] Resource metrics written.'); 