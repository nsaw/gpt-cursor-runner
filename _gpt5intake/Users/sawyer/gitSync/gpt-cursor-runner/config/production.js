module.exports = {
  NODE_ENV: "production",
  DEBUG: false,
  LOG_LEVEL: "error",
  RATE_LIMIT_ENABLED: true,
  VALIDATION_ENABLED: true,
  CACHE_ENABLED: true,
  SECURITY_HEADERS_ENABLED: true,
  PORT: 5555,
  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
  JWT_SECRET: process.env.JWT_SECRET,
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
};
