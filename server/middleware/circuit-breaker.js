const CircuitBreaker = require('opossum');

// Circuit breaker configuration
const breakerOptions = {
  timeout: 3000, // 3 seconds
  errorThresholdPercentage: 50, // 50% error threshold
  resetTimeout: 30000, // 30 seconds
  volumeThreshold: 10, // Minimum number of calls before breaker opens
  name: 'default'
};

// Create circuit breakers for different services
const redisBreaker = new CircuitBreaker(async (operation) => {
  // Redis operation wrapper
  const redis = require('../../utils/redis');
  return await operation(redis);
}, {
  ...breakerOptions,
  name: 'redis',
  fallback: () => ({ error: 'Redis service unavailable', cached: false })
});

const slackBreaker = new CircuitBreaker(async (operation) => {
  // Slack API operation wrapper
  return await operation();
}, {
  ...breakerOptions,
  name: 'slack',
  fallback: () => ({ error: 'Slack service unavailable', sent: false })
});

const databaseBreaker = new CircuitBreaker(async (operation) => {
  // Database operation wrapper
  return await operation();
}, {
  ...breakerOptions,
  name: 'database',
  fallback: () => ({ error: 'Database service unavailable', stored: false })
});

const webhookBreaker = new CircuitBreaker(async (operation) => {
  // Webhook operation wrapper
  return await operation();
}, {
  ...breakerOptions,
  name: 'webhook',
  fallback: () => ({ error: 'Webhook service unavailable', delivered: false })
});

// Circuit breaker middleware
const circuitBreakerMiddleware = (breaker) => {
  return (req, res, next) => {
    req.circuitBreaker = breaker;
    next();
  };
};

// Circuit breaker status endpoint
const getBreakerStatus = () => {
  return {
    redis: {
      state: redisBreaker.opened ? 'open' : redisBreaker.halfOpen ? 'half-open' : 'closed',
      stats: redisBreaker.stats
    },
    slack: {
      state: slackBreaker.opened ? 'open' : slackBreaker.halfOpen ? 'half-open' : 'closed',
      stats: slackBreaker.stats
    },
    database: {
      state: databaseBreaker.opened ? 'open' : databaseBreaker.halfOpen ? 'half-open' : 'closed',
      stats: databaseBreaker.stats
    },
    webhook: {
      state: webhookBreaker.opened ? 'open' : webhookBreaker.halfOpen ? 'half-open' : 'closed',
      stats: webhookBreaker.stats
    }
  };
};

// Event listeners for monitoring
[redisBreaker, slackBreaker, databaseBreaker, webhookBreaker].forEach(breaker => {
  breaker.on('open', () => {
    console.log(`Circuit breaker ${breaker.name} opened`);
  });
  
  breaker.on('close', () => {
    console.log(`Circuit breaker ${breaker.name} closed`);
  });
  
  breaker.on('halfOpen', () => {
    console.log(`Circuit breaker ${breaker.name} half-open`);
  });
  
  breaker.on('fallback', (result) => {
    console.log(`Circuit breaker ${breaker.name} fallback triggered:`, result);
  });
});

module.exports = {
  redisBreaker,
  slackBreaker,
  databaseBreaker,
  webhookBreaker,
  circuitBreakerMiddleware,
  getBreakerStatus
}; 