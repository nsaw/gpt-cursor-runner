#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const LOG = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-completed-validate.log';

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

function validateCompletedPatches() {
  try {
    const completedDir = path.join(ROOT, '.completed');
    if (!fs.existsSync(completedDir)) {
      return { validated: 0, invalid: 0, moved_to_failed: 0 };
    }

    const files = fs.readdirSync(completedDir).filter(f => f.endsWith('.json'));
    let validated = 0;
    let invalid = 0;
    let moved_to_failed = 0;

    for (const file of files) {
      const filePath = path.join(completedDir, file);
      
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const patch = JSON.parse(content);
        
        // Basic validation: check required fields
        const requiredFields = ['blockId', 'versioning_format', 'save_to'];
        const missingFields = requiredFields.filter(field => !patch[field]);
        
        if (missingFields.length > 0) {
          invalid++;
          log(`Invalid patch ${file}: missing fields: ${missingFields.join(', ')}`);
          
          // Move to failed
          const failedPath = path.join(ROOT, '.failed', file);
          fs.renameSync(filePath, failedPath);
          moved_to_failed++;
          log(`Moved ${file} to .failed/ (validation failed)`);
        } else {
          validated++;
        }
      } catch (error) {
        invalid++;
        log(`Error validating ${file}: ${error.message}`);
        
        // Move to failed
        const failedPath = path.join(ROOT, '.failed', file);
        fs.renameSync(filePath, failedPath);
        moved_to_failed++;
        log(`Moved ${file} to .failed/ (parse error)`);
      }
    }

    return { validated, invalid, moved_to_failed };
  } catch (error) {
    log(`Error in validation: ${error.message}`);
    return { validated: 0, invalid: 0, moved_to_failed: 0, error: error.message };
  }
}

// Main loop
log('g2o-completed-validate starting...');

let heartbeatCount = 0;
const interval = setInterval(() => {
  heartbeatCount++;
  const result = validateCompletedPatches();
  
  // Log heartbeat every 10 iterations (every 10 seconds)
  if (heartbeatCount % 10 === 0) {
    log(`Heartbeat #${heartbeatCount}: validated=${result.validated}, invalid=${result.invalid}, moved=${result.moved_to_failed}`);
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
