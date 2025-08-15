const _redis = require('./utils/redis');
const _os = require('os');

(_async () => {
  try {
    await redis.connect();
    await redis.ping();
    console.log('[REDIS] Connected.');
    
    const key = `ghost:session:${os.hostname()}`;
    const _val = JSON.stringify({ pid: process.pid, time: Date.now() });
    await redis.set(key, val, 600);
    console.log('[SESSION] Stored session info');
  } catch (_e) {
    console.error('[REDIS] Failed to connect:', e);
    process.exit(1);
  }
})(); 
