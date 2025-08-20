#!/usr/bin/env node

/**
 * Enhanced Ghost Bridge with YAML Support and Critical Flow Hardening
 * Handles communication between local systems and gpt-cursor-runner
 * Supports both JSON and YAML patch detection with comprehensive monitoring
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const crypto = require('crypto');

console.log(
  '📡 Enhanced Ghost Bridge starting with critical flow hardening...',
);

// Configuration
const PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';
const MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/';

// Unified logging configuration
const ROOT_LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/';
const ALLOW_PROCEED_FILE = path.join(ROOT_LOGS_DIR, 'ALLOW_PROCEED');
const GHOST_BRIDGE_STATUS_FILE = path.join(
  ROOT_LOGS_DIR,
  'ghost-bridge-status.json',
);
const PATCH_EVENTS_LOG = path.join(ROOT_LOGS_DIR, 'patch-events.log');
const INJECT_LOG_FAILURE_FILE = path.join(ROOT_LOGS_DIR, 'INJECT_LOG_FAILURE');

// Ensure ROOT logs directory exists
if (!fs.existsSync(ROOT_LOGS_DIR)) {
  fs.mkdirSync(ROOT_LOGS_DIR, { recursive: true });
  console.log(`[BRIDGE] Created unified log directory: ${ROOT_LOGS_DIR}`);
}

// State tracking for debouncing and deduplication
let lastHeartbeatHash = '';
let lastHeartbeatTime = 0;
let errorCount = 0;
let lastPatchExtractionTime = 0;
let extractionFailures = 0;
let lastExtractionFailureTime = 0;
let pausedDueToLogFailure = false;
let lastErrorTime = 0;

function logsWritable() {
  try {
    const tmp = path.join(ROOT_LOGS_DIR, `.wtest-${Date.now()}`);
    fs.writeFileSync(tmp, '1');
    fs.unlinkSync(tmp);
    return true;
  } catch (e) {
    return false;
  }
}

function shouldPauseProcessing() {
  if (fs.existsSync(ALLOW_PROCEED_FILE)) return false;
  // If injected failure flag exists, pause immediately for validation purposes
  if (fs.existsSync(INJECT_LOG_FAILURE_FILE)) return true;
  return pausedDueToLogFailure && !logsWritable();
}

// Track seen messages
const seen = new Set();
const safe = (n) => n.replace(/[^\w./-]/g, '_');

/**
 * Write to unified log with rotation and size limits
 */
function writeUnifiedLog(logFile, message, maxSizeMB = 5) {
  try {
    // Validation injection to simulate log-write failure
    if (fs.existsSync(INJECT_LOG_FAILURE_FILE)) {
      throw new Error('Injected log failure for validation');
    }
    // Check if log file exists and get its size
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      const sizeMB = stats.size / (1024 * 1024);

      // Rotate if file is too large
      if (sizeMB > maxSizeMB) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `${logFile}.${timestamp}.bak`;

        // Check for too many rotated files and purge oldest
        const logDir = path.dirname(logFile);
        const rotatedFiles = fs
          .readdirSync(logDir)
          .filter((f) => f.includes('.bak'))
          .sort()
          .reverse();

        // Keep only the 10 most recent rotated files
        if (rotatedFiles.length >= 10) {
          const filesToDelete = rotatedFiles.slice(10);
          filesToDelete.forEach((file) => {
            try {
              fs.unlinkSync(path.join(logDir, file));
              console.log(`[BRIDGE] Purged old rotated log: ${file}`);
            } catch (e) {
              console.error(
                `[BRIDGE] Failed to purge old log ${file}:`,
                e.message,
              );
            }
          });
        }

        fs.renameSync(logFile, backupFile);
        console.log(`[BRIDGE] Rotated log file: ${logFile} -> ${backupFile}`);

        // Alert on rapid rotation (more than 3 per hour)
        const rotationCount = rotatedFiles.length + 1;
        if (rotationCount > 3) {
          console.warn(
            `[BRIDGE] ⚠️ Rapid log rotation detected: ${rotationCount} rotations`,
          );
          // TODO: Send alert for rapid rotation
        }
      }
    }

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error(`[BRIDGE] Failed to write to log ${logFile}:`, error.message);

    // CRITICAL: Log write failure - escalate immediately
    handleLogWriteFailure(logFile, error, message);
  }
}

/**
 * Handle log write failure with escalation
 */
function handleLogWriteFailure(logFile, error, originalMessage) {
  const failureData = {
    timestamp: new Date().toISOString(),
    failedLogFile: logFile,
    error: error.message,
    originalMessage,
    component: 'ghost-bridge',
  };

  // Try to write to fallback location
  const fallbackLog = path.join(process.cwd(), 'ghost-bridge-fallback.log');
  try {
    const fallbackEntry = `[${failureData.timestamp}] LOG_WRITE_FAILURE: ${JSON.stringify(failureData)}\n`;
    fs.appendFileSync(fallbackLog, fallbackEntry);
  } catch (fallbackError) {
    console.error(
      '[BRIDGE] CRITICAL: Even fallback logging failed:',
      fallbackError.message,
    );
  }

  // Create critical alert file
  const criticalAlertFile = path.join(ROOT_LOGS_DIR, 'CRITICAL_ALERT');
  try {
    const alertContent = `LOG_WRITE_FAILURE: ${new Date().toISOString()}\nComponent: ghost-bridge\nFile: ${logFile}\nError: ${error.message}\n`;
    fs.writeFileSync(criticalAlertFile, alertContent);
  } catch (alertError) {
    console.error(
      '[BRIDGE] CRITICAL: Failed to create alert file:',
      alertError.message,
    );
  }

  // Increment error count for monitoring
  errorCount++;
  lastErrorTime = Date.now();
  pausedDueToLogFailure = true;

  // TODO: Send immediate Slack alert for log write failure
  console.error(
    '[BRIDGE] 🚨 CRITICAL: Log write failure - system may be degraded',
  );
}

/**
 * Generate hash for deduplication
 */
function generateHash(content) {
  return crypto.createHash('md5').update(JSON.stringify(content)).digest('hex');
}

/**
 * Debounced heartbeat with deduplication
 */
function emitHeartbeat() {
  const now = Date.now();
  const timeSinceLastHeartbeat = now - lastHeartbeatTime;

  // Only emit heartbeat if status changed or >30s since last heartbeat
  const heartbeatData = {
    timestamp: new Date().toISOString(),
    status: 'running',
    patchDetectionStats: {
      totalExtracted: seen.size,
      lastExtractionTime: lastPatchExtractionTime,
      extractionFailures,
      lastExtractionFailureTime,
    },
    errorCount,
    uptime: Math.floor((now - startTime) / 1000),
  };

  const heartbeatHash = generateHash(heartbeatData);

  // Only write if hash changed or >30s since last heartbeat
  if (heartbeatHash !== lastHeartbeatHash || timeSinceLastHeartbeat > 30000) {
    try {
      fs.writeFileSync(
        GHOST_BRIDGE_STATUS_FILE,
        JSON.stringify(heartbeatData, null, 2),
      );
      lastHeartbeatHash = heartbeatHash;
      lastHeartbeatTime = now;
      console.log(
        `[BRIDGE] 💓 Heartbeat emitted (${heartbeatHash.substring(0, 8)})`,
      );
    } catch (error) {
      console.error('[BRIDGE] Failed to write heartbeat:', error.message);
      writeUnifiedLog(
        PATCH_EVENTS_LOG,
        `ERROR: Failed to write heartbeat - ${error.message}`,
      );
    }
  }
}

/**
 * Log patch event with deduplication
 */
function logPatchEvent(event, details = {}) {
  const eventData = {
    timestamp: new Date().toISOString(),
    event,
    details,
    errorCount,
    extractionFailures,
  };

  const eventHash = generateHash(eventData);
  const logMessage = `PATCH_EVENT: ${event} - ${JSON.stringify(details)}`;

  writeUnifiedLog(PATCH_EVENTS_LOG, logMessage);
  console.log(`[BRIDGE] 📝 ${logMessage}`);
}

/**
 * Extract all code blocks from a message content
 * Supports both markdown code blocks and inline code
 */
function extractCodeBlocks(content) {
  const blocks = [];

  // Extract markdown code blocks (```...```)
  const markdownBlocks = content.match(/```[\s\S]*?```/g) || [];
  for (const block of markdownBlocks) {
    // Remove the ``` markers
    const cleanBlock = block.replace(/^```\w*\n?/, '').replace(/```$/, '');
    blocks.push(cleanBlock.trim());
  }

  // Extract inline code blocks (single backticks)
  const inlineBlocks = content.match(/`([^`]+)`/g) || [];
  for (const block of inlineBlocks) {
    const cleanBlock = block.replace(/^`|`$/g, '');
    blocks.push(cleanBlock.trim());
  }

  return blocks;
}

/**
 * Try to parse content as JSON, return null if fails
 */
function tryParseJSON(content) {
  try {
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * Try to parse content as YAML, return null if fails
 */
function tryParseYAML(content) {
  try {
    return yaml.load(content);
  } catch (e) {
    return null;
  }
}

/**
 * Validate patch structure and extract required fields
 */
function validatePatch(patch) {
  if (!patch || typeof patch !== 'object') {
    return { valid: false, reason: 'Not an object' };
  }

  // Check for required role field
  if (!patch.role || patch.role !== 'command_patch') {
    return { valid: false, reason: 'Missing or invalid role field' };
  }

  // Check for target field (required for routing)
  if (!patch.target) {
    return { valid: false, reason: 'Missing target field' };
  }

  return { valid: true, target: patch.target };
}

/**
 * Route patch to appropriate directory based on target
 */
function routePatch(patch, target) {
  const targetUpper = target.toUpperCase();

  switch (targetUpper) {
  case 'MAIN':
    return MAIN_PATCH_DIR;
  case 'CYOPS':
  case 'DEV':
    return PATCH_DIR;
  default:
    console.log(`[BRIDGE] Unknown target '${target}', defaulting to CYOPS`);
    return PATCH_DIR;
  }
}

/**
 * Process a single patch block with comprehensive logging
 */
function processPatchBlock(block, source = 'unknown') {
  if (shouldPauseProcessing()) {
    console.error(
      '[BRIDGE] Processing paused due to unified log failure. Create ALLOW_PROCEED to override.',
    );
    return { processed: false, reason: 'paused_due_to_log_failure' };
  }

  let patch = null;
  let format = 'unknown';

  // Try JSON first
  patch = tryParseJSON(block);
  if (patch) {
    format = 'json';
  } else {
    // Try YAML
    patch = tryParseYAML(block);
    if (patch) {
      format = 'yaml';
    }
  }

  if (!patch) {
    extractionFailures++;
    lastExtractionFailureTime = Date.now();
    logPatchEvent('EXTRACTION_FAILED', {
      source,
      reason: 'Failed to parse as JSON or YAML',
    });
    return { processed: false, reason: 'Failed to parse as JSON or YAML' };
  }

  // Validate patch structure
  const validation = validatePatch(patch);
  if (!validation.valid) {
    extractionFailures++;
    lastExtractionFailureTime = Date.now();
    logPatchEvent('VALIDATION_FAILED', {
      source,
      reason: validation.reason,
      format,
    });
    return { processed: false, reason: validation.reason };
  }

  // Route patch to appropriate directory
  const targetDir = routePatch(patch, validation.target);

  // Generate filename
  const patchId = patch.blockId || patch.id || `patch-${Date.now()}`;
  const filename = safe(`${patchId}.json`);
  const filepath = path.join(targetDir, filename);

  // Ensure target directory exists
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
    logPatchEvent('DIRECTORY_CREATED', { targetDir });
  }

  // Convert to JSON and write atomically
  try {
    const jsonContent = JSON.stringify(patch, null, 2);

    // Write to temporary file first, then rename for atomicity
    const tempFile = `${filepath}.tmp`;
    fs.writeFileSync(tempFile, jsonContent);
    fs.renameSync(tempFile, filepath);

    lastPatchExtractionTime = Date.now();
    logPatchEvent('PATCH_EXTRACTED', {
      filename,
      target: validation.target,
      format: format.toUpperCase(),
      filepath,
    });

    console.log(
      `[BRIDGE] ✅ Extracted ${format.toUpperCase()} patch: ${filename} -> ${targetDir}`,
    );
    console.log(
      `[BRIDGE] 📍 Target: ${validation.target}, Format: ${format.toUpperCase()}`,
    );

    return {
      processed: true,
      filename,
      target: validation.target,
      format,
      filepath,
    };
  } catch (e) {
    extractionFailures++;
    lastExtractionFailureTime = Date.now();
    logPatchEvent('WRITE_FAILED', { filename, error: e.message });
    console.error(`[BRIDGE] ❌ Failed to write patch ${filename}:`, e.message);
    return { processed: false, reason: `Write failed: ${e.message}` };
  }
}

/**
 * Process all code blocks in a message
 */
function processMessageBlocks(content, messageId) {
  const blocks = extractCodeBlocks(content);
  const results = [];

  for (const block of blocks) {
    const result = processPatchBlock(block, messageId);
    if (result.processed) {
      results.push(result);
    } else if (result.reason && !result.reason.includes('Failed to parse')) {
      // Log validation failures but not parse failures (too noisy)
      console.log(`[BRIDGE] ⚠️ Block validation failed: ${result.reason}`);
    }
  }

  return results;
}

/**
 * Legacy JSON patch detection (for backward compatibility)
 */
function detectLegacyPatches(content) {
  const match = content.match(/\{[\s\S]*'role':'command_patch'[\s\S]*\}/);
  if (match) {
    try {
      const json = JSON.parse(match[0]);
      const file = safe(
        json.target_file ||
          path.join(PATCH_DIR, `${json.id || json.blockId || 'legacy'}.json`),
      );
      fs.writeFileSync(file, JSON.stringify(json, null, 2));
      logPatchEvent('LEGACY_PATCH_DETECTED', { file });
      console.log(`[BRIDGE] 📝 Legacy patch detected: ${file}`);
      return true;
    } catch (e) {
      extractionFailures++;
      lastExtractionFailureTime = Date.now();
      logPatchEvent('LEGACY_PATCH_FAILED', { error: e.message });
      console.error('[BRIDGE] Legacy patch parsing error:', e.message);
      return false;
    }
  }
  return false;
}

/**
 * Check for stale patches and requeue if necessary
 */
function checkStalePatches() {
  try {
    const now = Date.now();
    const staleThreshold = 15 * 60 * 1000; // 15 minutes

    // Check CYOPS patches
    if (fs.existsSync(PATCH_DIR)) {
      const files = fs
        .readdirSync(PATCH_DIR)
        .filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const filepath = path.join(PATCH_DIR, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtime.getTime();

        if (age > staleThreshold) {
          logPatchEvent('STALE_PATCH_DETECTED', {
            file,
            age: Math.floor(age / 1000),
          });
          console.log(
            `[BRIDGE] ⚠️ Stale patch detected: ${file} (${Math.floor(age / 1000)}s old)`,
          );
        }
      }
    }

    // Check MAIN patches
    if (fs.existsSync(MAIN_PATCH_DIR)) {
      const files = fs
        .readdirSync(MAIN_PATCH_DIR)
        .filter((f) => f.endsWith('.json'));
      for (const file of files) {
        const filepath = path.join(MAIN_PATCH_DIR, file);
        const stats = fs.statSync(filepath);
        const age = now - stats.mtime.getTime();

        if (age > staleThreshold) {
          logPatchEvent('STALE_PATCH_DETECTED', {
            file,
            age: Math.floor(age / 1000),
            target: 'MAIN',
          });
          console.log(
            `[BRIDGE] ⚠️ Stale patch detected: ${file} (${Math.floor(age / 1000)}s old)`,
          );
        }
      }
    }
  } catch (error) {
    logPatchEvent('STALE_CHECK_FAILED', { error: error.message });
    console.error('[BRIDGE] Failed to check stale patches:', error.message);
  }
}

/**
 * Poll for new messages in a thread
 */
async function poll(id) {
  try {
    // Ensure thread ID has proper prefix
    const threadId = id.startsWith('thread_') ? id : `thread_${id}`;

    // For now, we'll simulate polling since we don't have OpenAI integration in this simple version
    // In a real implementation, this would use OpenAI API to fetch messages
    console.log(`[BRIDGE] 🔍 Polling thread: ${threadId}`);

    // This is a placeholder - in the real implementation, you would:
    // 1. Use OpenAI API to fetch messages
    // 2. Process each message for patches
    // 3. Handle seen message tracking
  } catch (e) {
    errorCount++;
    lastErrorTime = Date.now();
    logPatchEvent('POLL_ERROR', { error: e.message });
    console.error('[BRIDGE] poll error', e.message);
  }
}

// Record start time for uptime tracking
const startTime = Date.now();

function startBridge() {
  console.log('✅ Enhanced Ghost Bridge started with critical flow hardening');
  // Initialize heartbeat
  emitHeartbeat();

  // Keep the process alive and update heartbeat with debouncing
  setInterval(() => {
    emitHeartbeat();
  }, 30000); // Every 30 seconds

  // Check for stale patches every 5 minutes
  setInterval(
    () => {
      checkStalePatches();
    },
    5 * 60 * 1000,
  );

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logPatchEvent('SHUTDOWN', { reason: 'SIGINT' });
    console.log('📡 Enhanced Ghost Bridge shutting down...');
    process.exit(0);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    errorCount++;
    lastErrorTime = Date.now();
    logPatchEvent('UNCAUGHT_EXCEPTION', {
      error: error.message,
      stack: error.stack,
    });
    console.error('[BRIDGE] Uncaught exception:', error);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    errorCount++;
    lastErrorTime = Date.now();
    logPatchEvent('UNHANDLED_REJECTION', {
      reason: reason?.message || String(reason),
    });
    console.error('[BRIDGE] Unhandled rejection:', reason);
  });
}

if (require.main === module) {
  startBridge();
}

// Export functions for testing
module.exports = {
  extractCodeBlocks,
  tryParseJSON,
  tryParseYAML,
  validatePatch,
  routePatch,
  processPatchBlock,
  processMessageBlocks,
  detectLegacyPatches,
  emitHeartbeat,
  logPatchEvent,
  checkStalePatches,
  startBridge,
};