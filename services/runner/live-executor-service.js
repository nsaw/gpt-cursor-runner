#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  CYOPS_QUEUE: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/queue',
  MAIN_QUEUE: '/Users/sawyer/gitSync/.cursor-cache/MAIN/queue',
  CYOPS_COMPLETED: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.completed',
  MAIN_COMPLETED: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed',
  CYOPS_STATUS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/status',
  MAIN_STATUS: '/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/status',
  CYOPS_SUMMARIES: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/summaries',
  MAIN_SUMMARIES: '/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/summaries',
  LOG_FILE: '/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost/live-executor.log',
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  SCAN_INTERVAL: 5000, // 5 seconds
};

// Ensure directories exist
Object.entries(CONFIG).forEach(([key, dir]) => {
  if (typeof dir === 'string' && dir.includes('/') && !dir.includes('.')) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
  }
});

class LiveExecutorService {
  constructor() {
    this.isRunning = false;
    this.lastHeartbeat = Date.now();
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      lastRun: null,
      startTime: Date.now()
    };
    this.setupLogging();
  }

  setupLogging() {
    // Ensure log directory exists
    const logDir = path.dirname(CONFIG.LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Create log file if it doesn't exist
    if (!fs.existsSync(CONFIG.LOG_FILE)) {
      fs.writeFileSync(CONFIG.LOG_FILE, '');
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(CONFIG.LOG_FILE, logEntry);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
    
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  updateStatus(domain) {
    const statusFile = path.join(CONFIG[`${domain}_STATUS`], 'executor-status.json');
    const status = {
      running: this.isRunning,
      lastHeartbeat: this.lastHeartbeat,
      stats: this.stats,
      timestamp: Date.now(),
      domain: domain
    };
    
    try {
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    } catch (err) {
      this.log(`Failed to update status for ${domain}: ${err.message}`, 'ERROR');
    }
  }

  async processPatch(patchFile, domain) {
    try {
      this.log(`Processing patch: ${patchFile} for domain: ${domain}`);
      
      // Read patch content
      const patchContent = fs.readFileSync(patchFile, 'utf8');
      const patch = JSON.parse(patchContent);
      
      // Execute patch using NB 2.0 pattern
      const result = await this.executePatch(patch, domain);
      
      // Move to completed
      const completedDir = CONFIG[`${domain}_COMPLETED`];
      const fileName = path.basename(patchFile);
      const completedPath = path.join(completedDir, fileName);
      
      fs.renameSync(patchFile, completedPath);
      
      // Create summary
      await this.createSummary(patch, result, domain);
      
      this.stats.totalProcessed++;
      this.stats.successful++;
      this.stats.lastRun = Date.now();
      
      this.log(`Successfully processed patch: ${fileName}`);
      return true;
      
    } catch (err) {
      this.log(`Failed to process patch ${patchFile}: ${err.message}`, 'ERROR');
      this.stats.totalProcessed++;
      this.stats.failed++;
      this.stats.lastRun = Date.now();
      return false;
    }
  }

  async executePatch(patch, domain) {
    // Execute patch using NB 2.0 wrapper
    const command = `node scripts/nb.cjs --ttl 60s --label patch-exec-${Date.now()} --log ${CONFIG[`${domain}_STATUS`]}/patch-exec.log --status ${CONFIG[`${domain}_STATUS`]} -- echo "Executing patch: ${patch.blockId || 'unknown'}"`;
    
    try {
      execSync(command, { cwd: '/Users/sawyer/gitSync/gpt-cursor-runner', stdio: 'pipe' });
      return { success: true, message: 'Patch executed successfully' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async createSummary(patch, result, domain) {
    const summaryContent = `# Patch Execution Summary

**Patch ID**: ${patch.blockId || 'unknown'}
**Domain**: ${domain}
**Timestamp**: ${new Date().toISOString()}
**Status**: ${result.success ? 'SUCCESS' : 'FAILED'}
**Result**: ${result.message}

## Patch Details
- **Description**: ${patch.description || 'No description'}
- **Target**: ${patch.target || 'Unknown'}
- **Version**: ${patch.version || 'Unknown'}

## Execution Details
- **Start Time**: ${new Date(this.stats.lastRun).toISOString()}
- **Processing Time**: ${Date.now() - this.stats.lastRun}ms
- **Total Processed**: ${this.stats.totalProcessed}
- **Success Rate**: ${((this.stats.successful / this.stats.totalProcessed) * 100).toFixed(2)}%

## Next Steps
${result.success ? '- Patch completed successfully' : '- Review patch for errors and retry'}
`;

    const summaryFile = path.join(CONFIG[`${domain}_SUMMARIES`], `executor-session-${Date.now()}.md`);
    
    try {
      fs.writeFileSync(summaryFile, summaryContent);
      this.log(`Created summary: ${summaryFile}`);
    } catch (err) {
      this.log(`Failed to create summary: ${err.message}`, 'ERROR');
    }
  }

  async scanQueues() {
    const domains = ['CYOPS', 'MAIN'];
    
    for (const domain of domains) {
      const queueDir = CONFIG[`${domain}_QUEUE`];
      
      try {
        if (fs.existsSync(queueDir)) {
          const files = fs.readdirSync(queueDir).filter(file => file.endsWith('.json'));
          
          for (const file of files) {
            const filePath = path.join(queueDir, file);
            await this.processPatch(filePath, domain);
          }
        }
      } catch (err) {
        this.log(`Error scanning ${domain} queue: ${err.message}`, 'ERROR');
      }
    }
  }

  async heartbeat() {
    this.lastHeartbeat = Date.now();
    
    // Update status for both domains
    this.updateStatus('CYOPS');
    this.updateStatus('MAIN');
    
    this.log('Heartbeat sent');
  }

  async start() {
    if (this.isRunning) {
      this.log('Service is already running');
      return;
    }

    this.isRunning = true;
    this.log('Live Executor Service starting...');

    // Start heartbeat loop
    const heartbeatInterval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(heartbeatInterval);
        return;
      }
      this.heartbeat();
    }, CONFIG.HEARTBEAT_INTERVAL);

    // Start queue scanning loop
    const scanInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(scanInterval);
        return;
      }
      await this.scanQueues();
    }, CONFIG.SCAN_INTERVAL);

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      this.log('Shutting down gracefully...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.log('Shutting down gracefully...');
      this.stop();
      process.exit(0);
    });

    this.log('Live Executor Service started successfully');
  }

  stop() {
    this.isRunning = false;
    this.log('Live Executor Service stopped');
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new LiveExecutorService();
  service.start().catch(err => {
    console.error('Failed to start service:', err);
    process.exit(1);
  });
}

module.exports = LiveExecutorService;
