#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

// Test configuration
const TEST_PATCH_DIR = '/tmp/g2o_queue_test';
const TEST_COMPLETED_DIR = path.join(TEST_PATCH_DIR, '.completed');
const TEST_FAILED_DIR = path.join(TEST_PATCH_DIR, '.failed');

async function testExecutorLoop() {
  try {
    console.log('🧪 [HARNESS] Starting executor loop test...');
    
    // Ensure test directories exist
    await fs.mkdir(TEST_COMPLETED_DIR, { recursive: true });
    await fs.mkdir(TEST_FAILED_DIR, { recursive: true });
    
    // Get test patch files
    const files = await fs.readdir(TEST_PATCH_DIR);
    const patchFiles = files.filter(
      (file) => file.endsWith('.json') && !file.startsWith('.'),
    );
    
    if (patchFiles.length === 0) {
      console.log('❌ [HARNESS] No test patch files found');
      process.exit(1);
    }
    
    console.log(`📦 [HARNESS] Found ${patchFiles.length} test patch files`);
    
    // Process each test patch
    for (const file of patchFiles) {
      const patchFile = path.join(TEST_PATCH_DIR, file);
      
      try {
        console.log(`🔄 [HARNESS] Processing test patch: ${file}`);
        
        const patchData = JSON.parse(await fs.readFile(patchFile, 'utf8'));
        
        // Handle nested patch structure
        const actualPatch = patchData.patch && typeof patchData.patch === 'object'
          ? patchData.patch
          : patchData;
        
        // Execute patch commands
        if (actualPatch.execution && Array.isArray(actualPatch.execution)) {
          for (const command of actualPatch.execution) {
            console.log(`⚡ [HARNESS] Executing: ${command}`);
            
            // Use child_process to execute command
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);
            
            try {
              const { stdout, stderr } = await execAsync(command, { timeout: 10000 });
              if (stdout) console.log(`📤 [HARNESS] stdout: ${stdout}`);
              if (stderr) console.log(`📤 [HARNESS] stderr: ${stderr}`);
            } catch (execError) {
              console.error(`❌ [HARNESS] Command failed: ${execError.message}`);
              throw execError;
            }
          }
        }
        
        // Move to completed
        await fs.rename(patchFile, path.join(TEST_COMPLETED_DIR, file));
        console.log(`✅ [HARNESS] Completed test patch: ${file}`);
        
      } catch (error) {
        console.error(`❌ [HARNESS] Failed to process test patch ${file}:`, error.message);
        
        // Move to failed
        await fs.rename(patchFile, path.join(TEST_FAILED_DIR, file));
      }
    }
    
    // Verify test output
    const testOutputExists = await fs.access('/tmp/ghost_smoke_test.md').then(() => true).catch(() => false);
    if (testOutputExists) {
      const testContent = await fs.readFile('/tmp/ghost_smoke_test.md', 'utf8');
      console.log(`✅ [HARNESS] Test output verified: ${testContent}`);
    } else {
      console.log('❌ [HARNESS] Test output not found');
      process.exit(1);
    }
    
    console.log('✅ [HARNESS] Executor loop test passed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ [HARNESS] Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testExecutorLoop();

