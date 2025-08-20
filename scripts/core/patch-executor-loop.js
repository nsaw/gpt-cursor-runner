// Looping Patch Executor - Runs continuously and processes patches
const _MONITOR_HOST = 'https://runner-thoughtmarks.THOUGHTMARKS.app';
const _WEBHOOK_ROUTE = 'https://webhook-thoughtmarks.THOUGHTMARKS.app/webhook';

const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const _POLL_INTERVAL = 5000; // 5 seconds
const _PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const _MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches';
const _CYOPS_SUMMARIES_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';
const _ROOT_LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs';
const _EXEC_STATUS_FILE = path.join(_ROOT_LOGS_DIR, 'patch-executor-status.json');
let _lastHeartbeat = 0;

// Ensure patch directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(_PATCH_DIR, { recursive: true });
    await fs.mkdir(_MAIN_PATCH_DIR, { recursive: true });
    await fs.mkdir(_ROOT_LOGS_DIR, { recursive: true });
    console.log('✅ [LOOP-EXECUTOR] Patch directories verified');
  } catch (_error) {
    console.error(
      '❌ [LOOP-EXECUTOR] Failed to create patch directories: ',
      _error.message,
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
    _lastHeartbeat = Date.now();
  } catch (_error) {
    console.error('❌ [LOOP-EXECUTOR] Failed to write heartbeat:', _error.message);
  }
}

// Process patches in a directory
async function processPatches(_patchDir, _agentName) {
  try {
    // Get all patch files from patch directory
    const _files = await fs.readdir(_patchDir);
    const _patchFiles = _files.filter(
      (file) => file.endsWith('.json') && !file.startsWith('.'),
    );

    if (_patchFiles.length === 0) {
      return; // No patches to process
    }

    console.log(
      `🔄 [LOOP-EXECUTOR] Found ${_patchFiles.length} patch files in ${_agentName} queue.`,
    );

    // Process each patch sequentially
    for (const file of _patchFiles) {
      const _patchFile = path.join(_patchDir, file);

      try {
        console.log(
          `📦 [LOOP-EXECUTOR] Processing ${_agentName} patch: ${file}`,
        );

        const _patchData = JSON.parse(await fs.readFile(_patchFile, 'utf8'));

        // Handle GPT's nested patch structure
        const _actualPatch =
          _patchData.patch && typeof _patchData.patch === 'object'
            ? _patchData.patch
            : _patchData;

        // Policy enforcement: Check disabledByDefault
        if (
          _actualPatch.disabledByDefault === true &&
          process.env.ENABLE_DISABLED_PATCHES !== '1'
        ) {
          throw new Error('Patch is disabled by default');
        }

        // Move patch to completed
        const completedDir = path.join(_patchDir, '.completed');
        await fs.mkdir(completedDir, { recursive: true });
        await fs.rename(_patchFile, path.join(completedDir, file));

        console.log(`✅ [LOOP-EXECUTOR] Completed ${_agentName} patch: ${file}`);
      } catch (_error) {
        console.error(
          `❌ [LOOP-EXECUTOR] Failed to process ${_agentName} patch ${file}:`,
          _error.message,
        );

        // Move patch to failed
        const failedDir = path.join(_patchDir, '.failed');
        await fs.mkdir(failedDir, { recursive: true });
        await fs.rename(_patchFile, path.join(failedDir, file));
      }
    }
  } catch (_error) {
    console.error(
      `❌ [LOOP-EXECUTOR] Failed to process ${_agentName} patches:`,
      _error.message,
    );
  }
}

// Main loop
async function mainLoop() {
  console.log('🔄 [LOOP-EXECUTOR] Starting continuous patch processor...');
  console.log(`📁 [LOOP-EXECUTOR] Monitoring CYOPS: ${_PATCH_DIR}`);
  console.log(`📁 [LOOP-EXECUTOR] Monitoring MAIN: ${_MAIN_PATCH_DIR}`);
  console.log(`⏱️  [LOOP-EXECUTOR] Poll interval: ${_POLL_INTERVAL}ms`);

  // Ensure directories exist
  await ensureDirectories();

  // Main processing loop
  while (true) {
    try {
      // Write heartbeat
      await writeHeartbeat();

      // Process CYOPS patches
      await processPatches(_PATCH_DIR, 'CYOPS');

      // Process MAIN patches
      await processPatches(_MAIN_PATCH_DIR, 'MAIN');

      // Wait for next iteration
      await new Promise(resolve => setTimeout(resolve, _POLL_INTERVAL));
    } catch (_error) {
      console.error('❌ [LOOP-EXECUTOR] Main loop error:', _error.message);
      await new Promise(resolve => setTimeout(resolve, _POLL_INTERVAL));
    }
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 [LOOP-EXECUTOR] Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 [LOOP-EXECUTOR] Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start the main loop
mainLoop().catch(_error => {
  console.error('❌ [LOOP-EXECUTOR] Fatal error:', _error.message);
  process.exit(1);
});