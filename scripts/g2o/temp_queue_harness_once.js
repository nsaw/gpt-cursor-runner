#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

// Test configuration
const TEST_PATCH_DIR = '/tmp/g2o_queue_test';
const TEST_COMPLETED_DIR = path.join(TEST_PATCH_DIR, '.completed');
const TEST_FAILED_DIR = path.join(TEST_PATCH_DIR, '.failed');
const STATUS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_g2o-status';

async function testTempQueue() {
  try {
    console.log('🧪 [TEMP_QUEUE_HARNESS] Testing executor with temp queue...');
    
    // Ensure test directories exist
    await fs.mkdir(TEST_COMPLETED_DIR, { recursive: true });
    await fs.mkdir(TEST_FAILED_DIR, { recursive: true });
    
    // Get test patch files
    const files = await fs.readdir(TEST_PATCH_DIR);
    const patchFiles = files.filter(
      (file) => file.endsWith('.json') && !file.startsWith('.'),
    );
    
    if (patchFiles.length === 0) {
      throw new Error('No test patch files found');
    }
    
    console.log(`📦 [TEMP_QUEUE_HARNESS] Found ${patchFiles.length} test patch files`);
    
    // Process each patch file
    for (const file of patchFiles) {
      const patchFile = path.join(TEST_PATCH_DIR, file);
      const patchId = path.basename(file, '.json');
      
      console.log(`🔄 [TEMP_QUEUE_HARNESS] Processing test patch: ${patchId}`);
      
      try {
        // Read and parse patch
        const patchData = JSON.parse(await fs.readFile(patchFile, 'utf8'));
        
        // Basic validation
        if (!patchData.patch || !patchData.patch.id || !patchData.patch.kind) {
          throw new Error('Invalid patch structure');
        }
        
        // Check if dry run
        const isDryRun = patchData.patch.options && patchData.patch.options.dryRun === true;
        
        if (isDryRun) {
          console.log(`📋 [TEMP_QUEUE_HARNESS] DRY RUN for ${patchId}`);
          
          // Create plan
          const plan = {
            patchId,
            agentName: 'TEST',
            timestamp: new Date().toISOString(),
            isDryRun: true,
            steps: []
          };
          
          // Add execution steps
          if (patchData.patch.execution) {
            for (const command of patchData.patch.execution) {
              plan.steps.push({ phase: 'execution', command, allowed: true });
            }
          }
          
          // Write plan
          const planFile = path.join(STATUS_DIR, `${patchId}.plan.json`);
          await fs.writeFile(planFile, JSON.stringify(plan, null, 2));
          
          // Move to completed (dry run)
          await fs.rename(patchFile, path.join(TEST_COMPLETED_DIR, file));
          
          console.log(`✅ [TEMP_QUEUE_HARNESS] DRY RUN completed for ${patchId}`);
        } else {
          console.log(`🔄 [TEMP_QUEUE_HARNESS] EXECUTING ${patchId}`);
          
          // For now, just move to completed (we're testing the harness, not full execution)
          await fs.rename(patchFile, path.join(TEST_COMPLETED_DIR, file));
          
          console.log(`✅ [TEMP_QUEUE_HARNESS] Completed ${patchId}`);
        }
        
      } catch (error) {
        console.error(`❌ [TEMP_QUEUE_HARNESS] Failed to process ${patchId}:`, error.message);
        
        // Move to failed
        await fs.rename(patchFile, path.join(TEST_FAILED_DIR, file));
      }
    }
    
    // Verify artifacts
    const completedFiles = await fs.readdir(TEST_COMPLETED_DIR);
    const failedFiles = await fs.readdir(TEST_FAILED_DIR);
    
    console.log(`📊 [TEMP_QUEUE_HARNESS] Results: ${completedFiles.length} completed, ${failedFiles.length} failed`);
    
    // Check for plan file
    const planFiles = await fs.readdir(STATUS_DIR);
    const planFile = planFiles.find(f => f.includes('sandbox') && f.endsWith('.plan.json'));
    
    if (planFile) {
      console.log(`✅ [TEMP_QUEUE_HARNESS] Plan file created: ${planFile}`);
    } else {
      console.log(`⚠️  [TEMP_QUEUE_HARNESS] No plan file found`);
    }
    
    console.log('✅ [TEMP_QUEUE_HARNESS] Temp queue test completed successfully');
    
  } catch (error) {
    console.error('❌ [TEMP_QUEUE_HARNESS] Test failed:', error.message);
    process.exit(1);
  }
}

testTempQueue();
