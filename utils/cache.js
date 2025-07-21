const redis = require('./redis');

// Cache decorator
const cache = (ttl = 300) => {
  return (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    
    redis.get(key, (err, data) => {
      if (err || !data) {
        // Cache miss - store original send method
        const originalSend = res.send;
        res.send = function(body) {
          // Cache the response
          redis.setex(key, ttl, body);
          originalSend.call(this, body);
        };
        next();
      } else {
        // Cache hit
        res.send(data);
      }
    });
  };
};

// Cache invalidation
const invalidateCache = (pattern) => {
  return (req, res, next) => {
    redis.keys(pattern, (err, keys) => {
      if (!err && keys.length > 0) {
        redis.del(keys);
      }
    });
    next();
  };
};

// Cache statistics
const getCacheStats = async () => {
  try {
    const keys = await redis.keys('cache:*');
    const info = await redis.info('memory');
    return {
      totalKeys: keys.length,
      memoryInfo: info
    };
  } catch (error) {
    return { error: error.message };
  }
};

// Cache health check
const cacheHealth = async () => {
  try {
    await redis.ping();
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

module.exports = {
  cache,
  invalidateCache,
  getCacheStats,
  cacheHealth
}; 