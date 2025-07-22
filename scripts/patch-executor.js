const fs = require('fs/promises');
const path = require('path');

(async () => {
  try {
    console.log('[EXECUTOR] Starting async patch processor...');

    // Ensure queue directory exists
    try {
      await fs.access('tasks/queue');
    } catch {
      await fs.mkdir('tasks/queue', { recursive: true });
    }

    // Get all patch files from queue
    const files = await fs.readdir('tasks/queue');
    const patchFiles = files.filter(file => file.endsWith('.json'));

    if (patchFiles.length === 0) {
      console.log('[EXECUTOR] No patch files found in queue.');
      return;
    }

    console.log(`[EXECUTOR] Found ${patchFiles.length} patch files to process.`);

    // Process each patch sequentially with await
    for (const file of patchFiles) {
      try {
        console.log(`[EXECUTOR] Processing patch: ${file}`);
        
        const patchFile = path.join('tasks/queue', file);
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
          const { execSync } = require('child_process');
          for (const command of patchData.postMutationBuild.shell) {
            console.log(`[EXECUTOR] Running: ${command}`);
            execSync(command, { stdio: 'inherit' });
          }
        }

        console.log(`[EXECUTOR] ✅ Patch completed: ${file}`);

      } catch (error) {
        console.error(`[EXECUTOR] ❌ Error processing ${file}:`, error.message);
        // Continue with next patch instead of throwing
      }
    }

    console.log('[EXECUTOR] ✅ All patches processed successfully.');

  } catch (error) {
    console.error('[EXECUTOR] ❌ Patch processing failed:', error.message);
    process.exit(1);
  }
})(); 