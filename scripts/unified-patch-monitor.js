#!/usr/bin/env node

/**
 * Unified Patch Monitor with Alert Correlation and Dashboard Integration
 * Coordinates all patch flow monitoring, health checks, and alerting
 * with unified logging to ROOT/.logs and prevents multi-channel echo
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Unified logging configuration
const ROOT_LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/';
const PATCH_EVENTS_LOG = path.join(ROOT_LOGS_DIR, 'patch-events.log');
const UNIFIED_MONITOR_LOG = path.join(ROOT_LOGS_DIR, 'unified-monitor.log');
const UNIFIED_MONITOR_STATUS_FILE = path.join(
  ROOT_LOGS_DIR,
  'unified-monitor-status.json',
);
const ALERT_CORRELATION_FILE = path.join(
  ROOT_LOGS_DIR,
  'alert-correlation.json',
);

// Ensure ROOT logs directory exists
if (!fs.existsSync(ROOT_LOGS_DIR)) {
  fs.mkdirSync(ROOT_LOGS_DIR, { recursive: true });
  console.log(`[MONITOR] Created unified log directory: ${ROOT_LOGS_DIR}`);
}

// Alert correlation state
let alertCorrelationState = {
  lastAlertTime: 0,
  alertCount: 0,
  correlatedAlerts: new Set(),
  alertUUIDs: new Map(),
};

// Load existing alert correlation state
function loadAlertCorrelationState() {
  try {
    if (fs.existsSync(ALERT_CORRELATION_FILE)) {
      const data = fs.readFileSync(ALERT_CORRELATION_FILE, 'utf8');
      const state = JSON.parse(data);
      alertCorrelationState = {
        ...alertCorrelationState,
        ...state,
        correlatedAlerts: new Set(state.correlatedAlerts || []),
        alertUUIDs: new Map(state.alertUUIDs || []),
      };
    }
  } catch (error) {
    console.error(
      '[MONITOR] Failed to load alert correlation state: ',
      error.message,
    );
  }
}

// Save alert correlation state
function saveAlertCorrelationState() {
  try {
    const stateToSave = {
      ...alertCorrelationState,
      correlatedAlerts: Array.from(alertCorrelationState.correlatedAlerts),
      alertUUIDs: Array.from(alertCorrelationState.alertUUIDs.entries()),
    };
    fs.writeFileSync(
      ALERT_CORRELATION_FILE,
      JSON.stringify(stateToSave, null, 2),
    );
  } catch (error) {
    console.error(
      '[MONITOR] Failed to save alert correlation state: ',
      error.message,
    );
  }
}

// Generate unique alert UUID
function generateAlertUUID(alertType, component) {
  const timestamp = Date.now();
  const hash = crypto
    .createHash('md5')
    .update(`${alertType}-${component}-${timestamp}`)
    .digest('hex');
  return `${alertType}-${component}-${hash.substring(0, 8)}`;
}

// Correlate alerts to prevent multi-channel echo
function correlateAlert(alertType, component, message, severity = 'info') {
  const alertUUID = generateAlertUUID(alertType, component);
  const now = Date.now();

  // Check if this is a duplicate alert (same type, component, message within 5 minutes)
  const alertKey = `${alertType}-${component}-${message}`;
  const lastAlertTime = alertCorrelationState.alertUUIDs.get(alertKey);

  if (lastAlertTime && now - lastAlertTime < 300000) {
    // 5 minutes
    console.log(`[MONITOR] Suppressing duplicate alert: ${alertKey}`);
    return null;
  }

  // Update correlation state
  alertCorrelationState.alertUUIDs.set(alertKey, now);
  alertCorrelationState.correlatedAlerts.add(alertUUID);
  alertCorrelationState.alertCount++;
  alertCorrelationState.lastAlertTime = now;

  // Save state
  saveAlertCorrelationState();

  return {
    uuid: alertUUID,
    timestamp: now,
    type: alertType,
    component,
    message,
    severity,
  };
}

// Send correlated alert with fallback
function sendCorrelatedAlert(alertType, component, message, severity = 'info') {
  const alert = correlateAlert(alertType, component, message, severity);
  if (!alert) return; // Suppressed duplicate;

  const alertData = {
    ...alert,
    timestamp_iso: new Date(alert.timestamp).toISOString(),
  };

  // Write to unified log
  writeUnifiedLog(UNIFIED_MONITOR_LOG, `ALERT: ${JSON.stringify(alertData)}`);

  // Send to Slack (with fallback);
  sendSlackAlert(alertData).catch((error) => {
    console.error('[MONITOR] Slack alert failed:', error.message);
    // Create local fallback alert;
    createLocalAlertFallback(alertData);
  });

  // Update dashboard if available;
  updateDashboardAlert(alertData);

  return alert;
}

// Send Slack alert with retry logic (real implementation with fallback);
async function sendSlackAlert(alertData) {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    throw new Error('SLACK_WEBHOOK_URL missing');
  }
  const payload = {
    text: `[$${alertData.severity.toUpperCase()}] ${alertData.component}: ${alertData.message} (${alertData.uuid})`,
  };
  // Lazy import to avoid hard dependency if not used
  const https = require('https');
  await new Promise((resolve, reject) => {
    try {
      const url = new URL(webhook);
      const req = https.request({
        method: 'POST',
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        // Consider 2xx as success;
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          return resolve();
        }
        reject(new Error(`Slack status ${res.statusCode}`));
      });
      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

// Create local alert fallback;
function createLocalAlertFallback(alertData) {
  try {
    const fallbackFile = path.join(ROOT_LOGS_DIR, 'LOCAL_ALERTS');
    const alertContent = `[${alertData.timestamp_iso}] ${alertData.severity.toUpperCase()}: ${alertData.message} (UUID: ${alertData.uuid})\n`;
    fs.appendFileSync(fallbackFile, alertContent);
  } catch (error) {
    console.error(
      '[MONITOR] Failed to create local alert fallback: ',
      error.message,
    );
  }
}

// Update dashboard alert;
function updateDashboardAlert(alertData) {
  try {
    const dashboardFile = path.join(ROOT_LOGS_DIR, 'dashboard-alerts.json');
    let dashboardAlerts = [];

    if (fs.existsSync(dashboardFile)) {
      const data = fs.readFileSync(dashboardFile, 'utf8');
      dashboardAlerts = JSON.parse(data);
    }

    // Add new alert (keep only last 50);
    dashboardAlerts.unshift(alertData);
    if (dashboardAlerts.length > 50) {
      dashboardAlerts = dashboardAlerts.slice(0, 50);
    }

    fs.writeFileSync(dashboardFile, JSON.stringify(dashboardAlerts, null, 2));
  } catch (error) {
    console.error(
      '[MONITOR] Failed to update dashboard alerts: ',
      error.message,
    );
  }
}

// Monitor stuck patches and provide manual intervention;
function monitorStuckPatches() {
  try {
    const stuckDir = path.join(ROOT_LOGS_DIR, '.stuck');
    if (!fs.existsSync(stuckDir)) return;

    const stuckFiles = fs
      .readdirSync(stuckDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => path.join(stuckDir, f));

    if (stuckFiles.length > 0) {
      const stuckAlert = {
        count: stuckFiles.length,
        files: stuckFiles.map((f) => path.basename(f)),
        oldest: getOldestFile(stuckFiles),
      };

      sendCorrelatedAlert(
        'stuck_patches',
        'unified-monitor',
        `${stuckAlert.count} stuck patches detected`,
        'warning',
      );

      // Create dashboard entry for manual intervention;
      createStuckPatchesDashboard(stuckAlert);
    }
  } catch (error) {
    console.error('[MONITOR] Failed to monitor stuck patches:', error.message);
  }
}

// Create stuck patches dashboard for manual intervention;
function createStuckPatchesDashboard(stuckAlert) {
  try {
    const dashboardFile = path.join(
      ROOT_LOGS_DIR,
      'stuck-patches-dashboard.json',
    );
    const dashboardData = {
      timestamp: new Date().toISOString(),
      stuck_count: stuckAlert.count,
      stuck_files: stuckAlert.files,
      oldest_stuck: stuckAlert.oldest,
      actions_available: [
        'force_retry',
        'move_to_failed',
        'delete_patch',
        'manual_review',
      ],
    };

    fs.writeFileSync(dashboardFile, JSON.stringify(dashboardData, null, 2));
  } catch (error) {
    console.error(
      '[MONITOR] Failed to create stuck patches dashboard: ',
      error.message,
    );
  }
}

// Get oldest file from list;
function getOldestFile(files) {
  let oldest = null;
  let oldestTime = Date.now();

  for (const file of files) {
    try {
      const stats = fs.statSync(file);
      if (stats.mtime.getTime() < oldestTime) {
        oldestTime = stats.mtime.getTime();
        oldest = path.basename(file);
      }
    } catch (error) {
      console.error(`[MONITOR] Failed to stat file ${file}:`, error.message);
    }
  }

  return oldest;
}

// Write to unified log with rotation;
function writeUnifiedLog(logFile, message) {
  try {
    // Check if log file exists and get its size;
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      const sizeMB = stats.size / (1024 * 1024);

      // Rotate if file is too large (5MB);
      if (sizeMB > 5) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = `${logFile}.${timestamp}.bak`;

        // Check for too many rotated files and purge oldest;
        const logDir = path.dirname(logFile);
        const rotatedFiles = fs
          .readdirSync(logDir)
          .filter((f) => f.includes('.bak'))
          .sort()
          .reverse();

        // Keep only the 10 most recent rotated files;
        if (rotatedFiles.length >= 10) {
          const filesToDelete = rotatedFiles.slice(10);
          filesToDelete.forEach((file) => {
            try {
              fs.unlinkSync(path.join(logDir, file));
              console.log(`[MONITOR] Purged old rotated log: ${file}`);
            } catch (e) {
              console.error(
                `[MONITOR] Failed to purge old log ${file}:`,
                e.message,
              );
            }
          });
        }

        fs.renameSync(logFile, backupFile);
        console.log(`[MONITOR] Rotated log file: ${logFile} -> ${backupFile}`);
      }
    }

    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(logFile, logEntry);
  } catch (error) {
    console.error(
      `[MONITOR] Failed to write to log ${logFile}:`,
      error.message,
    );
    handleLogWriteFailure(logFile, error, message);
  }
}

// Handle log write failure;
function handleLogWriteFailure(logFile, error, originalMessage) {
  const failureData = {
    timestamp: new Date().toISOString(),
    failedLogFile: logFile,
    error: error.message,
    originalMessage,
    component: 'unified-monitor',
  };

  // Try to write to fallback location
  const fallbackLog = path.join(process.cwd(), 'unified-monitor-fallback.log');
  try {
    const fallbackEntry = `[${failureData.timestamp}] LOG_WRITE_FAILURE: ${JSON.stringify(failureData)}\n`;
    fs.appendFileSync(fallbackLog, fallbackEntry);
  } catch (fallbackError) {
    console.error(
      '[MONITOR] CRITICAL: Even fallback logging failed:',
      fallbackError.message,
    );
  }

  // Create critical alert file
  const criticalAlertFile = path.join(ROOT_LOGS_DIR, 'CRITICAL_ALERT');
  try {
    const alertContent = `LOG_WRITE_FAILURE: ${new Date().toISOString()}\nComponent: unified-monitor\nFile: ${logFile}\nError: ${error.message}\n`;
    fs.writeFileSync(criticalAlertFile, alertContent);
  } catch (alertError) {
    console.error(
      '[MONITOR] CRITICAL: Failed to create alert file:',
      alertError.message,
    );
  }

  console.error(
    '[MONITOR] 🚨 CRITICAL: Log write failure - system may be degraded',
  );
}

// Main monitoring loop;
function startMonitoring() {
  console.log('[MONITOR] Starting unified patch monitoring...');

  // Load existing alert correlation state;
  loadAlertCorrelationState();

  // Initial status;
  const statusData = {
    timestamp: new Date().toISOString(),
    component: 'unified-monitor',
    status: 'running',
    alert_count: alertCorrelationState.alertCount,
    correlated_alerts: alertCorrelationState.correlatedAlerts.size,
  };

  fs.writeFileSync(
    UNIFIED_MONITOR_STATUS_FILE,
    JSON.stringify(statusData, null, 2),
  );

  // Start monitoring loop;
  setInterval(() => {
    try {
      // Heartbeat checks;
      checkHeartbeat(
        path.join(ROOT_LOGS_DIR, 'ghost-bridge-status.json'),
        60000,
        'ghost-bridge',
      );
      checkHeartbeat(
        path.join(ROOT_LOGS_DIR, 'patch-executor-status.json'),
        60000,
        'patch-executor',
      );
      // Monitor stuck patches;
      monitorStuckPatches();

      // Update status;
      const updatedStatus = {
        ...statusData,
        timestamp: new Date().toISOString(),
        alert_count: alertCorrelationState.alertCount,
        correlated_alerts: alertCorrelationState.correlatedAlerts.size,
      };

      fs.writeFileSync(
        UNIFIED_MONITOR_STATUS_FILE,
        JSON.stringify(updatedStatus, null, 2),
      );
    } catch (error) {
      console.error('[MONITOR] Monitoring loop error:', error.message);
      sendCorrelatedAlert(
        'monitoring_error',
        'unified-monitor',
        error.message,
        'error',
      );
    }
  }, 30000); // 30 seconds

  console.log('[MONITOR] Unified patch monitoring started successfully');
}

// Heartbeat reader and stale detection;
function checkHeartbeat(statusFile, staleMs, component) {
  try {
    if (!fs.existsSync(statusFile)) {
      sendCorrelatedAlert(
        'heartbeat_missing',
        component,
        `${component} status file missing`,
        'warning',
      );
      return;
    }
    const data = JSON.parse(fs.readFileSync(statusFile, 'utf8'));
    const ts = data.timestamp ? Date.parse(data.timestamp) : NaN;
    if (Number.isNaN(ts)) {
      sendCorrelatedAlert(
        'heartbeat_invalid',
        component,
        `${component} timestamp invalid`,
        'warning',
      );
      return;
    }
    const age = Date.now() - ts;
    if (age > staleMs) {
      sendCorrelatedAlert(
        'heartbeat_stale',
        component,
        `${component} heartbeat stale ${Math.floor(age / 1000)}s`,
        'error',
      );
    }
  } catch (e) {
    sendCorrelatedAlert(
      'heartbeat_check_failed',
      component,
      e.message,
      'error',
    );
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('[MONITOR] Shutting down unified patch monitor...');
  saveAlertCorrelationState();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[MONITOR] Shutting down unified patch monitor...');
  saveAlertCorrelationState();
  process.exit(0);
});

// Start monitoring if run directly;
if (require.main === module) {
  startMonitoring();
}

module.exports = {
  sendCorrelatedAlert,
  monitorStuckPatches,
  writeUnifiedLog,
  startMonitoring,
  sendSlackAlert,
  createLocalAlertFallback,
};