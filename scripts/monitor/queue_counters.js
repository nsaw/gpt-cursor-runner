#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const META = '/Users/sawyer/gitSync/_GPTsync/meta';
const LOG = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-queue-counters.log';

// Ensure directories exist
[path.dirname(META), path.dirname(LOG)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG, logEntry);
  console.log(logEntry.trim());
}

function getQueueMetrics() {
  try {
    // Count files in different directories
    const queued = fs.existsSync(ROOT) ? 
      fs.readdirSync(ROOT).filter(f => f.endsWith('.json')).length : 0;
    
    const completed = fs.existsSync(path.join(ROOT, '.completed')) ?
      fs.readdirSync(path.join(ROOT, '.completed')).filter(f => f.endsWith('.json')).length : 0;
    
    const failed = fs.existsSync(path.join(ROOT, '.failed')) ?
      fs.readdirSync(path.join(ROOT, '.failed')).filter(f => f.endsWith('.json')).length : 0;
    
    const corrupt = fs.existsSync(path.join(ROOT, '.corrupt')) ?
      fs.readdirSync(path.join(ROOT, '.corrupt')).filter(f => f.endsWith('.json')).length : 0;
    
    return {
      ts: new Date().toISOString(),
      queued_root: queued,
      completed_good: completed,
      failed: failed,
      corrupt: corrupt
    };
  } catch (error) {
    log(`Error getting metrics: ${error.message}`);
    return {
      ts: new Date().toISOString(),
      queued_root: 0,
      completed_good: 0,
      failed: 0,
      corrupt: 0,
      error: error.message
    };
  }
}

function writeMetrics(metrics) {
  try {
    fs.writeFileSync(path.join(META, 'queue_counters.json'), JSON.stringify(metrics, null, 2));
    log(`Metrics written: queued=${metrics.queued_root}, completed=${metrics.completed_good}, failed=${metrics.failed}, corrupt=${metrics.corrupt}`);
  } catch (error) {
    log(`Error writing metrics: ${error.message}`);
  }
}

// Main loop
log('g2o-queue-counters starting...');

let heartbeatCount = 0;
const interval = setInterval(() => {
  heartbeatCount++;
  const metrics = getQueueMetrics();
  writeMetrics(metrics);
  
  // Log heartbeat every 10 iterations (every 10 seconds)
  if (heartbeatCount % 10 === 0) {
    log(`Heartbeat #${heartbeatCount}: ${metrics.queued_root} queued, ${metrics.completed_good} completed`);
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
