const redis = require('./utils/redis');
(async () => {
  try {
    await redis.ping();
    console.log('[REDIS] Connected.');
  } catch (e) {
    console.error('[REDIS] Failed to connect:', e);
    process.exit(1);
  }
})(); 