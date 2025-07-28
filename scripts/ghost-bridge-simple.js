#!/usr/bin/env node

/**
 * Simple Ghost Bridge
 * Handles communication between local systems and gpt-cursor-runner
 */

const fs = require('fs');
const path = require('path');

console.log('📡 Simple Ghost Bridge starting...');

// Create heartbeat directory
const heartbeatDir = path.join(__dirname, '..', 'summaries', '_heartbeat');
if (!fs.existsSync(heartbeatDir)) {
  fs.mkdirSync(heartbeatDir, { recursive: true });
}

// Update last MD write log
const lastWriteLog = path.join(heartbeatDir, '.last-md-write.log');
const timestamp = new Date().toISOString();
fs.appendFileSync(lastWriteLog, `${timestamp} - Simple ghost bridge started\n`);

console.log('✅ Simple Ghost Bridge started');

// Keep the process alive and update heartbeat
setInterval(() => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(lastWriteLog, `${timestamp} - Ghost bridge heartbeat\n`);
  console.log('💓 Ghost bridge heartbeat');
}, 30000); // Every 30 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('📡 Simple Ghost Bridge shutting down...');
  process.exit(0);
}); 