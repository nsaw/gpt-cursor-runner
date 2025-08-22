// Looping Patch Executor - Runs continuously and processes patches
const fs = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process'); // Added for command execution

// Configuration
const _POLL_INTERVAL = 5000; // 5 seconds
const _PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const _MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches';
const _ROOT_LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs';
const _EXEC_STATUS_FILE = path.join(_ROOT_LOGS_DIR, 'patch-executor-status.json');
const _STATUS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_g2o-status'; // New status directory

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

// Validate patch against schema (manual validation)
function validatePatch(patchData) {
  try {
    // Check required fields
    if (!patchData.patch || typeof patchData.patch !== 'object') {
      throw new Error('Missing or invalid patch object');
    }

    const patch = patchData.patch;
    
    if (!patch.id || typeof patch.id !== 'string') {
      throw new Error('Missing or invalid patch ID');
    }

    if (!patch.kind || typeof patch.kind !== 'string') {
      throw new Error('Missing or invalid patch kind');
    }

    // Validate ID pattern
    const idPattern = /^patch-v[0-9]+\.[0-9]+\.[0-9]+[a-z]?\(P[0-9]+\.[0-9]+\.[0-9]+\)_[a-zA-Z0-9_-]+$/;
    if (!idPattern.test(patch.id)) {
      throw new Error('Invalid patch ID format');
    }

    // Validate kind enum
    const validKinds = ['operational_smoke', 'feature', 'bugfix', 'refactor', 'test'];
    if (!validKinds.includes(patch.kind)) {
      throw new Error('Invalid patch kind');
    }

    // Validate arrays if present
    if (patch.preflight && !Array.isArray(patch.preflight)) {
      throw new Error('preflight must be an array');
    }

    if (patch.execution && !Array.isArray(patch.execution)) {
      throw new Error('execution must be an array');
    }

    if (patch.validation && !Array.isArray(patch.validation)) {
      throw new Error('validation must be an array');
    }

    // Validate options if present
    if (patch.options && typeof patch.options !== 'object') {
      throw new Error('options must be an object');
    }

    if (patch.options && patch.options.timeoutMs !== undefined) {
      if (typeof patch.options.timeoutMs !== 'number' || patch.options.timeoutMs < 1000 || patch.options.timeoutMs > 60000) {
        throw new Error('timeoutMs must be a number between 1000 and 60000');
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

  return _allowlist.allowedCommands.some(allowed => {
    // Check if command starts with allowed prefix
    return command.startsWith(allowed);
  });
}

// Execute command with timeout
async function executeCommand(command, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const child = spawn('bash', ['-c', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });

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
        stdout: stdout.trim(),
        stderr: stderr.trim()
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
    await fs.mkdir(_STATUS_DIR, { recursive: true });
    const statusFile = path.join(_STATUS_DIR, `${patchId}.${type}.json`);
    await fs.writeFile(statusFile, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`❌ [LOOP-EXECUTOR] Failed to write status file: ${error.message}`);
  }
}

// Process a single patch (new core logic)
async function processPatch(patchFile, patchDir, agentName) {
  const patchId = path.basename(patchFile, '.json');
  const startTime = Date.now();

  try {
    console.log(`📦 [LOOP-EXECUTOR] Processing ${agentName} patch: ${patchId}`);

    // Read and validate patch
    const patchData = JSON.parse(await fs.readFile(patchFile, 'utf8'));
    validatePatch(patchData);

    const patch = patchData.patch;
    const isDryRun = patch.options && patch.options.dryRun === true;
    const timeoutMs = patch.options && patch.options.timeoutMs ? patch.options.timeoutMs : 10000;

    // Create status tracking
    let status = {
      patchId,
      agentName,
      timestamp: new Date().toISOString(),
      isDryRun,
      startTime,
      steps: []
    };

    // Handle dry-run mode
    if (isDryRun) {
      console.log(`📋 [LOOP-EXECUTOR] DRY RUN for ${patchId}`);
      
      // Create execution plan
      const plan = { ...status, plan: [] };
      
      if (patch.preflight) {
        for (const command of patch.preflight) {
          plan.plan.push({
            phase: 'preflight',
            command,
            allowed: isCommandAllowed(command)
          });
        }
      }

      if (patch.execution) {
        for (const command of patch.execution) {
          plan.plan.push({
            phase: 'execution',
            command,
            allowed: isCommandAllowed(command)
          });
        }
      }

      if (patch.validation) {
        for (const command of patch.validation) {
          plan.plan.push({
            phase: 'validation',
            command,
            allowed: isCommandAllowed(command)
          });
        }
      }

      // Write plan file
      await writeStatusFile(patchId, 'plan', plan);
      
      // Move to completed for dry-run
      const completedDir = path.join(patchDir, '.completed');
      await fs.mkdir(completedDir, { recursive: true });
      await fs.rename(patchFile, path.join(completedDir, path.basename(patchFile)));
      
      console.log(`✅ [LOOP-EXECUTOR] DRY RUN completed for ${patchId}`);
      return;
    }

    // Execute preflight commands
    if (patch.preflight) {
      for (const command of patch.preflight) {
        const stepStart = Date.now();
        const step = {
          phase: 'preflight',
          command,
          allowed: isCommandAllowed(command),
          startTime: new Date().toISOString()
        };

        if (!isCommandAllowed(command)) {
          step.error = 'Command not in allowlist';
          step.duration = Date.now() - stepStart;
          status.steps.push(step);
          throw new Error(`Preflight command not allowed: ${command}`);
        }

        try {
          const result = await executeCommand(command, timeoutMs);
          step.duration = Date.now() - stepStart;
          step.exitCode = result.code;
          step.stdout = result.stdout;
          step.stderr = result.stderr;
          step.success = result.code === 0;
        } catch (error) {
          step.duration = Date.now() - stepStart;
          step.error = error.message;
          step.success = false;
        }

        status.steps.push(step);

        if (!step.success) {
          throw new Error(`Preflight command failed: ${command}`);
        }
      }
    }

    // Execute main commands
    if (patch.execution) {
      for (const command of patch.execution) {
        const stepStart = Date.now();
        const step = {
          phase: 'execution',
          command,
          allowed: isCommandAllowed(command),
          startTime: new Date().toISOString()
        };

        if (!isCommandAllowed(command)) {
          step.error = 'Command not in allowlist';
          step.duration = Date.now() - stepStart;
          status.steps.push(step);
          throw new Error(`Execution command not allowed: ${command}`);
        }

        try {
          const result = await executeCommand(command, timeoutMs);
          step.duration = Date.now() - stepStart;
          step.exitCode = result.code;
          step.stdout = result.stdout;
          step.stderr = result.stderr;
          step.success = result.code === 0;
        } catch (error) {
          step.duration = Date.now() - stepStart;
          step.error = error.message;
          step.success = false;
        }

        status.steps.push(step);

        if (!step.success) {
          throw new Error(`Execution command failed: ${command}`);
        }
      }
    }

    // Execute validation commands
    if (patch.validation) {
      for (const command of patch.validation) {
        const stepStart = Date.now();
        const step = {
          phase: 'validation',
          command,
          allowed: isCommandAllowed(command),
          startTime: new Date().toISOString()
        };

        if (!isCommandAllowed(command)) {
          step.error = 'Command not in allowlist';
          step.duration = Date.now() - stepStart;
          status.steps.push(step);
          throw new Error(`Validation command not allowed: ${command}`);
        }

        try {
          const result = await executeCommand(command, timeoutMs);
          step.duration = Date.now() - stepStart;
          step.exitCode = result.code;
          step.stdout = result.stdout;
          step.stderr = result.stderr;
          step.success = result.code === 0;
        } catch (error) {
          step.duration = Date.now() - stepStart;
          step.error = error.message;
          step.success = false;
        }

        status.steps.push(step);

        if (!step.success) {
          throw new Error(`Validation command failed: ${command}`);
        }
      }
    }

    // Mark as successful
    status.endTime = Date.now();
    status.duration = status.endTime - startTime;
    status.success = true;

    // Write status file
    await writeStatusFile(patchId, 'status', status);

    // Move to completed
    const completedDir = path.join(patchDir, '.completed');
    await fs.mkdir(completedDir, { recursive: true });
    await fs.rename(patchFile, path.join(completedDir, path.basename(patchFile)));

    console.log(`✅ [LOOP-EXECUTOR] Completed ${agentName} patch: ${patchId}`);

  } catch (error) {
    console.error(`❌ [LOOP-EXECUTOR] Failed to process ${agentName} patch ${patchId}:`, error.message);

    // Write error status
    const errorStatus = {
      patchId,
      agentName,
      timestamp: new Date().toISOString(),
      startTime,
      endTime: Date.now(),
      duration: Date.now() - startTime,
      success: false,
      error: error.message,
      steps: []
    };

    await writeStatusFile(patchId, 'error', errorStatus);

    // Move to failed
    const failedDir = path.join(patchDir, '.failed');
    await fs.mkdir(failedDir, { recursive: true });
    await fs.rename(patchFile, path.join(failedDir, path.basename(patchFile)));
  }
}

// Process patches in a directory (now calls processPatch for each file)
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

// Ensure patch directories exist (updated to create _STATUS_DIR)
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

// Main loop (updated to call loadAllowlist and use new processPatches)
async function mainLoop() {
  console.log('🔄 [LOOP-EXECUTOR] Starting continuous patch processor...');
  console.log(`📁 [LOOP-EXECUTOR] Monitoring CYOPS: ${_PATCH_DIR}`);
  console.log(`📁 [LOOP-EXECUTOR] Monitoring MAIN: ${_MAIN_PATCH_DIR}`);
  console.log(`⏱️  [LOOP-EXECUTOR] Poll interval: ${_POLL_INTERVAL}ms`);

  // Load allowlist first
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