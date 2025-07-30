#!/usr/bin/env node

/**
 * Reliable Status Checker
 * Uses file-based detection instead of ps aux to avoid resource issues
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { concatenateFilename } = require('../../utils/filename-concatenator');

class ReliableStatus {
  constructor() {
    this.projectRoot = process.cwd();
    this.patchesPath = path.join(this.projectRoot, 'mobile-native-fresh', 'src-nextgen', 'patches');
    this.summariesPath = path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'summaries');
    this.logsPath = path.join(this.projectRoot, 'logs');
    this.pidDir = path.join(this.logsPath, 'daemons');
  }

  // Check if daemon is running by PID file
  isDaemonRunning(daemonName) {
    const pidFile = path.join(this.pidDir, `${daemonName}.pid`);
    if (fs.existsSync(pidFile)) {
      try {
        const pid = fs.readFileSync(pidFile, 'utf8').trim();
        // Check if process exists without using ps
        try {
          process.kill(pid, 0); // Signal 0 just checks if process exists
          return true;
        } catch (_e) {
          // Process doesn't exist, remove stale PID file
          fs.unlinkSync(pidFile);
          return false;
        }
      } catch (_e) {
        return false;
      }
    }
    return false;
  }

  // Check if process is running by log file activity
  isProcessActive(processName) {
    const logFile = path.join(this.logsPath, `${processName}.log`);
    if (fs.existsSync(logFile)) {
      try {
        const stats = fs.statSync(logFile);
        const now = new Date();
        const fileAge = now - stats.mtime;
        // Consider active if log file was modified in last 5 minutes
        return fileAge < 5 * 60 * 1000;
      } catch (_e) {
        return false;
      }
    }
    return false;
  }

  // Check patch status
  getPatchStatus() {
    try {
      const status = { pending: 0, executing: 0, completed: 0, failed: 0 };
            
      if (fs.existsSync(this.patchesPath)) {
        // Check main patches directory
        const mainPatches = fs.readdirSync(this.patchesPath)
          .filter(file => file.endsWith('.json') && file.startsWith('patch-'))
          .filter(file => !file.includes('.archive') && !file.includes('.completed') && !file.includes('.failed'));
                
        status.pending = mainPatches.length;
                
        // Check completed patches
        const completedPath = path.join(this.patchesPath, '.completed');
        if (fs.existsSync(completedPath)) {
          status.completed = fs.readdirSync(completedPath).filter(f => f.endsWith('.json')).length;
        }
                
        // Check failed patches
        const failedPath = path.join(this.patchesPath, '.failed');
        if (fs.existsSync(failedPath)) {
          status.failed = fs.readdirSync(failedPath).filter(f => f.endsWith('.json')).length;
        }
                
        // Check archived patches
        const archivePath = path.join(this.patchesPath, '.archive');
        if (fs.existsSync(archivePath)) {
          const archived = fs.readdirSync(archivePath).filter(f => f.endsWith('.json')).length;
          status.completed += archived;
        }
      }
            
      return status;
    } catch (_error) {
      return { pending: 0, executing: 0, completed: 0, failed: 0 };
    }
  }

  // Check system status using file-based detection
  getSystemStatus() {
    const systems = { running: [], stopped: [] };
        
    // Check each system using multiple methods
    const systemChecks = [
      { name: 'backend-api', check: () => this.isProcessActive('backend') || this.isProcessActive('nodemon') },
      { name: 'expo-dev-server', check: () => this.isProcessActive('expo') },
      { name: 'summary-monitor', check: () => this.isDaemonRunning('summary-monitor') || this.isProcessActive('summary-monitor') },
      { name: 'realtime-monitor', check: () => this.isDaemonRunning('realtime-monitor') || this.isProcessActive('realtime-monitor') },
      { name: 'patch-executor', check: () => this.isDaemonRunning('patch-executor') || this.isProcessActive('patch-executor') },
      { name: 'ghost-bridge', check: () => this.isDaemonRunning('ghost-bridge') || this.isProcessActive('ghost-bridge') }
    ];
        
    systemChecks.forEach(system => {
      if (system.check()) {
        systems.running.push(system.name);
      } else {
        systems.stopped.push(system.name);
      }
    });
        
    return systems;
  }

  // Check ghost runner status
  async getGhostStatus() {
    return new Promise((resolve) => {
      exec('curl -s --connect-timeout 5 "https://runner.thoughtmarks.app/health"', (error, stdout) => {
        if (error) {
          resolve({
            status: 'unreachable',
            lastCheck: new Date().toISOString(),
            url: 'https://runner.thoughtmarks.app/health'
          });
        } else {
          try {
            const response = JSON.parse(stdout);
            resolve({
              status: response.status || 'running',
              lastCheck: new Date().toISOString(),
              url: 'https://runner.thoughtmarks.app/health'
            });
          } catch (_e) {
            resolve({
              status: 'running',
              lastCheck: new Date().toISOString(),
              url: 'https://runner.thoughtmarks.app/health'
            });
          }
        }
      });
    });
  }

  // Get recent activity
  getRecentActivity() {
    try {
      if (fs.existsSync(this.summariesPath)) {
        const summaryFiles = fs.readdirSync(this.summariesPath)
          .filter(f => f.endsWith('.md'))
          .sort((a, b) => {
            const aStat = fs.statSync(path.join(this.summariesPath, a));
            const bStat = fs.statSync(path.join(this.summariesPath, b));
            return bStat.mtime - aStat.mtime;
          })
          .slice(0, 10);
                
        return summaryFiles.map(file => {
          const stat = fs.statSync(path.join(this.summariesPath, file));
          return {
            file,
            time: stat.mtime.toLocaleTimeString(),
            date: stat.mtime.toLocaleDateString(),
            size: stat.size
          };
        });
      }
      return [];
    } catch (_error) {
      return [];
    }
  }

  // Display status
  async displayStatus() {
    const patches = this.getPatchStatus();
    const systems = this.getSystemStatus();
    const ghost = await this.getGhostStatus();
    const recent = this.getRecentActivity();
        
    console.log('🔍 **RELIABLE SYSTEM STATUS**');
    console.log('=' .repeat(50));
    console.log(`📅 ${new Date().toLocaleString()}`);
    console.log('');
        
    // Patch Status
    console.log('📦 **Patch Status:**');
    console.log(`   • Pending: ${patches.pending} | Executing: ${patches.executing} | Completed: ${patches.completed} | Failed: ${patches.failed}`);
    console.log('');
        
    // System Status
    console.log('🖥️ **System Status:**');
    if (systems.running.length > 0) {
      console.log(`   ✅ Running: ${systems.running.join(', ')}`);
    }
    if (systems.stopped.length > 0) {
      console.log(`   ❌ Stopped: ${systems.stopped.join(', ')}`);
    }
    console.log('');
        
    // Ghost Status
    console.log('👻 **Ghost Runner:**');
    console.log(`   Status: ${ghost.status.toUpperCase()}`);
    console.log(`   Last Check: ${new Date(ghost.lastCheck).toLocaleTimeString()}`);
    console.log(`   URL: ${ghost.url}`);
    console.log('');
        
    // Recent Activity
    if (recent.length > 0) {
      console.log('📋 **Recent Activity (Last 10):**');
      recent.forEach(activity => {
        const concatenatedFile = concatenateFilename(activity.file);
        console.log(`   📄 ${concatenatedFile} (${activity.time})`);
      });
      console.log('');
    }
        
    console.log(`🕐 **Last Update:** ${  new Date().toLocaleTimeString()}`);
  }
}

// CLI interface
const status = new ReliableStatus();

if (process.argv[2] === 'live') {
  // Live mode
  console.log('🔍 **LIVE RELIABLE STATUS**');
  console.log('Press Ctrl+C to stop\n');
    
  const updateDisplay = async () => {
    process.stdout.write('\x1B[2J\x1B[0f'); // Clear screen
    await status.displayStatus();
    console.log('\nPress Ctrl+C to stop live monitoring');
  };
    
  updateDisplay();
  setInterval(updateDisplay, 5000); // Update every 5 seconds
} else {
  // Single status check
  status.displayStatus();
} 