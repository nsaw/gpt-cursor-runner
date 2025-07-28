#!/usr/bin/env node

/**
 * Simple Patch Executor
 * Monitors patch queue and executes patches
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Simple Patch Executor starting...');

// Create necessary directories
const queueDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const patchesDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const heartbeatDir = path.join(__dirname, '..', 'summaries', '_heartbeat');

[queueDir, patchesDir, heartbeatDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Update last MD write log
const lastWriteLog = path.join(heartbeatDir, '.last-md-write.log');
const timestamp = new Date().toISOString();
fs.appendFileSync(lastWriteLog, `${timestamp} - Simple patch executor started\n`);

console.log('✅ Simple Patch Executor started');

// Function to process patches
function processPatches() {
  try {
    const files = fs.readdirSync(queueDir);
    const patchFiles = files.filter(file => file.endsWith('.json'));

    if (patchFiles.length === 0) {
      console.log('[EXECUTOR] No patch files found in queue.');
      return;
    }

    console.log(`[EXECUTOR] Found ${patchFiles.length} patch files to process.`);

    for (const file of patchFiles) {
      try {
        console.log(`[EXECUTOR] Processing patch: ${file}`);
                
        const patchFile = path.join(queueDir, file);
        const patchData = JSON.parse(fs.readFileSync(patchFile, 'utf8'));

        // Execute patch mutations
        if (patchData.mutations) {
          for (const mutation of patchData.mutations) {
            console.log(`[EXECUTOR] Applying mutation to: ${mutation.path}`);

            // Create directory if needed
            const dir = path.dirname(mutation.path);
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(mutation.path, mutation.contents);
          }
        }

        console.log(`[EXECUTOR] ✅ Patch completed: ${file}`);

      } catch (error) {
        console.error(`[EXECUTOR] ❌ Error processing ${file}:`, error.message);
      }
    }

  } catch (error) {
    console.error('[EXECUTOR] ❌ Patch processing failed:', error.message);
  }
}

// Process patches every 30 seconds
setInterval(() => {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(lastWriteLog, `${timestamp} - Patch executor heartbeat\n`);
  console.log('💓 Patch executor heartbeat');
  processPatches();
}, 30000); // Every 30 seconds

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('🔧 Simple Patch Executor shutting down...');
  process.exit(0);
}); 