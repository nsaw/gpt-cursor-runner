#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const DASHBOARD_URL = 'http://localhost:8787/health';
const LOG = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-dashboard-probe.log';

// Ensure log directory exists
if (!fs.existsSync(path.dirname(LOG))) {
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG, logEntry);
  console.log(logEntry.trim());
}

function probeDashboard() {
  return new Promise((resolve) => {
    const req = http.get(DASHBOARD_URL, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const success = res.statusCode === 200;
        const response = data.trim();
        resolve({ success, statusCode: res.statusCode, response });
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, statusCode: 0, response: error.message });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ success: false, statusCode: 0, response: 'timeout' });
    });
  });
}

// Main loop
log('g2o-dashboard-probe starting...');

let heartbeatCount = 0;
let consecutiveFailures = 0;
const interval = setInterval(async () => {
  heartbeatCount++;
  const result = await probeDashboard();
  
  if (result.success) {
    consecutiveFailures = 0;
    // Log heartbeat every 12 iterations (every 12 seconds)
    if (heartbeatCount % 12 === 0) {
      log(`Heartbeat #${heartbeatCount}: Dashboard healthy (${result.statusCode})`);
    }
  } else {
    consecutiveFailures++;
    log(`Dashboard probe failed #${consecutiveFailures}: ${result.statusCode} - ${result.response}`);
    
    // If we have 3 consecutive failures, log a warning
    if (consecutiveFailures >= 3) {
      log(`WARNING: Dashboard has been down for ${consecutiveFailures} consecutive probes`);
    }
  }
}, 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  clearInterval(interval);
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  clearInterval(interval);
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled rejection at ${promise}: ${reason}`);
  process.exit(1);
});
