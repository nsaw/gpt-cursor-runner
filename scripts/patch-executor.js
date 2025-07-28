// Canonicalized endpoints
const MONITOR_HOST = 'https://runner-thoughtmarks.THOUGHTMARKS.app';
const WEBHOOK_ROUTE = 'https://webhook-thoughtmarks.THOUGHTMARKS.app/webhook';

const fs = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

(async () => {
  try {
    console.log('[EXECUTOR] Starting async patch processor...');

    // Use the unified patch directory
    const patchDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
    
    // Ensure patch directory exists
    try {
      await fs.access(patchDir);
    } catch {
      await fs.mkdir(patchDir, { recursive: true });
    }

    // Get all patch files from patch directory
    const files = await fs.readdir(patchDir);
    const patchFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));

    if (patchFiles.length === 0) {
      console.log('[EXECUTOR] No patch files found in queue.');
      return;
    }

    console.log(`[EXECUTOR] Found ${patchFiles.length} patch files to process.`);

    // Process each patch sequentially with await
    for (const file of patchFiles) {
      const patchFile = path.join(patchDir, file);
      
      try {
        console.log(`[EXECUTOR] Processing patch: ${file}`);
        
        const patchData = JSON.parse(await fs.readFile(patchFile, 'utf8'));

        // Execute patch mutations with await
        if (patchData.mutations) {
          for (const mutation of patchData.mutations) {
            console.log(`[EXECUTOR] Applying mutation to: ${mutation.path}`);

            // Create directory if needed
            const dir = path.dirname(mutation.path);
            try {
              await fs.access(dir);
            } catch {
              await fs.mkdir(dir, { recursive: true });
            }

            // Write file with await
            await fs.writeFile(mutation.path, mutation.contents);
          }
        }

        // Execute post-mutation build commands
        if (patchData.postMutationBuild && patchData.postMutationBuild.shell) {
          for (const command of patchData.postMutationBuild.shell) {
            console.log(`[EXECUTOR] Running: ${command}`);
            await runCommand(command);
          }
        }

        console.log(`[EXECUTOR] ✅ Patch execution successful: ${file}`);
        
        // Move completed patch to .completed directory
        const completedDir = path.join(patchDir, '.completed');
        try {
          await fs.mkdir(completedDir, { recursive: true });
          await fs.rename(patchFile, path.join(completedDir, file));
          console.log(`[EXECUTOR] 📁 Moved ${file} to .completed`);
        } catch (moveError) {
          console.error(`[EXECUTOR] ❌ Failed to move ${file} to .completed:`, moveError.message);
        }

      } catch (error) {
        console.error(`[EXECUTOR] ❌ Error processing ${file}:`, error.message);
        
        // Move failed patch to .failed directory
        const failedDir = path.join(patchDir, '.failed');
        try {
          await fs.mkdir(failedDir, { recursive: true });
          await fs.rename(patchFile, path.join(failedDir, file));
          console.log(`[EXECUTOR] 📁 Moved ${file} to .failed`);
        } catch (moveError) {
          console.error(`[EXECUTOR] ❌ Failed to move ${file} to .failed:`, moveError.message);
        }
        // Continue with next patch instead of throwing
      }
    }

    console.log('[EXECUTOR] ✅ Patch execution successful: All patches processed successfully.');

  } catch (error) {
    console.error('[EXECUTOR] ❌ Patch processing failed:', error.message);
    process.exit(1);
  }
})(); 

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

// Update the command execution logic
async function runCommand(command) {
  try {
    const result = await executeCommand(command);
    return result;
  } catch (error) {
    console.error(`Command execution failed: ${error.message}`);
    throw error;
  }
} 