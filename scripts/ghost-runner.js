#!/usr/bin/env node

/**
 * Ghost Runner Service
 * Handles patch execution and monitoring for both MAIN and CYOPS environments
 * 
 * Usage:
 *   node scripts/ghost-runner.js
 *   node scripts/ghost-runner.js --env=MAIN
 *   node scripts/ghost-runner.js --env=CYOPS
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

// Configuration
const PORT = process.env.GHOST_RUNNER_PORT || 5053;
const ENV = process.argv.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'CYOPS';
const CACHE_ROOT = '/Users/sawyer/gitSync/.cursor-cache';
const PATCHES_DIR = path.join(CACHE_ROOT, ENV, 'patches');
const SUMMARIES_DIR = path.join(CACHE_ROOT, ENV, 'summaries');
const HEARTBEAT_DIR = path.join(CACHE_ROOT, ENV, '.heartbeat');
const LOGS_DIR = path.join(PATCHES_DIR, '.logs');

// Ensure directories exist
[PATCHES_DIR, SUMMARIES_DIR, HEARTBEAT_DIR, LOGS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging
const log = (message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [GHOST-RUNNER:${ENV}] ${message}`);
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ghost-runner',
    environment: ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
    endpoints: ['/health', '/status', '/patches', '/execute', '/monitor']
  });
});

// Status endpoint
app.get('/status', (req, res) => {
  const status = {
    service: 'ghost-runner',
    environment: ENV,
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),
    patches: {
      pending: 0,
      completed: 0,
      failed: 0
    },
    directories: {
      patches: PATCHES_DIR,
      summaries: SUMMARIES_DIR,
      heartbeat: HEARTBEAT_DIR
    }
  };

  // Count patches
  try {
    if (fs.existsSync(PATCHES_DIR)) {
      const files = fs.readdirSync(PATCHES_DIR);
      status.patches.pending = files.filter(f => f.endsWith('.json')).length;
    }
    
    const completedDir = path.join(PATCHES_DIR, '.completed');
    const failedDir = path.join(PATCHES_DIR, '.failed');
    
    if (fs.existsSync(completedDir)) {
      status.patches.completed = fs.readdirSync(completedDir).filter(f => f.endsWith('.json')).length;
    }
    
    if (fs.existsSync(failedDir)) {
      status.patches.failed = fs.readdirSync(failedDir).filter(f => f.endsWith('.json')).length;
    }
  } catch (error) {
    log(`Error counting patches: ${error.message}`);
  }

  res.json(status);
});

// List patches endpoint
app.get('/patches', (req, res) => {
  try {
    const files = fs.readdirSync(PATCHES_DIR);
    const patches = files
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(PATCHES_DIR, f),
        size: fs.statSync(path.join(PATCHES_DIR, f)).size,
        modified: fs.statSync(path.join(PATCHES_DIR, f)).mtime
      }));
    
    res.json({
      environment: ENV,
      patches: patches,
      count: patches.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to list patches',
      message: error.message
    });
  }
});

// Receive and execute patch endpoint
app.post('/patch', (req, res) => {
  const patch = req.body;
  
  if (!patch || !patch.id) {
    return res.status(400).json({
      error: 'Invalid patch data: missing id'
    });
  }

  log(`Received patch: ${patch.id}`);

  // Save patch to file
  const patchPath = path.join(PATCHES_DIR, `${patch.id}.json`);
  try {
    fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2));
    log(`Patch saved to: ${patchPath}`);
  } catch (error) {
    log(`Failed to save patch: ${error.message}`);
    return res.status(500).json({
      error: 'Failed to save patch',
      message: error.message
    });
  }

  // Execute the patch immediately
  executePatch(patch.id, patchPath, res);
});

// Execute patch endpoint (for existing patches)
app.post('/execute', (req, res) => {
  const { patchId } = req.body;
  
  if (!patchId) {
    return res.status(400).json({
      error: 'patchId is required'
    });
  }

  const patchPath = path.join(PATCHES_DIR, `${patchId}.json`);
  
  if (!fs.existsSync(patchPath)) {
    return res.status(404).json({
      error: 'Patch not found',
      patchId: patchId
    });
  }

  log(`Executing patch: ${patchId}`);
  executePatch(patchId, patchPath, res);
});

// Patch execution function with enhanced logging
function executePatch(patchId, patchPath, res) {
  log(`Starting execution of patch: ${patchId}`);
  
  // Log the patch execution attempt
  const logEntry = `[${new Date().toISOString()}] Executing patch: ${patchId}\n`;
  const logFile = path.join(LOGS_DIR, 'patch-execution.log');
  try {
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    log(`Failed to write to log file: ${error.message}`);
  }

  // Execute patch using the patch executor
  const executorScript = path.join(__dirname, 'patch-executor.js');
  const command = `node "${executorScript}" "${patchPath}"`;

  exec(command, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      log(`Patch execution failed: ${error.message}`);
      res.status(500).json({
        error: 'Patch execution failed',
        message: error.message,
        stderr: stderr
      });
    } else {
      log(`Patch executed successfully: ${patchId}`);
      res.json({
        success: true,
        patchId: patchId,
        output: stdout
      });
    }
  });
}

// Monitor endpoint
app.get('/monitor', (req, res) => {
  const monitor = {
    service: 'ghost-runner',
    environment: ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    directories: {
      patches: {
        path: PATCHES_DIR,
        exists: fs.existsSync(PATCHES_DIR),
        readable: fs.accessSync ? (() => {
          try { fs.accessSync(PATCHES_DIR, fs.constants.R_OK); return true; } 
          catch { return false; }
        })() : true
      },
      summaries: {
        path: SUMMARIES_DIR,
        exists: fs.existsSync(SUMMARIES_DIR),
        readable: fs.accessSync ? (() => {
          try { fs.accessSync(SUMMARIES_DIR, fs.constants.R_OK); return true; } 
          catch { return false; }
        })() : true
      },
      heartbeat: {
        path: HEARTBEAT_DIR,
        exists: fs.existsSync(HEARTBEAT_DIR),
        readable: fs.accessSync ? (() => {
          try { fs.accessSync(HEARTBEAT_DIR, fs.constants.R_OK); return true; } 
          catch { return false; }
        })() : true
      }
    }
  };

  res.json(monitor);
});

// Heartbeat endpoint
app.get('/heartbeat', (req, res) => {
  const heartbeat = {
    service: 'ghost-runner',
    environment: ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    status: 'alive'
  };

  // Write heartbeat to file
  const heartbeatFile = path.join(HEARTBEAT_DIR, 'ghost-runner-heartbeat.json');
  try {
    fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeat, null, 2));
  } catch (error) {
    log(`Failed to write heartbeat: ${error.message}`);
  }

  res.json(heartbeat);
});

// Start server
app.listen(PORT, () => {
  log(`Ghost Runner started on port ${PORT} for environment ${ENV}`);
  log(`Patches directory: ${PATCHES_DIR}`);
  log(`Summaries directory: ${SUMMARIES_DIR}`);
  log(`Heartbeat directory: ${HEARTBEAT_DIR}`);
  log(`Logs directory: ${LOGS_DIR}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down Ghost Runner...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down Ghost Runner...');
  process.exit(0);
});

// Error handling
process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`);
  log(`Stack: ${error.stack}`);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});