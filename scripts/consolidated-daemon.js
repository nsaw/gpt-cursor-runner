#!/usr/bin/env node

/**
 * GHOST 2.0 Consolidated Daemon
 * Merges Braun and Cyops daemon functionalities
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class ConsolidatedDaemon {
  constructor() {
    this.name = 'ConsolidatedDaemon';
    this.status = 'stopped';
    this.lastHeartbeat = null;
    this.patchQueue = [];
    this.processing = false;
  }

  async start() {
    console.log('[CONSOLIDATED] Starting unified daemon...');
    this.status = 'running';
    this.lastHeartbeat = new Date();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Start patch processing loop
    this.startPatchProcessing();
    
    console.log('[CONSOLIDATED] Daemon started successfully');
  }

  async stop() {
    console.log('[CONSOLIDATED] Stopping daemon...');
    this.status = 'stopped';
  }

  startHealthMonitoring() {
    setInterval(() => {
      this.lastHeartbeat = new Date();
      this.writeHealthStatus();
    }, 30000); // Every 30 seconds
  }

  startPatchProcessing() {
    setInterval(async () => {
      if (this.processing) return;
      
      try {
        await this.processPatchQueue();
      } catch (error) {
        console.error('[CONSOLIDATED] Patch processing error:', error);
      }
    }, 5000); // Every 5 seconds
  }

  async processPatchQueue() {
    this.processing = true;
    
    try {
      const patchDir = '.cursor-cache/CYOPS/patches';
      if (!fs.existsSync(patchDir)) {
        fs.mkdirSync(patchDir, { recursive: true });
        return;
      }

      const files = fs.readdirSync(patchDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        const filePath = path.join(patchDir, file);
        await this.processPatch(filePath);
        
        // Move processed file to completed
        const completedDir = 'tasks/completed';
        if (!fs.existsSync(completedDir)) {
          fs.mkdirSync(completedDir, { recursive: true });
        }
        
        fs.renameSync(filePath, path.join(completedDir, file));
      }
    } finally {
      this.processing = false;
    }
  }

  async processPatch(filePath) {
    try {
      console.log(`[CONSOLIDATED] Processing patch: ${filePath}`);
      
      const patchData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      // Apply patch mutations
      if (patchData.mutations) {
        for (const mutation of patchData.mutations) {
          await this.applyMutation(mutation);
        }
      }
      
      // Run post-mutation build
      if (patchData.postMutationBuild?.shell) {
        for (const command of patchData.postMutationBuild.shell) {
          await runDaemonCommand(command);
        }
      }
      
      // Validate patch
      if (patchData.validate?.shell) {
        for (const command of patchData.validate.shell) {
          await runDaemonCommand(command);
        }
      }
      
      console.log(`[CONSOLIDATED] Patch processed successfully: ${filePath}`);
      
    } catch (error) {
      console.error(`[CONSOLIDATED] Patch processing failed: ${filePath}`, error);
      throw error;
    }
  }

  async applyMutation(mutation) {
    const { path: filePath, contents } = mutation;
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(filePath, contents);
    console.log(`[CONSOLIDATED] Applied mutation: ${filePath}`);
  }

  writeHealthStatus() {
    const healthData = {
      status: this.status,
      lastHeartbeat: this.lastHeartbeat,
      processing: this.processing,
      queueLength: this.patchQueue.length,
      timestamp: new Date().toISOString()
    };
    
    const healthFile = '.cursor-cache/CYOPS/.heartbeat/.consolidated-daemon-health.json';
    const healthDir = path.dirname(healthFile);
    
    if (!fs.existsSync(healthDir)) {
      fs.mkdirSync(healthDir, { recursive: true });
    }
    
    fs.writeFileSync(healthFile, JSON.stringify(healthData, null, 2));
  }
}

// Export for use in other modules
module.exports = ConsolidatedDaemon;

// Replace execSync with non-blocking exec
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { stdio: 'inherit' }, (error, stdout, _stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Update command execution in the daemon logic
async function runDaemonCommand(command) {
  try {
    const result = await executeCommand(command);
    return result;
  } catch (error) {
    console.error(`Daemon command execution failed: ${error.message}`);
    throw error;
  }
}

// Start daemon if run directly
if (require.main === module) {
  const daemon = new ConsolidatedDaemon();
  daemon.start().catch(console.error);
} 