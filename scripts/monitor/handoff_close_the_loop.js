#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const LOG = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-handoff-watcher.log';

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

function checkHandoffLoop() {
  try {
    // Check for patches that have been completed but not moved to archive
    const completedDir = path.join(ROOT, '.completed');
    if (!fs.existsSync(completedDir)) {
      return { checked: 0, moved_to_archive: 0 };
    }

    const files = fs.readdirSync(completedDir).filter(f => f.endsWith('.json'));
    let checked = 0;
    let moved_to_archive = 0;

    for (const file of files) {
      checked++;
      const filePath = path.join(completedDir, file);
      
      try {
        const stats = fs.statSync(filePath);
        const ageInHours = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
        
        // Move to archive if older than 2 hours
        if (ageInHours > 2) {
          const archivePath = path.join(ROOT, '.archive', file);
          fs.renameSync(filePath, archivePath);
          moved_to_archive++;
          log(`Moved ${file} to .archive/ (age: ${ageInHours.toFixed(1)}h)`);
        }
      } catch (error) {
        log(`Error processing ${file}: ${error.message}`);
      }
    }

    return { checked, moved_to_archive };
  } catch (error) {
    log(`Error in handoff check: ${error.message}`);
    return { checked: 0, moved_to_archive: 0, error: error.message };
  }
}

// Main loop
log('g2o-handoff-watcher starting...');

let heartbeatCount = 0;
const interval = setInterval(() => {
  heartbeatCount++;
  const result = checkHandoffLoop();
  
  // Log heartbeat every 15 iterations (every 15 seconds)
  if (heartbeatCount % 15 === 0) {
    log(`Heartbeat #${heartbeatCount}: checked=${result.checked}, archived=${result.moved_to_archive}`);
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
