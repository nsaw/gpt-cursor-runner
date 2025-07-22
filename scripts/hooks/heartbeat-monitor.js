// Heartbeat monitor with debounce
const fs = require('fs');
const path = require('path');
const { debounce } = require('lodash');

const heartbeatFile = path.resolve(__dirname, '../../.cursor-cache/CYOPS/.heartbeat/heartbeat.log');

const writeHeartbeat = debounce(() => {
  try {
    fs.mkdirSync(path.dirname(heartbeatFile), { recursive: true });
    fs.writeFileSync(heartbeatFile, `heartbeat:${new Date().toISOString()}\n`, { flag: 'a' });
  } catch (err) {
    console.error('[Heartbeat Write Error]', err);
  }
}, 250);

setInterval(writeHeartbeat, 1000); 