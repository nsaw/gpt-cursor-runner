// Looping Patch Executor - Runs continuously and processes patches
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const _POLL_INTERVAL = 5000; // 5 seconds
const _PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const _MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches';
const _ROOT_LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs';
const _EXEC_STATUS_FILE = path.join(_ROOT_LOGS_DIR, 'patch-executor-status.json');
const _STATUS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_g2o-status';

// Load allowlist
let _allowlist = null;

async function loadAllowlist() {
  try {
    const allowlistPath = '/Users/sawyer/gitSync/gpt-cursor-runner/config/g2o-allowed-commands.json';
    _allowlist = JSON.parse(await fs.readFile(allowlistPath, 'utf8'));
    
    console.log('✅ [LOOP-EXECUTOR] Allowlist loaded');
  } catch (error) {
    console.error('❌ [LOOP-EXECUTOR] Failed to load allowlist:', error.message);
    throw error;
  }
}

// Validate patch against schema
function validatePatch(patchData) {
  try {
    // Basic structure check
    if (!patchData.patch || typeof patchData.patch !== 'object') {
      throw new Error('Invalid patch structure: missing or invalid patch object');
    }
    
    const patch = patchData.patch;
    
    // Required fields
    if (!patch.id || typeof patch.id !== 'string') {
      throw new Error('Invalid patch: missing or invalid id');
    }
    
    if (!patch.kind || typeof patch.kind !== 'string') {
      throw new Error('Invalid patch: missing or invalid kind');
    }
    
    // Validate kind enum
    const validKinds = ['operational_smoke', 'feature', 'bugfix', 'refactor', 'test'];
    if (!validKinds.includes(patch.kind)) {
      throw new Error(`Invalid patch kind: ${patch.kind}. Must be one of: ${validKinds.join(', ')}`);
    }
    
    // Validate arrays are strings
    const arrayFields = ['preflight', 'execution', 'validation'];
    for (const field of arrayFields) {
      if (patch[field] && !Array.isArray(patch[field])) {
        throw new Error(`Invalid patch: ${field} must be an array`);
      }
      if (patch[field]) {
        for (const item of patch[field]) {
          if (typeof item !== 'string') {
            throw new Error(`Invalid patch: ${field} items must be strings`);
          }
        }
      }
    }
    
    // Validate options
    if (patch.options && typeof patch.options !== 'object') {
      throw new Error('Invalid patch: options must be an object');
    }
    
    if (patch.options) {
      if (patch.options.dryRun !== undefined && typeof patch.options.dryRun !== 'boolean') {
        throw new Error('Invalid patch: options.dryRun must be boolean');
      }
      if (patch.options.timeoutMs !== undefined && typeof patch.options.timeoutMs !== 'number') {
        throw new Error('Invalid patch: options.timeoutMs must be number');
      }
      if (patch.options.timeoutMs !== undefined && (patch.options.timeoutMs < 1000 || patch.options.timeoutMs > 60000)) {
        throw new Error('Invalid patch: options.timeoutMs must be between 1000 and 60000');
      }
    }
    
    return true;
  } catch (error) {
    throw new Error(`Schema validation failed: ${error.message}`);
  }
}

// Check if command is allowed
function isCommandAllowed(command) {
  if (!_allowlist || !_allowlist.allowedCommands) {
    return false;
  }
  
  return _allowlist.allowedCommands.some(allowed => command.startsWith(allowed));
}

// Execute command with timeout
async function executeCommand(command, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, { stdio: 'pipe' });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({
        code,
        stdout,
        stderr,
        success: code === 0
      });
    });
    
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

// Write status file
async function writeStatusFile(patchId, type, data) {
  try {
    const statusFile = path.join(_STATUS_DIR, `${patchId}.${type}.json`);
    await fs.writeFile(statusFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`❌ [LOOP-EXECUTOR] Failed to write status file ${type}:`, error.message);
  }
}

// Process a single patch
async function processPatch(patchFile, patchDir, agentName) {
  const patchId = path.basename(patchFile, '.json');
  const startTime = Date.now();
  
  try {
    console.log(`📦 [LOOP-EXECUTOR] Processing ${agentName} patch: ${patchId}`);
    
    // Read and parse patch
    const patchData = JSON.parse(await fs.readFile(patchFile, 'utf8'));
    
    // Handle GPT's nested patch structure
    const actualPatch = patchData.patch && typeof patchData.patch === 'object' ? patchData.patch : patchData;
    
    // Validate patch
    validatePatch(patchData);
    
    // Check if dry run
    const isDryRun = actualPatch.options && actualPatch.options.dryRun === true;
    const timeoutMs = actualPatch.options && actualPatch.options.timeoutMs ? actualPatch.options.timeoutMs : 10000;
    
    if (isDryRun) {
      console.log(`📋 [LOOP-EXECUTOR] DRY RUN for ${patchId}`);
      
      // Create plan
      const plan = {
        patchId,
        agentName,
        timestamp: new Date().toISOString(),
        isDryRun: true,
        steps: []
      };
      
      // Add preflight steps
      if (actualPatch.preflight) {
        for (const command of actualPatch.preflight) {
          if (!isCommandAllowed(command)) {
            throw new Error(`Command not allowed in preflight: ${command}`);
          }
          plan.steps.push({ phase: 'preflight', command, allowed: true });
        }
      }
      
      // Add execution steps
      if (actualPatch.execution) {
        for (const command of actualPatch.execution) {
          if (!isCommandAllowed(command)) {
            throw new Error(`Command not allowed in execution: ${command}`);
          }
          plan.steps.push({ phase: 'execution', command, allowed: true });
        }
      }
      
      // Add validation steps
      if (actualPatch.validation) {
        for (const command of actualPatch.validation) {
          if (!isCommandAllowed(command)) {
            throw new Error(`Command not allowed in validation: ${command}`);
          }
          plan.steps.push({ phase: 'validation', command, allowed: true });
        }
      }
      
      // Write plan
      await writeStatusFile(patchId, 'plan', plan);
      
      // Move to completed (dry run)
      const completedDir = path.join(patchDir, '.completed');
      await fs.mkdir(completedDir, { recursive: true });
      await fs.rename(patchFile, path.join(completedDir, path.basename(patchFile)));
      
      console.log(`✅ [LOOP-EXECUTOR] DRY RUN completed for ${patchId}`);
      return;
    }
    
    // Execute patch
    const trace = {
      patchId,
      agentName,
      timestamp: new Date().toISOString(),
      isDryRun: false,
      steps: []
    };
    
    // Execute preflight
    if (actualPatch.preflight) {
      for (const command of actualPatch.preflight) {
        if (!isCommandAllowed(command)) {
          throw new Error(`Command not allowed in preflight: ${command}`);
        }
        
        const stepStart = Date.now();
        try {
          const result = await executeCommand(command, timeoutMs);
          const stepEnd = Date.now();
          
          trace.steps.push({
            phase: 'preflight',
            command,
            success: result.success,
            code: result.code,
            durationMs: stepEnd - stepStart,
            stdout: result.stdout,
            stderr: result.stderr
          });
          
          if (!result.success) {
            throw new Error(`Preflight command failed: ${command} (exit code: ${result.code})`);
          }
        } catch (error) {
          const stepEnd = Date.now();
          trace.steps.push({
            phase: 'preflight',
            command,
            success: false,
            error: error.message,
            durationMs: stepEnd - stepStart
          });
          throw error;
        }
      }
    }
    
    // Execute execution
    if (actualPatch.execution) {
      for (const command of actualPatch.execution) {
        if (!isCommandAllowed(command)) {
          throw new Error(`Command not allowed in execution: ${command}`);
        }
        
        const stepStart = Date.now();
        try {
          const result = await executeCommand(command, timeoutMs);
          const stepEnd = Date.now();
          
          trace.steps.push({
            phase: 'execution',
            command,
            success: result.success,
            code: result.code,
            durationMs: stepEnd - stepStart,
            stdout: result.stdout,
            stderr: result.stderr
          });
          
          if (!result.success) {
            throw new Error(`Execution command failed: ${command} (exit code: ${result.code})`);
          }
        } catch (error) {
          const stepEnd = Date.now();
          trace.steps.push({
            phase: 'execution',
            command,
            success: false,
            error: error.message,
            durationMs: stepEnd - stepStart
          });
          throw error;
        }
      }
    }
    
    // Execute validation
    if (actualPatch.validation) {
      for (const command of actualPatch.validation) {
        if (!isCommandAllowed(command)) {
          throw new Error(`Command not allowed in validation: ${command}`);
        }
        
        const stepStart = Date.now();
        try {
          const result = await executeCommand(command, timeoutMs);
          const stepEnd = Date.now();
          
          trace.steps.push({
            phase: 'validation',
            command,
            success: result.success,
            code: result.code,
            durationMs: stepEnd - stepStart,
            stdout: result.stdout,
            stderr: result.stderr
          });
          
          if (!result.success) {
            throw new Error(`Validation command failed: ${command} (exit code: ${result.code})`);
          }
        } catch (error) {
          const stepEnd = Date.now();
          trace.steps.push({
            phase: 'validation',
            command,
            success: false,
            error: error.message,
            durationMs: stepEnd - stepStart
          });
          throw error;
        }
      }
    }
    
    // Write trace
    await writeStatusFile(patchId, 'trace', trace);
    
    // Write done status
    const doneData = {
      patchId,
      agentName,
      timestamp: new Date().toISOString(),
      success: true,
      totalDurationMs: Date.now() - startTime
    };
    await writeStatusFile(patchId, 'done', doneData);
    
    // Move to completed
    const completedDir = path.join(patchDir, '.completed');
    await fs.mkdir(completedDir, { recursive: true });
    await fs.rename(patchFile, path.join(completedDir, path.basename(patchFile)));
    
    console.log(`✅ [LOOP-EXECUTOR] Completed ${agentName} patch: ${patchId}`);
    
  } catch (error) {
    console.error(`❌ [LOOP-EXECUTOR] Failed to process ${agentName} patch ${patchId}:`, error.message);
    
    // Write error status
    const errorData = {
      patchId,
      agentName,
      timestamp: new Date().toISOString(),
      success: false,
      error: error.message,
      totalDurationMs: Date.now() - startTime
    };
    await writeStatusFile(patchId, 'error', errorData);
    
    // Move to failed
    const failedDir = path.join(patchDir, '.failed');
    await fs.mkdir(failedDir, { recursive: true });
    await fs.rename(patchFile, path.join(failedDir, path.basename(patchFile)));
  }
}

// Process patches in a directory
async function processPatches(patchDir, agentName) {
  try {
    // Get all patch files from patch directory
    const files = await fs.readdir(patchDir);
    const patchFiles = files.filter(
      (file) => file.endsWith('.json') && !file.startsWith('.'),
    );

    if (patchFiles.length === 0) {
      return; // No patches to process
    }

    console.log(
      `🔄 [LOOP-EXECUTOR] Found ${patchFiles.length} patch files in ${agentName} queue.`,
    );

    // Process each patch sequentially
    for (const file of patchFiles) {
      const patchFile = path.join(patchDir, file);
      await processPatch(patchFile, patchDir, agentName);
    }
  } catch (error) {
    console.error(
      `❌ [LOOP-EXECUTOR] Failed to process ${agentName} patches:`,
      error.message,
    );
  }
}

// Ensure patch directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(_PATCH_DIR, { recursive: true });
    await fs.mkdir(_MAIN_PATCH_DIR, { recursive: true });
    await fs.mkdir(_ROOT_LOGS_DIR, { recursive: true });
    await fs.mkdir(_STATUS_DIR, { recursive: true });
    console.log('✅ [LOOP-EXECUTOR] Patch directories verified');
  } catch (error) {
    console.error(
      '❌ [LOOP-EXECUTOR] Failed to create patch directories: ',
      error.message,
    );
  }
}

// Write heartbeat
async function writeHeartbeat() {
  try {
    const heartbeat = {
      timestamp: new Date().toISOString(),
      status: 'running',
      patchDir: _PATCH_DIR,
      mainPatchDir: _MAIN_PATCH_DIR,
    };
    await fs.writeFile(_EXEC_STATUS_FILE, JSON.stringify(heartbeat, null, 2));
  } catch (error) {
    console.error('❌ [LOOP-EXECUTOR] Failed to write heartbeat:', error.message);
  }
}

// Main loop
async function mainLoop() {
  console.log('🔄 [LOOP-EXECUTOR] Starting continuous patch processor...');
  console.log(`📁 [LOOP-EXECUTOR] Monitoring CYOPS: ${_PATCH_DIR}`);
  console.log(`📁 [LOOP-EXECUTOR] Monitoring MAIN: ${_MAIN_PATCH_DIR}`);
  console.log(`⏱️  [LOOP-EXECUTOR] Poll interval: ${_POLL_INTERVAL}ms`);

  // Load schema and allowlist
  await loadAllowlist();

  // Ensure directories exist
  await ensureDirectories();

  // Main processing loop
  while (true) { // eslint-disable-line no-constant-condition
    try {
      // Write heartbeat
      await writeHeartbeat();

      // Process CYOPS patches
      await processPatches(_PATCH_DIR, 'CYOPS');

      // Process MAIN patches
      await processPatches(_MAIN_PATCH_DIR, 'MAIN');

      // Wait for next iteration
      await new Promise(resolve => setTimeout(resolve, _POLL_INTERVAL));
    } catch (error) {
      console.error('❌ [LOOP-EXECUTOR] Main loop error:', error.message);
      await new Promise(resolve => setTimeout(resolve, _POLL_INTERVAL));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 [LOOP-EXECUTOR] Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 [LOOP-EXECUTOR] Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start the main loop
mainLoop().catch(error => {
  console.error('❌ [LOOP-EXECUTOR] Fatal error:', error.message);
  process.exit(1);
});