#!/usr/bin/env node

/**
 * Patch Delivery Tracker
 * Tracks patches from delivery to execution with detailed status
 * Focuses on patch lifecycle rather than just heartbeats
 */

const fs = require('fs');
const path = require('path');

const PATCH_TRACKING_CONFIG = {
  CYOPS_PATCHES: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.completed',
  CYOPS_SUMMARIES: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
  MAIN_PATCHES: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed',
  MAIN_SUMMARIES: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries',
  TRACKING_LOG: '/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-delivery-tracker.log'
};

class PatchDeliveryTracker {
  constructor() {
    this.tracking = false;
    this.trackingInterval = null;
    this.lastStatus = {};
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    console.log(logMessage.trim());
    
    try {
      fs.appendFileSync(PATCH_TRACKING_CONFIG.TRACKING_LOG, logMessage);
    } catch (error) {
      console.error('Failed to write to tracking log:', error.message);
    }
  }

  async getPatchStatus(systemKey) {
    const config = systemKey === 'CYOPS' ? {
      patches: PATCH_TRACKING_CONFIG.CYOPS_PATCHES,
      summaries: PATCH_TRACKING_CONFIG.CYOPS_SUMMARIES
    } : {
      patches: PATCH_TRACKING_CONFIG.MAIN_PATCHES,
      summaries: PATCH_TRACKING_CONFIG.MAIN_SUMMARIES
    };

    try {
      // Get all patch files
      const patchFiles = fs.readdirSync(config.patches)
        .filter(f => f.endsWith('.json'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(config.patches, a));
          const statB = fs.statSync(path.join(config.patches, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        });

      // Get all summary files
      const summaryFiles = fs.readdirSync(config.summaries)
        .filter(f => f.endsWith('.summary.md'))
        .sort((a, b) => {
          const statA = fs.statSync(path.join(config.summaries, a));
          const statB = fs.statSync(path.join(config.summaries, b));
          return statB.mtime.getTime() - statA.mtime.getTime();
        });

      // Track patch lifecycle
      const patchLifecycle = [];
      
      for (const patchFile of patchFiles.slice(0, 10)) { // Last 10 patches
        const patchPath = path.join(config.patches, patchFile);
        const patchStat = fs.statSync(patchPath);
        const patchId = patchFile.replace('.json', '');
        
        // Find corresponding summary
        const summaryFile = summaryFiles.find(s => s.includes(patchId));
        const summaryPath = summaryFile ? path.join(config.summaries, summaryFile) : null;
        
        let status = 'DELIVERED';
        let executionTime = null;
        let completionTime = null;
        
        if (summaryPath) {
          const summaryStat = fs.statSync(summaryPath);
          const summaryContent = fs.readFileSync(summaryPath, 'utf8');
          
          if (summaryContent.includes('Status: PASS')) {
            status = 'EXECUTED_SUCCESS';
            executionTime = summaryStat.mtime;
          } else if (summaryContent.includes('Status: FAIL')) {
            status = 'EXECUTED_FAILED';
            executionTime = summaryStat.mtime;
          } else {
            status = 'IN_PROGRESS';
          }
          
          completionTime = summaryStat.mtime;
        }
        
        patchLifecycle.push({
          patchId,
          deliveryTime: patchStat.mtime,
          executionTime,
          completionTime,
          status,
          duration: executionTime ? 
            Math.round((executionTime.getTime() - patchStat.mtime.getTime()) / 1000) : null
        });
      }

      return {
        system: systemKey,
        totalPatches: patchFiles.length,
        totalSummaries: summaryFiles.length,
        recentPatches: patchLifecycle,
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      this.log(`Error tracking ${systemKey} patches: ${error.message}`);
      return {
        system: systemKey,
        error: error.message,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  async displayPatchTracking() {
    this.log('🔍 Patch Delivery Tracker - Delivery to Execution Status');
    this.log('=' .repeat(80));

    const cyopsStatus = await this.getPatchStatus('CYOPS');
    const mainStatus = await this.getPatchStatus('MAIN');

    // Display CYOPS status
    this.log('\n📦 CYOPS Patch Tracking:');
    this.log(`   Total Patches: ${cyopsStatus.totalPatches || 0}`);
    this.log(`   Total Summaries: ${cyopsStatus.totalSummaries || 0}`);
    
    if (cyopsStatus.recentPatches) {
      this.log('   Recent Patch Lifecycle:');
      cyopsStatus.recentPatches.forEach(patch => {
        const statusIcon = {
          DELIVERED: '📨',
          IN_PROGRESS: '⏳',
          EXECUTED_SUCCESS: '✅',
          EXECUTED_FAILED: '❌'
        }[patch.status] || '❓';
        
        const duration = patch.duration ? `(${patch.duration}s)` : '';
        this.log(`     ${statusIcon} ${patch.patchId} - ${patch.status} ${duration}`);
      });
    }

    // Display MAIN status
    this.log('\n📦 MAIN Patch Tracking:');
    this.log(`   Total Patches: ${mainStatus.totalPatches || 0}`);
    this.log(`   Total Summaries: ${mainStatus.totalSummaries || 0}`);
    
    if (mainStatus.recentPatches) {
      this.log('   Recent Patch Lifecycle:');
      mainStatus.recentPatches.forEach(patch => {
        const statusIcon = {
          DELIVERED: '📨',
          IN_PROGRESS: '⏳',
          EXECUTED_SUCCESS: '✅',
          EXECUTED_FAILED: '❌'
        }[patch.status] || '❓';
        
        const duration = patch.duration ? `(${patch.duration}s)` : '';
        this.log(`     ${statusIcon} ${patch.patchId} - ${patch.status} ${duration}`);
      });
    }

    // Summary statistics
    this.log('\n📊 Summary Statistics:');
    const allPatches = [
      ...(cyopsStatus.recentPatches || []),
      ...(mainStatus.recentPatches || [])
    ];
    
    const delivered = allPatches.filter(p => p.status === 'DELIVERED').length;
    const inProgress = allPatches.filter(p => p.status === 'IN_PROGRESS').length;
    const executedSuccess = allPatches.filter(p => p.status === 'EXECUTED_SUCCESS').length;
    const executedFailed = allPatches.filter(p => p.status === 'EXECUTED_FAILED').length;
    
    this.log(`   📨 Delivered: ${delivered}`);
    this.log(`   ⏳ In Progress: ${inProgress}`);
    this.log(`   ✅ Executed Success: ${executedSuccess}`);
    this.log(`   ❌ Executed Failed: ${executedFailed}`);
    
    if (executedSuccess + executedFailed > 0) {
      const successRate = Math.round((executedSuccess / (executedSuccess + executedFailed)) * 100);
      this.log(`   📈 Success Rate: ${successRate}%`);
    }

    // Average execution time
    const executedPatches = allPatches.filter(p => p.duration !== null);
    if (executedPatches.length > 0) {
      const avgDuration = Math.round(
        executedPatches.reduce((sum, p) => sum + p.duration, 0) / executedPatches.length
      );
      this.log(`   ⏱️  Average Execution Time: ${avgDuration}s`);
    }

    this.log(`\n🔄 Last Update: ${new Date().toISOString()}`);
    this.log('=' .repeat(80));
  }

  start() {
    if (this.tracking) {
      this.log('Patch delivery tracker already running');
      return;
    }

    this.tracking = true;
    this.log('🚀 Starting Patch Delivery Tracker...');
    
    // Initial display
    this.displayPatchTracking();
    
    // Set up interval for continuous tracking
    this.trackingInterval = setInterval(() => {
      this.displayPatchTracking();
    }, 30000); // Update every 30 seconds
    
    this.log('✅ Patch Delivery Tracker started - monitoring patch delivery to execution');
  }

  stop() {
    if (!this.tracking) {
      this.log('Patch delivery tracker not running');
      return;
    }

    this.tracking = false;
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    this.log('🛑 Patch Delivery Tracker stopped');
  }

  async getStatusForAPI() {
    const cyopsStatus = await this.getPatchStatus('CYOPS');
    const mainStatus = await this.getPatchStatus('MAIN');
    
    return {
      timestamp: new Date().toISOString(),
      systems: {
        CYOPS: cyopsStatus,
        MAIN: mainStatus
      },
      summary: {
        totalPatches: (cyopsStatus.totalPatches || 0) + (mainStatus.totalPatches || 0),
        totalSummaries: (cyopsStatus.totalSummaries || 0) + (mainStatus.totalSummaries || 0),
        recentActivity: [
          ...(cyopsStatus.recentPatches || []).slice(0, 5),
          ...(mainStatus.recentPatches || []).slice(0, 5)
        ].sort((a, b) => new Date(b.deliveryTime) - new Date(a.deliveryTime))
      }
    };
  }
}

// CLI interface
if (require.main === module) {
  const tracker = new PatchDeliveryTracker();
  const command = process.argv[2];

  switch (command) {
  case 'start':
    tracker.start();
    break;
  case 'stop':
    tracker.stop();
    break;
  case 'status':
    tracker.displayPatchTracking();
    break;
  case 'api':
    tracker.getStatusForAPI().then(status => {
      console.log(JSON.stringify(status, null, 2));
    });
    break;
  default:
    console.log(`
🔍 Patch Delivery Tracker

Usage: node patch-delivery-tracker.js [start|stop|status|api]

Commands:
  start   - Start continuous patch delivery tracking
  stop    - Stop patch delivery tracking
  status  - Show current patch delivery status once
  api     - Show status in JSON format for API integration

This tracker monitors patches from delivery to execution
with detailed lifecycle tracking and statistics.
      `);
  }
}

module.exports = PatchDeliveryTracker; 