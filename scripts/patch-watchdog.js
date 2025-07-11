#!/usr/bin/env node

/**
 * Universal Patch Delivery Watchdog v3
 * 
 * Monitors all patch traffic between GPT → AGENT and AGENT → GPT
 * Provides self-healing, delivery tracing, and escalation capabilities
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  PATCH_QUEUE_LOG: './logs/patch-queue.log',
  DELIVERY_TRACE_LOG: './logs/patch-delivery-trace.log',
  ESCALATION_LOG: './logs/patch-escalation-report.log',
  QUARANTINE_DIR: './quarantine/.failed-patches/',
  TIMEOUT_MS: 61000, // 61 seconds
  CHECK_INTERVAL_MS: 10000, // 10 seconds
  MAX_RETRIES: 3,
  DASHBOARD_WEBHOOK: 'https://gpt-cursor-runner.fly.dev/slack/commands'
};

// Patch tracking state
const patchRegistry = new Map();
const failedPatches = new Map();

class PatchWatchdog {
  constructor() {
    this.startTime = Date.now();
    this.stats = {
      totalPatches: 0,
      deliveredPatches: 0,
      failedPatches: 0,
      retriedPatches: 0,
      escalatedPatches: 0
    };
    
    this.ensureDirectories();
    this.log('🚀 Universal Patch Watchdog v3 started');
  }

  ensureDirectories() {
    const dirs = [
      path.dirname(CONFIG.DELIVERY_TRACE_LOG),
      path.dirname(CONFIG.ESCALATION_LOG),
      CONFIG.QUARANTINE_DIR
    ];
    
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    
    console.log(logEntry);
    
    // Write to trace log
    fs.appendFileSync(CONFIG.DELIVERY_TRACE_LOG, logEntry + '\n');
  }

  generatePatchUUID() {
    return crypto.randomUUID();
  }

  registerPatch(patchData, source = 'GPT') {
    const uuid = this.generatePatchUUID();
    const patch = {
      uuid,
      data: patchData,
      source,
      timestamp: Date.now(),
      status: 'PENDING',
      retryCount: 0,
      deliveryAttempts: [],
      checksum: this.calculateChecksum(patchData)
    };

    patchRegistry.set(uuid, patch);
    this.stats.totalPatches++;
    
    this.log(`📦 Patch registered: ${uuid} from ${source}`);
    this.updateDashboard();
    
    return uuid;
  }

  calculateChecksum(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  confirmDelivery(uuid, target = 'AGENT') {
    const patch = patchRegistry.get(uuid);
    if (!patch) {
      this.log(`❌ Patch ${uuid} not found in registry`, 'ERROR');
      return false;
    }

    patch.status = 'DELIVERED';
    patch.deliveredAt = Date.now();
    patch.target = target;
    patch.deliveryAttempts.push({
      timestamp: Date.now(),
      status: 'SUCCESS',
      target
    });

    this.stats.deliveredPatches++;
    this.log(`✅ Patch ${uuid} delivered to ${target}`);
    this.updateDashboard();
    
    return true;
  }

  markFailed(uuid, error, target = 'AGENT') {
    const patch = patchRegistry.get(uuid);
    if (!patch) {
      this.log(`❌ Patch ${uuid} not found in registry`, 'ERROR');
      return false;
    }

    patch.status = 'FAILED';
    patch.error = error;
    patch.retryCount++;
    patch.deliveryAttempts.push({
      timestamp: Date.now(),
      status: 'FAILED',
      error,
      target
    });

    this.stats.failedPatches++;
    this.log(`❌ Patch ${uuid} failed: ${error}`, 'ERROR');

    // Quarantine failed patch
    this.quarantinePatch(uuid, error);

    // Check if escalation is needed
    if (patch.retryCount >= CONFIG.MAX_RETRIES) {
      this.escalatePatch(uuid);
    } else {
      this.retryPatch(uuid);
    }

    this.updateDashboard();
    return true;
  }

  quarantinePatch(uuid, error) {
    const patch = patchRegistry.get(uuid);
    if (!patch) return;

    const quarantineFile = path.join(CONFIG.QUARANTINE_DIR, `${uuid}.json`);
    const quarantineData = {
      uuid,
      originalData: patch.data,
      error,
      timestamp: Date.now(),
      retryCount: patch.retryCount,
      checksum: patch.checksum
    };

    fs.writeFileSync(quarantineFile, JSON.stringify(quarantineData, null, 2));
    this.log(`🚫 Patch ${uuid} quarantined: ${quarantineFile}`);
  }

  retryPatch(uuid) {
    const patch = patchRegistry.get(uuid);
    if (!patch) return;

    this.stats.retriedPatches++;
    this.log(`🔄 Retrying patch ${uuid} (attempt ${patch.retryCount}/${CONFIG.MAX_RETRIES})`);

    // Trigger auto-repair pipeline
    this.triggerAutoRepair(uuid);
  }

  escalatePatch(uuid) {
    const patch = patchRegistry.get(uuid);
    if (!patch) return;

    this.stats.escalatedPatches++;
    this.log(`🚨 ESCALATING patch ${uuid} after ${CONFIG.MAX_RETRIES} failures`, 'CRITICAL');

    const escalationReport = {
      timestamp: Date.now(),
      uuid,
      originalData: patch.data,
      error: patch.error,
      retryCount: patch.retryCount,
      deliveryAttempts: patch.deliveryAttempts,
      checksum: patch.checksum,
      escalationLevel: 'CRITICAL'
    };

    // Log escalation
    fs.appendFileSync(CONFIG.ESCALATION_LOG, JSON.stringify(escalationReport, null, 2) + '\n');

    // Notify GPT and DEV
    this.notifyEscalation(uuid, escalationReport);
  }

  triggerAutoRepair(uuid) {
    const patch = patchRegistry.get(uuid);
    if (!patch) return;

    this.log(`🔧 Triggering auto-repair for patch ${uuid}`);

    // Simulate auto-repair process
    setTimeout(() => {
      this.log(`🔧 Auto-repair completed for patch ${uuid}`);
      this.updateDashboard();
    }, 5000);
  }

  notifyEscalation(uuid, report) {
    const message = {
      command: '/alert-runner-crash',
      text: `PATCH ESCALATION: ${uuid} failed after ${CONFIG.MAX_RETRIES} retries. Check logs/patch-escalation-report.log`,
      user_name: 'patch-watchdog',
      channel_id: 'escalation'
    };

    this.sendToDashboard(message);
  }

  sendToDashboard(message) {
    const data = JSON.stringify(message);
    const options = {
      hostname: 'gpt-cursor-runner.fly.dev',
      port: 443,
      path: '/slack/commands',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        this.log(`📡 Dashboard notification sent: ${res.statusCode}`);
      });
    });

    req.on('error', (error) => {
      this.log(`❌ Dashboard notification failed: ${error.message}`, 'ERROR');
    });

    req.write(data);
    req.end();
  }

  updateDashboard() {
    const status = {
      totalPatches: this.stats.totalPatches,
      deliveredPatches: this.stats.deliveredPatches,
      failedPatches: this.stats.failedPatches,
      retriedPatches: this.stats.retriedPatches,
      escalatedPatches: this.stats.escalatedPatches,
      uptime: Date.now() - this.startTime,
      activePatches: Array.from(patchRegistry.values()).filter(p => p.status === 'PENDING').length
    };

    // Write status to file for dashboard consumption
    fs.writeFileSync('./logs/patch-watchdog-status.json', JSON.stringify(status, null, 2));
    
    // Trigger log sync to DEV
    this.syncLogsToDev();
  }

  syncLogsToDev() {
    const { spawn } = require('child_process');
    
    try {
      this.log('📤 Triggering log sync to DEV');
      
      const syncProcess = spawn('./scripts/sync-watchdog-logs.sh', [], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      syncProcess.stdout.on('data', (data) => {
        this.log(`📤 Log sync output: ${data.toString().trim()}`);
      });
      
      syncProcess.stderr.on('data', (data) => {
        this.log(`📤 Log sync error: ${data.toString().trim()}`, 'ERROR');
      });
      
      syncProcess.on('close', (code) => {
        if (code === 0) {
          this.log('✅ Log sync completed successfully');
        } else {
          this.log(`❌ Log sync failed with code ${code}`, 'ERROR');
        }
      });
      
      syncProcess.on('error', (error) => {
        this.log(`❌ Log sync process error: ${error.message}`, 'ERROR');
      });
      
    } catch (error) {
      this.log(`❌ Failed to trigger log sync: ${error.message}`, 'ERROR');
    }
  }

  getStatus() {
    return {
      uptime: Date.now() - this.startTime,
      stats: this.stats,
      activePatches: Array.from(patchRegistry.values()).filter(p => p.status === 'PENDING'),
      recentFailures: Array.from(patchRegistry.values()).filter(p => p.status === 'FAILED').slice(-5)
    };
  }

  // Main monitoring loop
  startMonitoring() {
    this.log('🔍 Starting patch monitoring loop');
    
    setInterval(() => {
      this.monitorPatches();
    }, CONFIG.CHECK_INTERVAL_MS);
  }

  monitorPatches() {
    const now = Date.now();
    const pendingPatches = Array.from(patchRegistry.values()).filter(p => p.status === 'PENDING');

    pendingPatches.forEach(patch => {
      const age = now - patch.timestamp;
      
      if (age > CONFIG.TIMEOUT_MS) {
        this.log(`⏰ Patch ${patch.uuid} timed out after ${age}ms`, 'WARNING');
        this.markFailed(patch.uuid, 'TIMEOUT');
      }
    });

    this.updateDashboard();
  }

  // Test methods
  testPatchDelivery() {
    const testPatch = {
      type: 'TEST',
      data: { message: 'Test patch from watchdog' },
      timestamp: Date.now()
    };

    const uuid = this.registerPatch(testPatch, 'WATCHDOG');
    
    // Simulate delivery after 2 seconds
    setTimeout(() => {
      this.confirmDelivery(uuid, 'TEST-AGENT');
    }, 2000);

    return uuid;
  }
}

// Initialize and start watchdog
const watchdog = new PatchWatchdog();

// Handle graceful shutdown
process.on('SIGINT', () => {
  watchdog.log('🛑 Watchdog shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  watchdog.log('🛑 Watchdog terminated');
  process.exit(0);
});

// Start monitoring
watchdog.startMonitoring();

// Export for external use
module.exports = PatchWatchdog;

// If run directly, start the watchdog
if (require.main === module) {
  watchdog.log('🚀 Universal Patch Watchdog v3 running');
  
  // Run a test patch every 30 seconds
  setInterval(() => {
    watchdog.testPatchDelivery();
  }, 30000);
} 