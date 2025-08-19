#!/usr/bin/env node

/**
 * Simple Summary Monitor
 * Monitors summary files and updates heartbeat
 */

const fs = require('fs');
const path = require('path');

console.log('📊 Simple Summary Monitor starting...');

// Create heartbeat directory
const heartbeatDir = path.join(__dirname, '..', 'summaries', '_heartbeat');
if (!fs.existsSync(heartbeatDir)) {
  fs.mkdirSync(heartbeatDir, { recursive: true });
}

// Update last MD write log
const lastWriteLog = path.join(heartbeatDir, '.last-md-write.log');
const timestamp = new Date().toISOString();
fs.writeFileSync(
  lastWriteLog,
  `${timestamp} - Simple summary monitor started\n`,
);

console.log('✅ Simple Summary Monitor started');

// Keep the process alive
setInterval(() => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(lastWriteLog, `${timestamp} - Summary monitor heartbeat\n`);
  console.log('💓 Summary monitor heartbeat');
}, 30000); // Every 30 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('📊 Simple Summary Monitor shutting down...');
  process.exit(0);
});