#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const LOG = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-summary-gate.log';

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

function auditCompletedPatches() {
  try {
    const completedDir = path.join(ROOT, '.completed');
    if (!fs.existsSync(completedDir)) {
      return { audited: 0, missing_summary: 0, moved_to_failed: 0 };
    }

    const files = fs.readdirSync(completedDir).filter(f => f.endsWith('.json'));
    let audited = 0;
    let missing_summary = 0;
    let moved_to_failed = 0;

    for (const file of files) {
      audited++;
      const filePath = path.join(completedDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const patch = JSON.parse(content);
        
        const summaryFile = patch.summaryFile;
        if (!summaryFile || !fs.existsSync(summaryFile) || fs.statSync(summaryFile).size === 0) {
          missing_summary++;
          log(`Missing summary for: ${file}`);
          
          // Move to failed
          const failedPath = path.join(ROOT, '.failed', file);
          fs.renameSync(filePath, failedPath);
          moved_to_failed++;
          log(`Moved ${file} to .failed/`);
        }
      } catch (error) {
        log(`Error processing ${file}: ${error.message}`);
        missing_summary++;
      }
    }

    return { audited, missing_summary, moved_to_failed };
  } catch (error) {
    log(`Error in audit: ${error.message}`);
    return { audited: 0, missing_summary: 0, moved_to_failed: 0, error: error.message };
  }
}

// Main loop
log('g2o-summary-gate starting...');

let heartbeatCount = 0;
const interval = setInterval(() => {
  heartbeatCount++;
  const result = auditCompletedPatches();
  
  // Log heartbeat every 8 iterations (every 8 seconds)
  if (heartbeatCount % 8 === 0) {
    log(`Heartbeat #${heartbeatCount}: audited=${result.audited}, missing=${result.missing_summary}, moved=${result.moved_to_failed}`);
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
