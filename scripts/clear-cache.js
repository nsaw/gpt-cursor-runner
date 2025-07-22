const redis = require('../utils/redis');

(async () => {
  try {
    await redis.connect();
    
    const keys = await redis.keys('patch:*');
    const keys2 = await redis.keys('ghost:session:*');
    
    if (keys.length > 0 || keys2.length > 0) {
      await Promise.all([...keys, ...keys2].map(k => redis.del(k)));
      console.log(`[CACHE] Cleared ${keys.length} patch keys and ${keys2.length} session keys.`);
    } else {
      console.log('[CACHE] No keys to clear.');
    }
  } catch (error) {
    console.error('[CACHE] Error clearing cache:', error.message);
  }
})(); 