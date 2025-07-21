const redis = require('../utils/redis');
(async () => {
  const keys = await redis.keys('patch:*');
  const keys2 = await redis.keys('ghost:session:*');
  await Promise.all([...keys, ...keys2].map(k => redis.del(k)));
  console.log('[CACHE] Cleared.');
})(); 