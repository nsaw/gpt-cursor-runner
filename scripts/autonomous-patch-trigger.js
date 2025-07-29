#!/usr/bin/env node
/**
 * Autonomous Patch Trigger
 * Automatically detects and executes patches with comprehensive validation
 * Integrates with real-time status API and provides error recovery
 */

const fs = require('fs/promises');
const path = require('path');
const { EventEmitter } = require('events');
const PatchFormatConverter = require('./patch-format-converter');

class AutonomousPatchTrigger extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.pollInterval = options.pollInterval || 3000; // 3 seconds
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds
    this.timeout = options.timeout || 300000; // 5 minutes
    
    // Directories
    this.patchDirectories = {
      CYOPS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
      MAIN: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches'
    };
    
    this.summaryDirectories = {
      CYOPS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
      MAIN: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries'
    };
    
    // Status tracking
    this.pendingPatches = new Map();
    this.executingPatches = new Map();
    this.completedPatches = new Map();
    this.failedPatches = new Map();
    
    // Format converter
    this.formatConverter = new PatchFormatConverter();
    
    // Validation pipeline
    this.validationPipeline = {
      typescript: true,
      eslint: true,
      runtime: true,
      performance: false
    };
    
    this.setupStatusAPI();
    this.setupErrorRecovery();
  }

  setupStatusAPI() {
    // Connect to real-time status API
    try {
      const RealTimeStatusAPI = require('./real-time-status-api');
      this.statusAPI = new RealTimeStatusAPI({ port: 8789 });
      
      // Listen for status updates
      this.statusAPI.on('patchStatusUpdate', ({ patchId, status }) => {
        this.handleStatusUpdate(patchId, status);
      });
      
      console.log('✅ [AUTO-TRIGGER] Connected to real-time status API');
    } catch (error) {
      console.warn('⚠️ [AUTO-TRIGGER] Status API not available:', error.message);
    }
  }

  setupErrorRecovery() {
    // Automatic retry mechanism
    this.retryQueue = new Map();
    
    // Error categorization
    this.errorCategories = {
      validation: ['typescript', 'eslint', 'runtime'],
      execution: ['file_write', 'command_execution', 'timeout'],
      system: ['disk_space', 'permissions', 'network']
    };
  }

  async start() {
    console.log('🚀 [AUTO-TRIGGER] Starting autonomous patch trigger...');
    console.log(`⏱️ [AUTO-TRIGGER] Poll interval: ${this.pollInterval}ms`);
    console.log(`🔄 [AUTO-TRIGGER] Max retries: ${this.maxRetries}`);
    
    // Ensure directories exist
    await this.ensureDirectories();
    
    // Start monitoring
    this.startMonitoring();
    
    // Start status API if available
    if (this.statusAPI) {
      this.statusAPI.start();
    }
    
    console.log('✅ [AUTO-TRIGGER] Autonomous patch trigger started');
  }

  async ensureDirectories() {
    for (const [system, patchDir] of Object.entries(this.patchDirectories)) {
      try {
        await fs.mkdir(patchDir, { recursive: true });
        await fs.mkdir(path.join(patchDir, '.completed'), { recursive: true });
        await fs.mkdir(path.join(patchDir, '.failed'), { recursive: true });
        console.log(`✅ [AUTO-TRIGGER] ${system} directories verified`);
      } catch (error) {
        console.error(`❌ [AUTO-TRIGGER] Failed to create ${system} directories:`, error.message);
      }
    }
  }

  startMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkForNewPatches();
      } catch (error) {
        console.error('❌ [AUTO-TRIGGER] Monitoring error:', error.message);
      }
    }, this.pollInterval);
  }

  async checkForNewPatches() {
    for (const [system, patchDir] of Object.entries(this.patchDirectories)) {
      try {
        const files = await fs.readdir(patchDir);
        const patchFiles = files.filter(file => 
          file.endsWith('.json') && 
          !file.startsWith('.') && 
          !file.includes('.completed') && 
          !file.includes('.failed')
        );
        
        for (const file of patchFiles) {
          const patchId = path.basename(file, '.json');
          
          // Check if patch is already being processed
          if (this.pendingPatches.has(patchId) || 
              this.executingPatches.has(patchId) ||
              this.completedPatches.has(patchId) ||
              this.failedPatches.has(patchId)) {
            continue;
          }
          
          // Add to pending queue
          this.pendingPatches.set(patchId, {
            system,
            file,
            path: path.join(patchDir, file),
            timestamp: new Date().toISOString()
          });
          
          console.log(`📦 [AUTO-TRIGGER] New patch detected: ${patchId} (${system})`);
          
          // Trigger execution
          this.executePatch(patchId);
        }
      } catch (error) {
        console.error(`❌ [AUTO-TRIGGER] Error checking ${system} directory:`, error.message);
      }
    }
  }

  async executePatch(patchId) {
    const patchInfo = this.pendingPatches.get(patchId);
    if (!patchInfo) {
      console.error(`❌ [AUTO-TRIGGER] Patch ${patchId} not found in pending queue`);
      return;
    }
    
    try {
      // Move to executing state
      this.pendingPatches.delete(patchId);
      this.executingPatches.set(patchId, {
        ...patchInfo,
        startTime: new Date().toISOString(),
        retryCount: 0
      });
      
      console.log(`⚡ [AUTO-TRIGGER] Executing patch: ${patchId}`);
      
      // Notify status API
      await this.notifyStatusUpdate(patchId, 'executing', {
        system: patchInfo.system,
        startTime: new Date().toISOString()
      });
      
      // Read and validate patch
      const patchData = await this.readAndValidatePatch(patchInfo.path);
      
      // Execute patch with timeout
      const executionPromise = this.executePatchWithValidation(patchData, patchInfo);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Execution timeout')), this.timeout);
      });
      
      await Promise.race([executionPromise, timeoutPromise]);
      
      // Mark as completed
      await this.markPatchCompleted(patchId, patchInfo);
      
    } catch (error) {
      console.error(`❌ [AUTO-TRIGGER] Patch execution failed: ${patchId}`, error.message);
      await this.handlePatchFailure(patchId, patchInfo, error);
    }
  }

  async readAndValidatePatch(patchPath) {
    try {
      const content = await fs.readFile(patchPath, 'utf8');
      const patchData = JSON.parse(content);
      
      // Auto-detect and convert format if needed
      const detectedFormat = this.formatConverter.detectFormat(patchData);
      let executorPatch;
      
      if (detectedFormat === 'webhook') {
        executorPatch = this.formatConverter.convertWebhookToExecutor(patchData);
      } else if (detectedFormat === 'executor') {
        executorPatch = patchData;
      } else {
        executorPatch = this.formatConverter.convert(patchData, 'executor');
      }
      
      // Validate patch structure
      this.validatePatchStructure(executorPatch);
      
      return executorPatch;
      
    } catch (error) {
      throw new Error(`Patch validation failed: ${error.message}`);
    }
  }

  validatePatchStructure(patch) {
    if (!patch.id) {
      throw new Error('Patch missing ID');
    }
    
    if (!patch.mutations || !Array.isArray(patch.mutations)) {
      throw new Error('Patch missing mutations array');
    }
    
    for (const mutation of patch.mutations) {
      if (!mutation.path || !mutation.contents) {
        throw new Error('Mutation missing path or contents');
      }
    }
    
    if (!patch.validation) {
      throw new Error('Patch missing validation configuration');
    }
  }

  async executePatchWithValidation(patchData, patchInfo) {
    const { mutations, postMutationBuild, validation } = patchData;
    
    // Execute mutations
    console.log(`🔧 [AUTO-TRIGGER] Applying ${mutations.length} mutations for ${patchData.id}`);
    
    for (const mutation of mutations) {
      await this.executeMutation(mutation);
    }
    
    // Run post-mutation build commands
    if (postMutationBuild && postMutationBuild.shell) {
      console.log(`⚡ [AUTO-TRIGGER] Running ${postMutationBuild.shell.length} build commands`);
      
      for (const command of postMutationBuild.shell) {
        await this.executeCommand(command);
      }
    }
    
    // Run validation pipeline
    if (validation) {
      console.log(`🧪 [AUTO-TRIGGER] Running validation pipeline for ${patchData.id}`);
      await this.runValidationPipeline(validation);
    }
    
    // Generate summary
    await this.generatePatchSummary(patchData, patchInfo, 'completed');
  }

  async executeMutation(mutation) {
    const { path: filePath, contents, type = 'file_modification' } = mutation;
    
    try {
      // Create directory if needed
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      
      // Write file
      await fs.writeFile(filePath, contents);
      
      console.log(`✅ [AUTO-TRIGGER] Applied mutation: ${filePath}`);
      
    } catch (error) {
      throw new Error(`Mutation failed for ${filePath}: ${error.message}`);
    }
  }

  async executeCommand(command) {
    return new Promise((resolve, reject) => {
      const { exec } = require('child_process');
      
      console.log(`⚡ [AUTO-TRIGGER] Executing: ${command}`);
      
      exec(command, { 
        cwd: '/Users/sawyer/gitSync/gpt-cursor-runner',
        timeout: 60000 // 1 minute timeout per command
      }, (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ [AUTO-TRIGGER] Command failed: ${command}`, error.message);
          reject(new Error(`Command execution failed: ${error.message}`));
        } else {
          console.log(`✅ [AUTO-TRIGGER] Command completed: ${command}`);
          resolve({ stdout, stderr });
        }
      });
    });
  }

  async runValidationPipeline(validation) {
    const validationResults = {};
    
    // TypeScript validation
    if (validation.typescript !== false) {
      try {
        await this.executeCommand('npx tsc --noEmit');
        validationResults.typescript = 'PASS';
      } catch (error) {
        validationResults.typescript = 'FAIL';
        throw new Error(`TypeScript validation failed: ${error.message}`);
      }
    }
    
    // ESLint validation
    if (validation.eslint !== false) {
      try {
        await this.executeCommand('npx eslint . --ext .ts,.tsx --max-warnings=0');
        validationResults.eslint = 'PASS';
      } catch (error) {
        validationResults.eslint = 'FAIL';
        throw new Error(`ESLint validation failed: ${error.message}`);
      }
    }
    
    // Runtime validation
    if (validation.runtime !== false) {
      try {
        await this.executeCommand('bash scripts/validate-runtime.sh');
        validationResults.runtime = 'PASS';
      } catch (error) {
        validationResults.runtime = 'FAIL';
        throw new Error(`Runtime validation failed: ${error.message}`);
      }
    }
    
    console.log(`✅ [AUTO-TRIGGER] Validation pipeline completed:`, validationResults);
    return validationResults;
  }

  async generatePatchSummary(patchData, patchInfo, status) {
    const summary = {
      patchId: patchData.id,
      status,
      timestamp: new Date().toISOString(),
      system: patchInfo.system,
      file: patchInfo.file,
      executionTime: new Date(patchInfo.startTime).getTime() - new Date(patchInfo.timestamp).getTime(),
      mutations: patchData.mutations.length,
      validation: patchData.validation
    };
    
    // Write summary to appropriate directory
    const summaryDir = this.summaryDirectories[patchInfo.system];
    const summaryFile = path.join(summaryDir, `summary-${patchData.id}.md`);
    
    const summaryContent = `# Patch Execution Summary

**Patch ID**: ${patchData.id}
**Status**: ${status.toUpperCase()}
**System**: ${patchInfo.system}
**Timestamp**: ${new Date().toISOString()}
**Execution Time**: ${summary.executionTime}ms

## Details
- **File**: ${patchInfo.file}
- **Mutations**: ${patchData.mutations.length}
- **Validation**: ${JSON.stringify(patchData.validation, null, 2)}

## Result
${status === 'completed' ? '✅ Patch executed successfully' : '❌ Patch execution failed'}

---
*Generated by Autonomous Patch Trigger*
`;
    
    await fs.writeFile(summaryFile, summaryContent);
    console.log(`📄 [AUTO-TRIGGER] Summary generated: ${summaryFile}`);
  }

  async markPatchCompleted(patchId, patchInfo) {
    // Move patch file to completed directory
    const completedDir = path.join(path.dirname(patchInfo.path), '.completed');
    const completedPath = path.join(completedDir, patchInfo.file);
    
    await fs.rename(patchInfo.path, completedPath);
    
    // Update tracking
    this.executingPatches.delete(patchId);
    this.completedPatches.set(patchId, {
      ...patchInfo,
      completedAt: new Date().toISOString()
    });
    
    console.log(`✅ [AUTO-TRIGGER] Patch completed: ${patchId}`);
    
    // Notify status API
    await this.notifyStatusUpdate(patchId, 'completed', {
      completedAt: new Date().toISOString()
    });
  }

  async handlePatchFailure(patchId, patchInfo, error) {
    const executingInfo = this.executingPatches.get(patchId);
    const retryCount = executingInfo ? executingInfo.retryCount : 0;
    
    if (retryCount < this.maxRetries) {
      // Retry patch
      console.log(`🔄 [AUTO-TRIGGER] Retrying patch ${patchId} (attempt ${retryCount + 1}/${this.maxRetries})`);
      
      this.executingPatches.set(patchId, {
        ...executingInfo,
        retryCount: retryCount + 1
      });
      
      // Schedule retry
      setTimeout(() => {
        this.executePatch(patchId);
      }, this.retryDelay);
      
    } else {
      // Mark as failed
      await this.markPatchFailed(patchId, patchInfo, error);
    }
  }

  async markPatchFailed(patchId, patchInfo, error) {
    // Move patch file to failed directory
    const failedDir = path.join(path.dirname(patchInfo.path), '.failed');
    const failedPath = path.join(failedDir, patchInfo.file);
    
    await fs.rename(patchInfo.path, failedPath);
    
    // Update tracking
    this.executingPatches.delete(patchId);
    this.failedPatches.set(patchId, {
      ...patchInfo,
      failedAt: new Date().toISOString(),
      error: error.message
    });
    
    console.log(`❌ [AUTO-TRIGGER] Patch failed: ${patchId} - ${error.message}`);
    
    // Generate failure summary
    await this.generatePatchSummary(
      { id: patchId, mutations: [], validation: {} },
      patchInfo,
      'failed'
    );
    
    // Notify status API
    await this.notifyStatusUpdate(patchId, 'failed', {
      failedAt: new Date().toISOString(),
      error: error.message
    });
  }

  async notifyStatusUpdate(patchId, status, details) {
    if (this.statusAPI) {
      try {
        await this.statusAPI.updatePatchStatus(patchId, status, details);
      } catch (error) {
        console.warn(`⚠️ [AUTO-TRIGGER] Failed to notify status API:`, error.message);
      }
    }
  }

  handleStatusUpdate(patchId, status) {
    // Handle status updates from other systems
    console.log(`📊 [AUTO-TRIGGER] Status update received: ${patchId} - ${status.status}`);
  }

  getStatus() {
    return {
      pending: this.pendingPatches.size,
      executing: this.executingPatches.size,
      completed: this.completedPatches.size,
      failed: this.failedPatches.size,
      total: this.pendingPatches.size + this.executingPatches.size + 
             this.completedPatches.size + this.failedPatches.size
    };
  }

  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.statusAPI) {
      this.statusAPI.stop();
    }
    
    console.log('🛑 [AUTO-TRIGGER] Autonomous patch trigger stopped');
  }
}

// Export for use in other modules
module.exports = AutonomousPatchTrigger;

// CLI interface
if (require.main === module) {
  const trigger = new AutonomousPatchTrigger();
  trigger.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 [AUTO-TRIGGER] Shutting down...');
    trigger.stop();
    process.exit(0);
  });
} 