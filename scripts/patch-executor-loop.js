// Looping Patch Executor - Runs continuously and processes patches
const MONITOR_HOST = 'https://runner-thoughtmarks.THOUGHTMARKS.app';
const WEBHOOK_ROUTE = 'https://webhook-thoughtmarks.THOUGHTMARKS.app/webhook';

const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const POLL_INTERVAL = 5000; // 5 seconds
const PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches';

console.log('🔄 [LOOP-EXECUTOR] Starting continuous patch processor...');
console.log(`📁 [LOOP-EXECUTOR] Monitoring CYOPS: ${PATCH_DIR}`);
console.log(`📁 [LOOP-EXECUTOR] Monitoring MAIN: ${MAIN_PATCH_DIR}`);
console.log(`⏱️  [LOOP-EXECUTOR] Poll interval: ${POLL_INTERVAL}ms`);

// Ensure patch directories exist
async function ensureDirectories() {
  try {
    await fs.mkdir(PATCH_DIR, { recursive: true });
    await fs.mkdir(MAIN_PATCH_DIR, { recursive: true });
    console.log('✅ [LOOP-EXECUTOR] Patch directories verified');
  } catch (error) {
    console.error('❌ [LOOP-EXECUTOR] Failed to create patch directories:', error.message);
  }
}

// Process patches in a directory
async function processPatches(patchDir, agentName) {
  try {
    // Get all patch files from patch directory
    const files = await fs.readdir(patchDir);
    const patchFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));

    if (patchFiles.length === 0) {
      return; // No patches to process
    }

    console.log(`🔄 [LOOP-EXECUTOR] Found ${patchFiles.length} patch files in ${agentName} queue.`);

    // Process each patch sequentially
    for (const file of patchFiles) {
      const patchFile = path.join(patchDir, file);
      
      try {
        console.log(`📦 [LOOP-EXECUTOR] Processing ${agentName} patch: ${file}`);
        
        const patchData = JSON.parse(await fs.readFile(patchFile, 'utf8'));

        // Execute patch mutations
        if (patchData.mutations) {
          for (const mutation of patchData.mutations) {
            console.log(`🔧 [LOOP-EXECUTOR] Applying mutation to: ${mutation.path}`);

            // Create directory if needed
            const dir = path.dirname(mutation.path);
            try {
              await fs.access(dir);
            } catch {
              await fs.mkdir(dir, { recursive: true });
            }

            // Write file
            await fs.writeFile(mutation.path, mutation.contents);
          }
        }

        // Execute post-mutation build commands
        if (patchData.postMutationBuild && patchData.postMutationBuild.shell) {
          for (const command of patchData.postMutationBuild.shell) {
            console.log(`⚡ [LOOP-EXECUTOR] Running: ${command}`);
            await runCommand(command);
          }
        }

        console.log(`✅ [LOOP-EXECUTOR] ${agentName} patch execution successful: ${file}`);
        
        // Move completed patch to .completed directory
        const completedDir = path.join(patchDir, '.completed');
        try {
          await fs.mkdir(completedDir, { recursive: true });
          await fs.rename(patchFile, path.join(completedDir, file));
          console.log(`📁 [LOOP-EXECUTOR] Moved ${file} to .completed`);
        } catch (moveError) {
          console.error(`❌ [LOOP-EXECUTOR] Failed to move ${file} to .completed:`, moveError.message);
        }

      } catch (error) {
        console.error(`❌ [LOOP-EXECUTOR] Error processing ${agentName} patch ${file}:`, error.message);
        
        // Move failed patch to .failed directory
        const failedDir = path.join(patchDir, '.failed');
        try {
          await fs.mkdir(failedDir, { recursive: true });
          await fs.rename(patchFile, path.join(failedDir, file));
          console.log(`📁 [LOOP-EXECUTOR] Moved ${file} to .failed`);
        } catch (moveError) {
          console.error(`❌ [LOOP-EXECUTOR] Failed to move ${file} to .failed:`, moveError.message);
        }
      }
    }

  } catch (error) {
    console.error(`❌ [LOOP-EXECUTOR] Error processing ${agentName} patches:`, error.message);
  }
}

// Main processing loop
async function processLoop() {
  try {
    // Process CYOPS patches
    await processPatches(PATCH_DIR, 'CYOPS');
    
    // Process MAIN patches
    await processPatches(MAIN_PATCH_DIR, 'MAIN');
    
  } catch (error) {
    console.error('❌ [LOOP-EXECUTOR] Processing loop error:', error.message);
  }
}

// Command execution helper
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

async function runCommand(command) {
  try {
    const result = await executeCommand(command);
    return result;
  } catch (error) {
    console.error(`Command execution failed: ${error.message}`);
    throw error;
  }
}

// Start the continuous processing loop
async function startLoop() {
  await ensureDirectories();
  
  // Initial processing
  await processLoop();
  
  // Set up continuous polling
  setInterval(async () => {
    await processLoop();
  }, POLL_INTERVAL);
  
  console.log(`🔄 [LOOP-EXECUTOR] Continuous processing started. Polling every ${POLL_INTERVAL}ms`);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 [LOOP-EXECUTOR] Received SIGINT. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 [LOOP-EXECUTOR] Received SIGTERM. Shutting down gracefully...');
  process.exit(0);
});

// Start the loop
startLoop().catch(error => {
  console.error('❌ [LOOP-EXECUTOR] Failed to start processing loop:', error.message);
  process.exit(1);
}); 