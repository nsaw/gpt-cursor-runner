const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const path = require("path");

// Create logs directory if it doesn't exist
const fs = require("fs");
const logsDir = path.join(__dirname, "../../logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for structured logging
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "ghost-runner" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),

    // Daily rotate file transport for all logs
    new DailyRotateFile({
      filename: path.join(logsDir, "application-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
      level: "info",
    }),

    // Error log file
    new DailyRotateFile({
      filename: path.join(logsDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    }),
  ],
});

// Request logger middleware
const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Log request
  logger.info("Request received", {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get("User-Agent"),
    timestamp: new Date().toISOString(),
  });

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function (chunk, encoding) {
    const duration = Date.now() - start;

    logger.info("Response sent", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get("Content-Length"),
      timestamp: new Date().toISOString(),
    });

    originalEnd.call(this, chunk, encoding);
  };

  next();
};

// Error logger middleware
const errorLogger = (err, req, res, next) => {
  logger.error("Error occurred", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });

  next(err);
};

// Performance logger
const performanceLogger = (operation, duration, metadata = {}) => {
  logger.info("Performance metric", {
    operation,
    duration: `${duration}ms`,
    ...metadata,
    timestamp: new Date().toISOString(),
  });
};

// Security logger
const securityLogger = (event, details = {}) => {
  logger.warn("Security event", {
    event,
    ...details,
    timestamp: new Date().toISOString(),
  });
};

// Business logger
const businessLogger = (action, data = {}) => {
  logger.info("Business event", {
    action,
    ...data,
    timestamp: new Date().toISOString(),
  });
};

// Log execution time decorator
const logExecutionTime = (operation) => {
  return (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      performanceLogger(operation, duration, {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
      });
    });

    next();
  };
};

module.exports = {
  logger,
  requestLogger,
  errorLogger,
  performanceLogger,
  securityLogger,
  businessLogger,
  logExecutionTime,
};
