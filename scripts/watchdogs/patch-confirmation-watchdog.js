// ✅ patch-confirmation-watchdog.js
// Monitors and self-heals missing or unexecuted patches in MAIN and CYOPS pipelines
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class PatchConfirmationWatchdog {
  constructor() {
    this.baseDir = '/Users/sawyer/gitSync/.cursor-cache';
    this.logFile = '/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-confirmation-watchdog.log';
    this.retryCounts = new Map();
    this.maxRetries = 2;
    
    // Specific patches to monitor
    this.patchesToMonitor = {
      MAIN: {
        patch: 'patch-v1.4.204(P1.10.02)_jsx-role-snapshot-baseline-enforced.json',
        summary: 'patch-v1.4.204(P1.10.02)_jsx-role-snapshot-baseline-enforced.md'
      },
      CYOPS: {
        patch: 'patch-v3.3.30(P14.01.05)_dashboard-layout-and-refresh-fix.json',
        summary: 'patch-v3.3.30(P14.01.05)_dashboard-layout-and-refresh-fix.md'
      }
    };
  }

  // Log message with timestamp
  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Write to log file
    try {
      fs.appendFileSync(this.logFile, `${logMessage  }\n`);
    } catch (_err) {
      console.error('Failed to write to log file:', err);
    }
  }

  // Check if daemon processes are running
  async checkDaemonPresence() {
    const daemons = ['patch-executor', 'summary-monitor'];
    const results = {};

    for (const daemon of daemons) {
      results[daemon] = await this.isProcessRunning(daemon);
    }

    return results;
  }

  // Check if a process is running using multiple methods
  async isProcessRunning(processName) {
    return new Promise((resolve) => {
      const commands = [
        `ps aux | grep "${processName}" | grep -v grep | wc -l`,
        `pgrep -f "${processName}" | wc -l`
      ];

      let completedChecks = 0;
      let runningCount = 0;

      commands.forEach(cmd => {
        exec(cmd, (error, stdout) => {
          completedChecks++;
          if (!error && stdout) {
            const count = parseInt(stdout.trim());
            if (count > 0) runningCount++;
          }

          if (completedChecks === commands.length) {
            resolve(runningCount > 0);
          }
        });
      });
    });
  }

  // Check patch and summary status for a role
  checkPatchStatus(role, patchInfo) {
    const patchPath = path.join(this.baseDir, role, 'patches', patchInfo.patch);
    const summaryPath = path.join(this.baseDir, role, 'summaries', patchInfo.summary);
    const completedPath = path.join(this.baseDir, role, 'patches/.completed', patchInfo.patch);
    const failedPath = path.join(this.baseDir, role, 'patches/.failed', patchInfo.patch);

    const status = {
      role,
      patch: patchInfo.patch,
      summary: patchInfo.summary,
      patchExists: fs.existsSync(patchPath),
      summaryExists: fs.existsSync(summaryPath),
      completedExists: fs.existsSync(completedPath),
      failedExists: fs.existsSync(failedPath),
      needsRequeue: false,
      needsSummary: false
    };

    // Check if patch needs requeuing
    if (!status.patchExists && !status.completedExists && !status.failedExists) {
      status.needsRequeue = true;
      this.log(`[${role}] Patch missing: ${patchInfo.patch}`);
    }

    // Check if summary is missing
    if (!status.summaryExists) {
      status.needsSummary = true;
      this.log(`[${role}] Summary not found: ${patchInfo.summary}`);
    }

    return status;
  }

  // Attempt to requeue a missing patch
  async requeuePatch(role, patchInfo) {
    const retryKey = `${role}-${patchInfo.patch}`;
    const currentRetries = this.retryCounts.get(retryKey) || 0;

    if (currentRetries >= this.maxRetries) {
      this.log(`[${role}] Max retries reached for ${patchInfo.patch}, logging health error`);
      return false;
    }

    try {
      // Try multiple source locations
      const sourceLocations = [
        path.join('/Users/sawyer/gitSync/cursor-cache', role, 'patches', patchInfo.patch),
        path.join('/Users/sawyer/gitSync/gpt-cursor-runner/patches', patchInfo.patch),
        path.join('/Users/sawyer/gitSync/tm-mobile-cursor/MAIN/patches', patchInfo.patch)
      ];

      let requeued = false;
      for (const sourcePath of sourceLocations) {
        if (fs.existsSync(sourcePath)) {
          const targetPath = path.join(this.baseDir, role, 'patches', patchInfo.patch);
          fs.copyFileSync(sourcePath, targetPath);
          this.log(`[${role}] Requeued patch: ${patchInfo.patch} from ${sourcePath}`);
          requeued = true;
          break;
        }
      }

      if (!requeued) {
        this.log(`[${role}] Failed to requeue ${patchInfo.patch}: source not found`);
        this.retryCounts.set(retryKey, currentRetries + 1);
        return false;
      }

      // Reset retry count on success
      this.retryCounts.delete(retryKey);
      return true;

    } catch (_err) {
      this.log(`[${role}] Failed to requeue ${patchInfo.patch}: ${err.message}`);
      this.retryCounts.set(retryKey, currentRetries + 1);
      return false;
    }
  }

  // Generate missing summary
  async generateSummary(role, patchInfo) {
    try {
      const summaryPath = path.join(this.baseDir, role, 'summaries', patchInfo.summary);
      const summaryContent = `# Patch Summary: ${patchInfo.patch}

## Patch Details
- **Patch ID**: ${patchInfo.patch}
- **Target**: ${role}
- **Status**: ⚠️ PENDING CONFIRMATION
- **Timestamp**: ${new Date().toISOString()}

## Issue Detected
This summary was auto-generated by the patch confirmation watchdog because the original summary was missing.

## Action Required
- Verify patch execution status
- Check daemon logs for execution traces
- Confirm patch completion or failure
- Update this summary with actual results

---
**Auto-generated by**: patch-confirmation-watchdog
**Generated at**: ${new Date().toISOString()}
`;

      fs.writeFileSync(summaryPath, summaryContent);
      this.log(`[${role}] Generated missing summary: ${patchInfo.summary}`);
      return true;

    } catch (_err) {
      this.log(`[${role}] Failed to generate summary ${patchInfo.summary}: ${err.message}`);
      return false;
    }
  }

  // Main monitoring function
  async monitorPatches() {
    this.log('Starting patch confirmation watchdog...');

    // Check daemon presence
    const daemonStatus = await this.checkDaemonPresence();
    this.log(`Daemon status: ${JSON.stringify(daemonStatus)}`);

    // Check each role's patches
    for (const [role, patchInfo] of Object.entries(this.patchesToMonitor)) {
      const status = this.checkPatchStatus(role, patchInfo);
      
      if (status.needsRequeue) {
        await this.requeuePatch(role, patchInfo);
      }

      if (status.needsSummary) {
        await this.generateSummary(role, patchInfo);
      }

      // Log final status
      this.log(`[${role}] Status: patch=${status.patchExists}, summary=${status.summaryExists}, completed=${status.completedExists}`);
    }

    this.log('Patch confirmation watchdog cycle completed');
  }

  // Start continuous monitoring
  startMonitoring(intervalMs = 60000) { // 1 minute intervals
    this.log(`Starting continuous monitoring with ${intervalMs}ms intervals`);
    
    // Run initial check
    this.monitorPatches();

    // Set up continuous monitoring
    setInterval(() => {
      this.monitorPatches();
    }, intervalMs);
  }
}

// Export for use in other modules
module.exports = PatchConfirmationWatchdog;

// If run directly, start monitoring
if (require.main === module) {
  const watchdog = new PatchConfirmationWatchdog();
  watchdog.startMonitoring();
} 