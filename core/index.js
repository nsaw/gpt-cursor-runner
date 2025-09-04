const redis = require('./utils/redis');
const os = require('os');

(async () => {
  try {
    await redis.connect();
    await redis.ping();
    console.log('[REDIS] Connected.');
    
    const key = `ghost:session:${os.hostname()}`;
    const val = JSON.stringify({ pid: process.pid, time: Date.now() });
    await redis.set(key, val, 600);
    console.log('[SESSION] Stored session info');
  } catch (e) {
    console.error('[REDIS] Failed to connect:', e);
    process.exit(1);
  }
})(); 
