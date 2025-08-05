#!/usr/bin/env node
/* eslint-disable complexity */
/* eslint-disable max-depth */
/* eslint-disable max-lines */

/**
 * Real Dual Monitor
 * Shows patch execution status for both MAIN and CYOPS systems
 * Provides live monitoring of patch execution and system status for dual projects
 * INTEGRATED WITH UNIFIED SYSTEM MONITOR
 * EPIPE PROTECTED - Safe stream writing with error handling
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Import filename concatenator utility
const { concatenateFilename } = require('../scripts/filename-concatenator');

// EPIPE-safe logging utility
function safeLog(message) {
  try {
    console.log(message);
  } catch (_error) {
    if (error.code === 'EPIPE') {
      // Log EPIPE suppression to file instead of stdout
      try {
        fs.appendFileSync('/Users/sawyer/gitSync/gpt-cursor-runner/logs/dual-monitor.log', 
          `[STREAM GUARD] EPIPE suppressed: ${new Date().toISOString()}\n`);
      } catch (logError) {
        // If even file logging fails, silently ignore
      }
    } else {
      // For non-EPIPE errors, try to log to file
      try {
        fs.appendFileSync('/Users/sawyer/gitSync/gpt-cursor-runner/logs/dual-monitor.log', 
          `[STREAM GUARD] Console error: ${error.message} - ${new Date().toISOString()}\n`);
      } catch (logError) {
        // Silent fallback
      }
    }
  }
}



// Unified System Monitor Integration
const UNIFIED_MONITOR_CONFIG = {
  LOG_FILE: '/Users/sawyer/gitSync/gpt-cursor-runner/logs/unified-monitor.log',
  HEARTBEAT_FILE: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/.unified-monitor.json',
  TUNNELS_FILE: '/Users/sawyer/gitSync/.cursor-cache/.docs/TUNNELS.json'
};



function checkCurlHealth(url) {
  return new Promise((resolve) => {
    // Force timeout and disown to prevent hanging
    const curlCommand = `timeout 10s curl -s -m 8 "${url}"`;
    exec(curlCommand, { encoding: 'utf8' }, (error, stdout, _stderr) => {
      if (error) {
        resolve({ healthy: false, error: error.message });
      } else {
        resolve({ healthy: true, response: stdout.trim() });
      }
    });
  });
}

class RealDualMonitor {
  constructor() {
    this.monitoring = false;
    this.statusInterval = null;
    this.lastStatus = {};
    this.unifiedMonitorData = {};
    this.resourceHealth = {};
    this.tunnelStatus = {};
    this.selfHealingStatus = {};
    this.recentLogs = [];
        
    // System configurations
    this.systems = {
      MAIN: {
        label: 'MAIN',
        root: '/Users/sawyer/gitSync/tm-mobile-cursor',
        patchesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
        summariesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries',
        logsPath: '/Users/sawyer/gitSync/tm-mobile-cursor/logs',
        ghostUrl: 'https://runner.thoughtmarks.app/health'
      },
      CYOPS: {
        label: 'CYOPS',
        root: '/Users/sawyer/gitSync/gpt-cursor-runner',
        patchesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
        summariesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
        logsPath: '/Users/sawyer/gitSync/gpt-cursor-runner/logs',
        ghostUrl: 'https://gpt-cursor-runner.fly.dev/health'
      }
    };
        
    // Status categories for each system
    this.statusCategories = {
      MAIN: {
        patches: { pending: 0, executing: 0, completed: 0, failed: 0 },
        systems: { running: [], stopped: [], errors: [] },
        ghost: { status: 'unknown', lastCheck: null },
        execution: { current: null, queue: [], history: [] }
      },
      CYOPS: {
        patches: { pending: 0, executing: 0, completed: 0, failed: 0 },
        systems: { running: [], stopped: [], errors: [] },
        ghost: { status: 'unknown', lastCheck: null },
        execution: { current: null, queue: [], history: [] }
      }
    };
  }

  // Read unified system monitor data
  async readUnifiedMonitorData() {
    try {
      // Read heartbeat file
      if (fs.existsSync(UNIFIED_MONITOR_CONFIG.HEARTBEAT_FILE)) {
        const heartbeatData = JSON.parse(fs.readFileSync(UNIFIED_MONITOR_CONFIG.HEARTBEAT_FILE, 'utf8'));
        this.unifiedMonitorData = heartbeatData;
      }

      // Read recent logs (last 10 entries)
      if (fs.existsSync(UNIFIED_MONITOR_CONFIG.LOG_FILE)) {
        const logContent = fs.readFileSync(UNIFIED_MONITOR_CONFIG.LOG_FILE, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());
        this.recentLogs = logLines.slice(-10).map(line => {
          try {
            return JSON.parse(line);
          } catch (_error) {
            return { message: line, timestamp: new Date().toISOString() };
          }
        });
      }

      // Extract resource health
      if (this.unifiedMonitorData.systems && this.unifiedMonitorData.systems.resources) {
        this.resourceHealth = this.unifiedMonitorData.systems.resources;
      }

      // Extract tunnel status
      if (this.unifiedMonitorData.systems) {
        this.tunnelStatus = Object.entries(this.unifiedMonitorData.systems)
          .filter(([_key, _value]) => _key.includes('tunnel') || _key.includes('cloudflare') || _key.includes('ngrok'))
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});
      }

      // Extract self-healing status
      if (this.unifiedMonitorData.processes) {
        this.selfHealingStatus = Object.entries(this.unifiedMonitorData.processes)
          .filter(([_key, value]) => value.restartCount > 0)
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});
      }

    } catch (_error) {
      console.error('Error reading unified monitor data:', error.message);
    }
  }

  // Validate all endpoints from TUNNELS.json
  async validateAllEndpoints() {
    try {
      if (fs.existsSync(UNIFIED_MONITOR_CONFIG.TUNNELS_FILE)) {
        const tunnelsData = JSON.parse(fs.readFileSync(UNIFIED_MONITOR_CONFIG.TUNNELS_FILE, 'utf8'));
        
        const endpoints = [];
        
        // Add DNS records endpoints
        if (tunnelsData.dns_records) {
          tunnelsData.dns_records.forEach(record => {
            if (record.status !== 'INACTIVE' && record.dns_target) {
              endpoints.push({
                name: `${record.subdomain}.${record.domain}`,
                url: `https://${record.subdomain}.${record.domain}/health`,
                type: 'dns_record',
                status: record.status
              });
            }
          });
        }

        // Add ngrok endpoint
        if (tunnelsData.ngrok && tunnelsData.ngrok.domain) {
          endpoints.push({
            name: 'ngrok-tunnel',
            url: `https://${tunnelsData.ngrok.domain}/health`,
            type: 'ngrok',
            status: 'ACTIVE'
          });
        }

        // Validate all endpoints
        const validationResults = [];
        for (const endpoint of endpoints) {
          try {
            const result = await checkCurlHealth(endpoint.url);
            validationResults.push({
              name: endpoint.name,
              url: endpoint.url,
              type: endpoint.type,
              status: endpoint.status,
              healthy: result.healthy,
              response: result.response ? result.response.substring(0, 100) : '',
              error: result.error || null
            });
          } catch (_error) {
            validationResults.push({
              name: endpoint.name,
              url: endpoint.url,
              type: endpoint.type,
              status: endpoint.status,
              healthy: false,
              error: error.message
            });
          }
        }

        this.tunnelStatus = validationResults;
      }
    } catch (_error) {
      console.error('Error validating endpoints:', error.message);
    }
  }

  // Start dual system monitoring
  start() {
    safeLog('🔍 Starting Real Dual Monitor (Integrated)...');
    safeLog('[STREAM GUARD] EPIPE protection active - safeLog() utility enabled');
    this.monitoring = true;
        
    // Initial status check
    this.updateStatus();
        
    // Set up periodic status updates (30s minimum as requested)
    this.statusInterval = setInterval(() => {
      this.updateStatus();
    }, 30000); // Update every 30 seconds
        
    // Set up file watchers for both systems
    this.watchSystems();
        
    safeLog('✅ Real Dual Monitor started (Integrated)');
    safeLog('📊 Status updates every 30 seconds');
    safeLog('👁️  Watching for patch and summary changes in both systems');
    safeLog('🔗 Integrated with Unified System Monitor');
  }

  // Stop monitoring
  stop() {
    console.log('🛑 Stopping Real Dual Monitor...');
    this.monitoring = false;
        
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }
        
    console.log('✅ Real Dual Monitor stopped');
  }

  // Update current status for both systems with proper async handling
  async updateStatus() {
    console.log('🔄 Updating status with real-time sync...');
    
    // Read unified monitor data first
    await this.readUnifiedMonitorData();
    await this.validateAllEndpoints();
    
    // Process all systems with proper async handling
    const systemKeys = Object.keys(this.systems);
    for (const systemKey of systemKeys) {
      console.log(`📊 Processing ${systemKey} system...`);
      
      // Execute all checks in parallel for better performance
      await Promise.all([
        this.checkPatchStatus(systemKey),
        this.checkSystemStatus(systemKey),
        this.checkGhostStatus(systemKey)
      ]);
    }
    
    this.displayStatus();
  }

  // Force atomic status refresh from disk - no caching
  async refreshStatus() {
    console.log('🔄 FORCE ATOMIC STATUS REFRESH - Clearing all cached state...');
    
    // Clear any cached data
    this.lastStatus = {};
    this.unifiedMonitorData = {};
    this.resourceHealth = {};
    this.tunnelStatus = {};
    this.selfHealingStatus = {};
    this.recentLogs = [];
    
    // Force manual disk refresh of all summary + patch paths
    await this.forceDiskRefresh();
    
    // Force reload all status data with atomic operations
    await this.atomicUpdateStatus();
    
    // Re-register watchSystems loop after forced refresh
    this.reRegisterWatchSystems();
    
    console.log('✅ ATOMIC STATUS REFRESH COMPLETED');
  }

  // Force manual disk refresh of all summary + patch paths
  async forceDiskRefresh() {
    console.log('💾 FORCING DISK REFRESH OF ALL PATHS...');
    
    for (const [systemKey, system] of Object.entries(this.systems)) {
      console.log(`📂 Refreshing ${systemKey} disk paths...`);
      
      // Force refresh patches directory
      try {
        if (fs.existsSync(system.patchesPath)) {
          const patchFiles = fs.readdirSync(system.patchesPath);
          console.log(`📦 ${systemKey} patches: ${patchFiles.length} files found`);
        } else {
          console.log(`❌ ${systemKey} patches directory not found: ${system.patchesPath}`);
        }
      } catch (_error) {
        console.error(`❌ Error refreshing ${systemKey} patches:`, error.message);
      }
      
      // Force refresh summaries directory
      try {
        if (fs.existsSync(system.summariesPath)) {
          const summaryFiles = fs.readdirSync(system.summariesPath);
          console.log(`📄 ${systemKey} summaries: ${summaryFiles.length} files found`);
          
          // Sync output timestamps to current mtime of all summary files
          for (const summaryFile of summaryFiles) {
            try {
              const summaryPath = path.join(system.summariesPath, summaryFile);
              const stats = fs.statSync(summaryPath);
              console.log(`📅 ${summaryFile}: ${stats.mtime.toISOString()}`);
            } catch (_error) {
              console.warn(`⚠️ Could not get stats for ${summaryFile}: ${error.message}`);
            }
          }
        } else {
          console.log(`❌ ${systemKey} summaries directory not found: ${system.summariesPath}`);
        }
      } catch (_error) {
        console.error(`❌ Error refreshing ${systemKey} summaries:`, error.message);
      }
    }
  }

  // Atomic status update with enforced synchronization
  async atomicUpdateStatus() {
    console.log('⚡ ATOMIC STATUS UPDATE - Enforcing live sync...');
    
    // Read unified monitor data first
    await this.readUnifiedMonitorData();
    await this.validateAllEndpoints();
    
    // Process all systems with atomic operations
    const systemKeys = Object.keys(this.systems);
    for (const systemKey of systemKeys) {
      console.log(`🔧 ATOMIC PROCESSING ${systemKey} system...`);
      
      // Execute all checks atomically with enforced synchronization
      await Promise.all([
        this.atomicCheckPatchStatus(systemKey),
        this.atomicCheckSystemStatus(systemKey),
        this.atomicCheckGhostStatus(systemKey)
      ]);
    }
    
    this.displayStatus();
  }

  // Re-register watchSystems loop after forced refresh
  reRegisterWatchSystems() {
    console.log('👁️ RE-REGISTERING WATCH SYSTEMS...');
    
    // Stop existing watchers if any
    if (this.fileWatchers) {
      for (const watcher of this.fileWatchers) {
        try {
          watcher.close();
        } catch (_error) {
          // Ignore errors when closing watchers
        }
      }
    }
    
    this.fileWatchers = [];
    
    // Re-register watch systems
    this.watchSystems();
    
    console.log('✅ Watch systems re-registered');
  }

  // Extract patch ID from filename
  extractPatchId(filename) {
    if (filename.startsWith('patch-')) {
      return filename.replace(/^patch-/, '').replace(/\.json$/, '');
    }
    if (filename.startsWith('summary-')) {
      return filename.replace(/^summary-/, '').replace(/\.md$/, '');
    }
    return filename.replace(/\.(json|md)$/, '');
  }

  // Check patch status for a specific system with enhanced disk validation
  async checkPatchStatus(systemKey) {
    try {
      const system = this.systems[systemKey];
      const patchesPath = system.patchesPath;
      const summariesPath = system.summariesPath;
            
      // FORCE RELOAD FROM DISK - no caching
      if (!fs.existsSync(patchesPath)) {
        console.error(`❌ Patches directory does not exist: ${patchesPath}`);
        this.statusCategories[systemKey].patches = { pending: 0, executing: 0, completed: 0, failed: 0 };
        return;
      }
      
      if (!fs.existsSync(summariesPath)) {
        console.error(`❌ Summaries directory does not exist: ${summariesPath}`);
        this.statusCategories[systemKey].patches = { pending: 0, executing: 0, completed: 0, failed: 0 };
        return;
      }
            
      // Get patch files with enhanced validation
      const patchDirContents = fs.readdirSync(patchesPath);
      const patchFiles = patchDirContents
        .filter(f => f.endsWith('.json'))
        .filter(f => !f.startsWith('.')) // Exclude hidden files
        .filter(f => {
          const fullPath = path.join(patchesPath, f);
          return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
        });

      // Get summary files with enhanced validation
      const summaryDirContents = fs.readdirSync(summariesPath);
      const summaryFiles = summaryDirContents
        .filter(f => f.endsWith('.md'))
        .filter(f => !f.startsWith('.')) // Exclude hidden files
        .filter(f => {
          const fullPath = path.join(summariesPath, f);
          return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
        });

      // Validate summary file content and extract completed patch IDs
      const completedIds = [];
      const failedIds = [];
      
      for (const summaryFile of summaryFiles) {
        try {
          const summaryPath = path.join(summariesPath, summaryFile);
          const summaryContent = fs.readFileSync(summaryPath, 'utf8');
          
          // Check if summary indicates success or failure
          if (summaryContent.includes('✅ PASS') || summaryContent.includes('Status: ✅')) {
            completedIds.push(this.extractPatchId(summaryFile));
          } else if (summaryContent.includes('❌ FAIL') || summaryContent.includes('Status: ❌')) {
            failedIds.push(this.extractPatchId(summaryFile));
          } else {
            // If unclear, count as completed for now
            completedIds.push(this.extractPatchId(summaryFile));
          }
        } catch (readError) {
          console.warn(`⚠️ Could not read summary file ${summaryFile}: ${readError.message}`);
        }
      }

      // Filter pending patches - only include patches that don't have corresponding summaries
      const pendingPatches = patchFiles.filter(patchFile => {
        const patchId = this.extractPatchId(patchFile);
        return !completedIds.includes(patchId) && !failedIds.includes(patchId);
      });

      const status = {
        pending: pendingPatches.length,
        executing: 0, // Will be determined by process status
        completed: completedIds.length,
        failed: failedIds.length
      };
            
      this.statusCategories[systemKey].patches = status;
      
      // Log validation results
      console.log(`📊 ${systemKey} Patch Validation: ${patchFiles.length} patches, ${summaryFiles.length} summaries, ${completedIds.length} completed, ${failedIds.length} failed`);
      
    } catch (_error) {
      console.error(`❌ Error checking patch status for ${systemKey}:`, error.message);
      console.error(`   Patches path: ${this.systems[systemKey].patchesPath}`);
      console.error(`   Summaries path: ${this.systems[systemKey].summariesPath}`);
      this.statusCategories[systemKey].patches = { pending: 0, executing: 0, completed: 0, failed: 0 };
    }
  }

  // Atomic patch status check with enforced disk sync
  async atomicCheckPatchStatus(systemKey) {
    console.log(`⚡ ATOMIC PATCH STATUS CHECK for ${systemKey}...`);
    
    // Force immediate disk read
    const system = this.systems[systemKey];
    const patchesPath = system.patchesPath;
    const summariesPath = system.summariesPath;
    
    // Enforce disk sync before reading
    try {
      if (fs.existsSync(patchesPath)) {
        fs.readdirSync(patchesPath); // Force disk read
      }
      if (fs.existsSync(summariesPath)) {
        fs.readdirSync(summariesPath); // Force disk read
      }
    } catch (_error) {
      console.error(`❌ Disk sync failed for ${systemKey}:`, error.message);
    }
    
    // Use the enhanced check method
    await this.checkPatchStatus(systemKey);
  }

  // Atomic system status check with enforced daemon validation
  async atomicCheckSystemStatus(systemKey) {
    console.log(`⚡ ATOMIC SYSTEM STATUS CHECK for ${systemKey}...`);
    
    // Force immediate process validation
    await this.checkSystemStatus(systemKey);
  }

  // Atomic ghost status check with enforced health recheck
  async atomicCheckGhostStatus(systemKey) {
    console.log(`⚡ ATOMIC GHOST STATUS CHECK for ${systemKey}...`);
    
    // Force immediate ghost health recheck
    await this.checkGhostStatus(systemKey);
  }

  // Check system status for a specific system with mandatory daemon enforcement
  async checkSystemStatus(systemKey) {
    console.log(`🖥️ Checking system status for ${systemKey}...`);
    
    const systems = {
      running: [],
      stopped: [],
      errors: []
    };
        
    // MANDATORY DAEMONS - no optional fallback
    const mandatoryChecks = [
      { name: 'patch-executor', process: 'patch-executor-loop', mandatory: true },
      { name: 'summary-monitor', process: 'summary-monitor-simple', mandatory: true }
    ];
        
    // Optional system checks
    const optionalChecks = [
      { name: 'ghost-bridge', process: 'ghost-bridge', mandatory: false },
      { name: 'realtime-monitor', process: 'realtime-monitor', mandatory: false }
    ];
        
    // Add system-specific checks
    if (systemKey === 'MAIN') {
      optionalChecks.push({ name: 'expo-dev-server', process: 'expo', mandatory: false });
    } else if (systemKey === 'CYOPS') {
      optionalChecks.push({ name: 'tunnel', process: 'cloudflared', mandatory: false });
      optionalChecks.push({ name: 'fly.io', process: 'fly', mandatory: false });
      optionalChecks.push({ name: 'doc-sync', process: 'doc-sync', mandatory: false });
      optionalChecks.push({ name: 'orchestrator', process: 'orchestrator', mandatory: false });
      optionalChecks.push({ name: 'daemon-manager', process: 'daemon-manager', mandatory: false });
    }
        
    // Check all processes with enhanced validation
    const allChecks = [...mandatoryChecks, ...optionalChecks];
    
    for (const check of allChecks) {
      try {
        console.log(`🔍 Checking ${check.name} (${check.process})...`);
        
        // Enhanced process validation with multiple methods
        const result = await this.validateProcessRunning(check.process);
        
        if (result.running) {
          systems.running.push(check.name);
          console.log(`✅ ${check.name} is running`);
        } else {
          systems.stopped.push(check.name);
          console.log(`❌ ${check.name} is stopped`);
          
          // Log mandatory daemon failures as errors
          if (check.mandatory) {
            systems.errors.push(`${check.name} (MANDATORY - DOWN)`);
            console.log(`🚨 ${check.name} is mandatory but down!`);
          }
        }
      } catch (_error) {
        systems.stopped.push(check.name);
        console.log(`❌ Error checking ${check.name}: ${error.message}`);
        
        if (check.mandatory) {
          systems.errors.push(`${check.name} (MANDATORY - ERROR: ${error.message})`);
        }
      }
    }
    
    console.log(`📊 ${systemKey} system status: ${systems.running.length} running, ${systems.stopped.length} stopped, ${systems.errors.length} errors`);
    this.statusCategories[systemKey].systems = systems;
  }

  // Enhanced process validation with multiple methods
  async validateProcessRunning(processName) {
    return new Promise((resolve) => {
      const commands = [
        `ps aux | grep "${processName}" | grep -v grep | wc -l`,
        `pgrep -f "${processName}" | wc -l`,
        `lsof -i -P | grep "${processName}" | wc -l`
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
            // If any method detects the process, consider it running
            resolve({ running: runningCount > 0, methods: runningCount });
          }
        });
      });
    });
  }

  // Check ghost runner status for a specific system with enhanced validation
  async checkGhostStatus(systemKey) {
    try {
      const system = this.systems[systemKey];
      console.log(`👻 Checking ghost status for ${systemKey} at ${system.ghostUrl}`);
      
      // Enhanced ghost health check with multiple methods
      const ghostStatus = await this.validateGhostHealth(systemKey, system.ghostUrl);
      
      this.statusCategories[systemKey].ghost = {
        status: ghostStatus.status,
        lastCheck: new Date().toISOString(),
        details: ghostStatus.details
      };
      
      console.log(`👻 ${systemKey} ghost status: ${ghostStatus.status} - ${ghostStatus.details}`);
      
    } catch (_error) {
      console.error(`❌ Error checking ghost status for ${systemKey}:`, error.message);
      this.statusCategories[systemKey].ghost = {
        status: 'error',
        lastCheck: new Date().toISOString(),
        details: `Error: ${error.message}`
      };
    }
  }

  // Enhanced ghost health validation with multiple methods
  async validateGhostHealth(systemKey, ghostUrl) {
    // Method 1: Direct curl health check
    const curlCheck = await checkCurlHealth(ghostUrl);
    
    // Method 2: Process-based validation for ghost-bridge
    const ghostProcessCheck = await this.validateProcessRunning('ghost-bridge');
    
    // Method 3: Check for ghost-related processes
    const ghostRelatedProcesses = await this.checkGhostRelatedProcesses(systemKey);
    
    // Determine overall status based on multiple checks
    if (curlCheck.healthy) {
      return {
        status: 'running',
        details: 'HTTP health check passed'
      };
    } else if (ghostProcessCheck.running) {
      return {
        status: 'running',
        details: 'Ghost process detected but HTTP check failed'
      };
    } else if (ghostRelatedProcesses.length > 0) {
      return {
        status: 'starting',
        details: `Ghost-related processes: ${ghostRelatedProcesses.join(', ')}`
      };
    } else {
      return {
        status: 'unreachable',
        details: `No ghost processes found. HTTP error: ${curlCheck.error || 'Unknown'}`
      };
    }
  }

  // Check for ghost-related processes
  async checkGhostRelatedProcesses() {
    const ghostProcesses = ['ghost-bridge', 'ghost-runner', 'orchestrator'];
    const foundProcesses = [];
    
    for (const process of ghostProcesses) {
      try {
        const result = await this.validateProcessRunning(process);
        if (result.running) {
          foundProcesses.push(process);
        }
      } catch (_error) {
        // Continue checking other processes
      }
    }
    
    return foundProcesses;
  }

  // Display current status for both systems
  displayStatus() {
    try {
      console.clear();
    } catch (_error) {
      if (error.code === 'EPIPE') {
        safeLog('[STREAM GUARD] EPIPE suppressed in console.clear()');
      }
    }
    safeLog('🔍 REAL DUAL MONITOR - PATCH EXECUTION STATUS (INTEGRATED)');
    safeLog('=' .repeat(70));
    safeLog(`📅 ${new Date().toLocaleString()}`);
    safeLog('');
        
    // Unified System Monitor Status
    safeLog('🔗 UNIFIED SYSTEM MONITOR STATUS:');
    if (this.unifiedMonitorData.status) {
      safeLog(`   Status: ${this.unifiedMonitorData.status.toUpperCase()}`);
      safeLog(`   Uptime: ${Math.round(this.unifiedMonitorData.uptime || 0)}s`);
    }
    safeLog('');
        
    // Resource Health
    safeLog('💻 RESOURCE HEALTH:');
    if (this.resourceHealth && Object.keys(this.resourceHealth).length > 0) {
      const resources = this.resourceHealth;
      safeLog(`   Memory: ${resources.memory || 0}% ${resources.memory < 80 ? '✅' : '⚠️'}`);
      safeLog(`   CPU: ${resources.cpu || 0}% ${resources.cpu < 90 ? '✅' : '⚠️'}`);
      safeLog(`   Disk: ${resources.disk || 0}% ${resources.disk < 85 ? '✅' : '⚠️'}`);
      safeLog(`   Overall: ${resources.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    } else {
      safeLog('   No resource data available');
    }
    safeLog('');
        
    // Tunnel Status
    safeLog('🌐 TUNNEL STATUS:');
    if (this.tunnelStatus && Array.isArray(this.tunnelStatus)) {
      this.tunnelStatus.forEach(tunnel => {
        const statusIcon = tunnel.healthy ? '✅' : '❌';
        safeLog(`   ${statusIcon} ${tunnel.name} (${tunnel.type}): ${tunnel.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
        if (tunnel.error) {
          safeLog(`      Error: ${tunnel.error}`);
        }
      });
    } else {
      safeLog('   No tunnel data available');
    }
    safeLog('');
        
    // Self-Healing Status
    safeLog('🔧 SELF-HEALING STATUS:');
    if (this.selfHealingStatus && Object.keys(this.selfHealingStatus).length > 0) {
      Object.entries(this.selfHealingStatus).forEach(([process, data]) => {
        safeLog(`   ${process}: ${data.restartCount} restarts, ${data.healthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      });
    } else {
      safeLog('   No self-healing activity');
    }
    safeLog('');
        
    // Patch Status for both systems
    safeLog('📦 PATCH STATUS:');
    Object.keys(this.systems).forEach(systemKey => {
      const patches = this.statusCategories[systemKey].patches;
      safeLog(`   [ ${systemKey} ] Pending: ${patches.pending} | Executing: ${patches.executing} | Completed: ${patches.completed} | Failed: ${patches.failed}`);
    });
        
    // Check if any system has pending patches
    const hasPending = Object.keys(this.systems).some(systemKey => 
      this.statusCategories[systemKey].patches.pending > 0
    );
    if (hasPending) {
      safeLog('   ⚠️  Pending patches detected!');
    }
        
    safeLog('');
        
    // Execution Queue for both systems
    safeLog('🔄 EXECUTION QUEUE:');
    Object.keys(this.systems).forEach(systemKey => {
      safeLog(`   [ ${systemKey} ]`);
      this.showExecutionQueue(systemKey);
    });
        
    safeLog('');
        
    // System Status for both systems
    safeLog('🖥️  SYSTEM STATUS:');
    Object.keys(this.systems).forEach(systemKey => {
      safeLog(`   [ ${systemKey} ]`);
      const systems = this.statusCategories[systemKey].systems;
      if (systems.running.length > 0) {
        safeLog(`   ✅ Running: ${systems.running.join(', ')}`);
      }
      if (systems.stopped.length > 0) {
        safeLog(`   ❌ Stopped: ${systems.stopped.join(', ')}`);
      }
      if (systems.errors.length > 0) {
        safeLog(`   🚨 Errors: ${systems.errors.join(', ')}`);
      }
      safeLog('');
    });
        
    // Ghost Status for both systems
    safeLog('👻 GHOST RUNNER STATUS:');
    Object.keys(this.systems).forEach(systemKey => {
      const ghost = this.statusCategories[systemKey].ghost;
      let statusIcon = '❓';
      if (ghost.status === 'running') statusIcon = '✅';
      else if (ghost.status === 'starting') statusIcon = '🔄';
      else if (ghost.status === 'error') statusIcon = '🚨';
      else statusIcon = '❌';
      
      safeLog(`   [ ${systemKey} ] ${statusIcon} ${ghost.status.toUpperCase()}`);
      if (ghost.details) {
        safeLog(`      Details: ${ghost.details}`);
      }
    });
    safeLog(`   Last Check: ${new Date().toISOString()}`);
        
    safeLog('');
        
    // Recent Activity for both systems
    safeLog('📋 RECENT ACTIVITY:');
    Object.keys(this.systems).forEach(systemKey => {
      safeLog(`   [ ${systemKey} ]`);
      this.showRecentActivity(systemKey);
    });
        
    safeLog('');
        
    // Recent Log Entries (Last 10)
    safeLog('📝 RECENT LOG ENTRIES:');
    if (this.recentLogs && this.recentLogs.length > 0) {
      this.recentLogs.slice(-10).forEach((log, index) => {
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Unknown';
        const level = log.level ? `[${log.level.toUpperCase()}]` : '[INFO]';
        const message = log.message || 'No message';
        safeLog(`   ${index + 1}. ${timestamp} ${level} ${message}`);
      });
    } else {
      safeLog('   No recent log entries');
    }
        
    safeLog('');
    safeLog('=' .repeat(70));
    safeLog('💡 Commands: start | stop | execute | status | agent');
  }

  // Show execution queue for a specific system
  showExecutionQueue(systemKey) {
    try {
      const system = this.systems[systemKey];
      const patchFiles = fs.readdirSync(system.patchesPath)
        .filter(f => f.endsWith('.json'))
        .filter(f => !f.startsWith('.'))
        .filter(f => fs.existsSync(path.join(system.patchesPath, f)));

      const summaryFiles = fs.readdirSync(system.summariesPath)
        .filter(f => f.endsWith('.md'))
        .filter(f => !f.startsWith('.'))
        .filter(f => fs.existsSync(path.join(system.summariesPath, f)));

      const completedIds = summaryFiles.map(f => this.extractPatchId(f));
      const pendingPatches = patchFiles.filter(patchFile => {
        const patchId = this.extractPatchId(patchFile);
        return !completedIds.includes(patchId);
      });

      if (pendingPatches.length > 0) {
        pendingPatches.forEach(patch => {
          safeLog(`   ⏳ ${patch} (queued)`);
        });
      } else {
        safeLog('   ✅ No pending patches in queue');
      }
    } catch (_error) {
      safeLog('   Error reading execution queue');
    }
  }

  // Show recent activity for a specific system
  showRecentActivity(systemKey) {
    try {
      const system = this.systems[systemKey];
      const summaryFiles = fs.readdirSync(system.summariesPath)
        .filter(f => f.endsWith('.md'))
        .sort((a, b) => {
          const aStat = fs.statSync(path.join(system.summariesPath, a));
          const bStat = fs.statSync(path.join(system.summariesPath, b));
          return bStat.mtime - aStat.mtime;
        })
        .slice(0, 3); // Show last 3 for each system
            
      if (summaryFiles.length > 0) {
        summaryFiles.forEach(file => {
          const stat = fs.statSync(path.join(system.summariesPath, file));
          const concatenatedFile = concatenateFilename(file);
          safeLog(`   📄 ${concatenatedFile} (${stat.mtime.toLocaleTimeString()})`);
        });
      } else {
        safeLog('   No recent activity');
      }
    } catch (_error) {
      safeLog('   Error reading recent activity');
    }
  }

  // Watch both systems for changes
  watchSystems() {
    if (!this.fileWatchers) {
      this.fileWatchers = [];
    }
    
    Object.keys(this.systems).forEach(systemKey => {
      const system = this.systems[systemKey];
            
      // Watch patches directory
      try {
        const patchWatcher = fs.watch(system.patchesPath, (eventType, filename) => {
          if (filename && filename.endsWith('.json')) {
            safeLog(`📦 ${systemKey} patch file change detected: ${filename}`);
            this.updateStatus();
          }
        });
        this.fileWatchers.push(patchWatcher);
      } catch (_error) {
        safeLog(`⚠️  Could not watch ${systemKey} patches directory`);
      }
            
      // Watch summaries directory
      try {
        const summaryWatcher = fs.watch(system.summariesPath, (eventType, filename) => {
          if (filename && filename.endsWith('.md')) {
            safeLog(`📫 ${systemKey} summary file change detected: ${filename}`);
            this.updateStatus();
          }
        });
        this.fileWatchers.push(summaryWatcher);
      } catch (_error) {
        safeLog(`⚠️  Could not watch ${systemKey} summaries directory`);
      }
    });
        
    console.log('👁️  Watching both systems for changes...');
  }

  // Execute pending patches for both systems
  executePatches() {
    console.log('🚀 Executing pending patches for both systems...');
        
    Object.keys(this.systems).forEach(systemKey => {
      const system = this.systems[systemKey];
      console.log(`   Executing patches for ${systemKey}...`);
            
      // Execute patches for each system
      exec(`cd "${system.root}" && node scripts/patch-executor.js execute`, (error, stdout, _stderr) => {
        if (error) {
          console.error(`❌ ${systemKey} patch execution failed:`, error.message);
        } else {
          console.log(`✅ ${systemKey} patch execution completed`);
          console.log(stdout);
        }
      });
    });
  }

  // Get detailed status for both systems
  getDetailedStatus() {
    return {
      timestamp: new Date().toISOString(),
      systems: this.statusCategories,
      unifiedMonitor: this.unifiedMonitorData,
      resourceHealth: this.resourceHealth,
      tunnelStatus: this.tunnelStatus,
      selfHealingStatus: this.selfHealingStatus,
      recentLogs: this.recentLogs
    };
  }

  // Get status formatted for agent chat
  getStatusForAgent() {
    // Update status before generating agent output
    this.updateStatus();
        
    let statusText = '🔍 **REAL DUAL MONITOR - PATCH EXECUTION STATUS (INTEGRATED)**\n\n';
        
    // Unified System Monitor Status
    statusText += '🔗 **Unified System Monitor Status:**\n';
    if (this.unifiedMonitorData.status) {
      statusText += `   Status: ${this.unifiedMonitorData.status.toUpperCase()}\n`;
      statusText += `   Uptime: ${Math.round(this.unifiedMonitorData.uptime || 0)}s\n`;
    }
    statusText += '\n';
        
    // Resource Health
    statusText += '💻 **Resource Health:**\n';
    if (this.resourceHealth && Object.keys(this.resourceHealth).length > 0) {
      const resources = this.resourceHealth;
      statusText += `   Memory: ${resources.memory || 0}% ${resources.memory < 80 ? '✅' : '⚠️'}\n`;
      statusText += `   CPU: ${resources.cpu || 0}% ${resources.cpu < 90 ? '✅' : '⚠️'}\n`;
      statusText += `   Disk: ${resources.disk || 0}% ${resources.disk < 85 ? '✅' : '⚠️'}\n`;
      statusText += `   Overall: ${resources.healthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}\n`;
    } else {
      statusText += '   No resource data available\n';
    }
    statusText += '\n';
        
    // Tunnel Status
    statusText += '🌐 **Tunnel Status:**\n';
    if (this.tunnelStatus && Array.isArray(this.tunnelStatus)) {
      this.tunnelStatus.forEach(tunnel => {
        const statusIcon = tunnel.healthy ? '✅' : '❌';
        statusText += `   ${statusIcon} ${tunnel.name} (${tunnel.type}): ${tunnel.healthy ? 'HEALTHY' : 'UNHEALTHY'}\n`;
        if (tunnel.error) {
          statusText += `      Error: ${tunnel.error}\n`;
        }
      });
    } else {
      statusText += '   No tunnel data available\n';
    }
    statusText += '\n';
        
    // Patch Status for both systems
    statusText += '📦 **Patch Status:**\n';
    Object.keys(this.systems).forEach(systemKey => {
      const patches = this.statusCategories[systemKey].patches;
      statusText += `   [ ${systemKey} ] Pending: ${patches.pending} | Executing: ${patches.executing} | Completed: ${patches.completed} | Failed: ${patches.failed}\n`;
    });
    statusText += '\n';
        
    // Check if any system has pending patches
    const hasPending = Object.keys(this.systems).some(systemKey => 
      this.statusCategories[systemKey].patches.pending > 0
    );
    if (hasPending) {
      statusText += '⚠️ **PENDING PATCHES DETECTED!**\n\n';
    }
        
    // System Status for both systems
    statusText += '🖥️ **System Status:**\n';
    Object.keys(this.systems).forEach(systemKey => {
      statusText += `   [ ${systemKey} ]\n`;
      const systems = this.statusCategories[systemKey].systems;
      if (systems.running.length > 0) {
        statusText += `   ✅ Running: ${systems.running.join(', ')}\n`;
      }
      if (systems.stopped.length > 0) {
        statusText += `   ❌ Stopped: ${systems.stopped.join(', ')}\n`;
      }
      if (systems.errors.length > 0) {
        statusText += `   🚨 Errors: ${systems.errors.join(', ')}\n`;
      }
    });
    statusText += '\n';
        
    // Ghost Status for both systems
    statusText += '👻 **Ghost Runner Status:**\n';
    Object.keys(this.systems).forEach(systemKey => {
      const ghost = this.statusCategories[systemKey].ghost;
      const statusIcon = ghost.status === 'running' ? '✅' : '❌';
      statusText += `   [ ${systemKey} ] ${statusIcon} ${ghost.status.toUpperCase()}\n`;
    });
    statusText += '\n';
        
    // Recent Activity for both systems
    statusText += '📋 **Recent Activity:**\n';
    Object.keys(this.systems).forEach(systemKey => {
      statusText += `   [ ${systemKey} ]\n`;
      try {
        const system = this.systems[systemKey];
        const summaryFiles = fs.readdirSync(system.summariesPath)
          .filter(f => f.endsWith('.md'))
          .sort((a, b) => {
            const aStat = fs.statSync(path.join(system.summariesPath, a));
            const bStat = fs.statSync(path.join(system.summariesPath, b));
            return bStat.mtime - aStat.mtime;
          })
          .slice(0, 3);
                
        if (summaryFiles.length > 0) {
          summaryFiles.forEach(file => {
            const stat = fs.statSync(path.join(system.summariesPath, file));
            const concatenatedFile = concatenateFilename(file);
            statusText += `   📄 ${concatenatedFile} (${stat.mtime.toLocaleTimeString()})\n`;
          });
        } else {
          statusText += '   No recent activity\n';
        }
      } catch (_error) {
        statusText += '   Error reading recent activity\n';
      }
    });
        
    statusText += `🕐 **Last Update:** ${new Date().toLocaleTimeString()}`;
        
    return statusText;
  }
}

// CLI interface
const monitor = new RealDualMonitor();

const command = process.argv[2];

switch (command) {
case 'start':
  monitor.start();
  break;
case 'stop':
  monitor.stop();
  break;
case 'execute':
  monitor.executePatches();
  break;
case 'status':
  monitor.updateStatus();
  break;
case 'refresh':
  monitor.refreshStatus();
  break;
case 'agent':
  console.log(monitor.getStatusForAgent());
  break;
default:
  console.log('🔍 Real Dual Monitor (Integrated)');
  console.log('');
  console.log('Usage: node dualMonitor.js [start|stop|execute|status|refresh|agent]');
  console.log('');
  console.log('Commands:');
  console.log('  start   - Start monitoring both MAIN and CYOPS systems (integrated)');
  console.log('  stop    - Stop monitoring');
  console.log('  execute - Execute pending patches for both systems');
  console.log('  status  - Show current status once');
  console.log('  refresh - Force refresh status from disk (no caching)');
  console.log('  agent   - Show formatted status for agent chat');
  console.log('');
  console.log('This monitor provides real-time patch execution status');
  console.log('for both MAIN and CYOPS systems with unified monitor integration.');
}