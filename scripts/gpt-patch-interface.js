#!/usr/bin/env node
/**
 * GPT Patch Interface
 * 
 * Provides a simple interface for GPT to trigger patch execution
 * and monitor patch status autonomously.
 * 
 * Usage:
 *   node scripts/gpt-patch-interface.js send <patch-file>
 *   node scripts/gpt-patch-interface.js status <patch-id>
 *   node scripts/gpt-patch-interface.js monitor
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const RUNNER_URL = 'http://localhost:5051';
const CYOPS_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches';

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Test runner availability
async function testRunner() {
  return new Promise((resolve) => {
    const command = `curl -s -o /dev/null -w "%{http_code}" "${RUNNER_URL}/health"`;
    exec(command, (error, stdout) => {
      if (error) {
        resolve({ available: false, error: error.message });
      } else {
        const statusCode = parseInt(stdout.trim());
        resolve({ 
          available: statusCode === 200, 
          statusCode 
        });
      }
    });
  });
}

// Send patch to runner via API
async function sendPatchToRunner(patchData) {
  return new Promise((resolve) => {
    const tempFile = `/tmp/patch-${Date.now()}.json`;
    fs.writeFileSync(tempFile, JSON.stringify(patchData, null, 2));
    
    const command = `curl -s -X POST "${RUNNER_URL}/api/patches" -H "Content-Type: application/json" -d @${tempFile}`;
    
    exec(command, (error, stdout) => {
      // Clean up temp file
      try { 
        fs.unlinkSync(tempFile); 
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        try {
          const response = JSON.parse(stdout);
          resolve({ success: true, response });
        } catch (e) {
          resolve({ success: false, error: 'Invalid JSON response', stdout });
        }
      }
    });
  });
}

// Copy patch to CYOPS directory for autonomous execution
async function copyPatchToCYOPS(patchData, patchId) {
  try {
    const patchFile = path.join(CYOPS_PATCH_DIR, `${patchId}.json`);
    fs.writeFileSync(patchFile, JSON.stringify(patchData, null, 2));
    log(`✅ Copied patch to CYOPS: ${patchFile}`);
    return { success: true, file: patchFile };
  } catch (error) {
    log(`❌ Failed to copy patch: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Check patch status
async function checkPatchStatus(patchId) {
  try {
    // Check if patch exists in CYOPS
    const cyopsFile = path.join(CYOPS_PATCH_DIR, `${patchId}.json`);
    const cyopsCompleted = path.join(CYOPS_PATCH_DIR, '.completed', `${patchId}.json`);
    const cyopsFailed = path.join(CYOPS_PATCH_DIR, '.failed', `${patchId}.json`);
    
    // Check if patch exists in MAIN
    const mainFile = path.join(MAIN_PATCH_DIR, `${patchId}.json`);
    const mainCompleted = path.join(MAIN_PATCH_DIR, '.completed', `${patchId}.json`);
    const mainFailed = path.join(MAIN_PATCH_DIR, '.failed', `${patchId}.json`);
    
    let status = 'unknown';
    let location = 'unknown';
    
    if (fs.existsSync(cyopsFile)) {
      status = 'pending';
      location = 'CYOPS';
    } else if (fs.existsSync(cyopsCompleted)) {
      status = 'completed';
      location = 'CYOPS/.completed';
    } else if (fs.existsSync(cyopsFailed)) {
      status = 'failed';
      location = 'CYOPS/.failed';
    } else if (fs.existsSync(mainFile)) {
      status = 'pending';
      location = 'MAIN';
    } else if (fs.existsSync(mainCompleted)) {
      status = 'completed';
      location = 'MAIN/.completed';
    } else if (fs.existsSync(mainFailed)) {
      status = 'failed';
      location = 'MAIN/.failed';
    }
    
    return { success: true, status, location, patchId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Monitor patch execution
async function monitorPatchExecution(patchId, timeoutMs = 60000) {
  log(`🔍 Monitoring patch execution: ${patchId}`);
  
  const startTime = Date.now();
  const checkInterval = 5000; // Check every 5 seconds
  
  return new Promise((resolve) => {
    const interval = setInterval(async () => {
      const status = await checkPatchStatus(patchId);
      
      if (status.success) {
        log(`📊 Patch ${patchId}: ${status.status} (${status.location})`);
        
        if (status.status === 'completed') {
          clearInterval(interval);
          resolve({ success: true, status: 'completed', location: status.location });
        } else if (status.status === 'failed') {
          clearInterval(interval);
          resolve({ success: false, status: 'failed', location: status.location });
        }
      }
      
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(interval);
        resolve({ success: false, status: 'timeout', error: 'Patch execution timed out' });
      }
    }, checkInterval);
  });
}

// Send patch command
async function sendPatch(patchFile) {
  try {
    log(`📦 Loading patch from: ${patchFile}`);
    
    if (!fs.existsSync(patchFile)) {
      log(`❌ Patch file not found: ${patchFile}`);
      return { success: false, error: 'Patch file not found' };
    }
    
    const patchData = JSON.parse(fs.readFileSync(patchFile, 'utf8'));
    const patchId = patchData.id || path.basename(patchFile, '.json');
    
    log(`🆔 Patch ID: ${patchId}`);
    
    // Test runner availability
    const runnerStatus = await testRunner();
    if (!runnerStatus.available) {
      log(`❌ Runner not available (status: ${runnerStatus.statusCode})`);
      return { success: false, error: 'Runner not available' };
    }
    
    log(`✅ Runner available`);
    
    // Copy patch to CYOPS for autonomous execution
    const copyResult = await copyPatchToCYOPS(patchData, patchId);
    if (!copyResult.success) {
      return copyResult;
    }
    
    // Send patch to runner via API
    const apiResult = await sendPatchToRunner(patchData);
    if (!apiResult.success) {
      log(`⚠️ API send failed: ${apiResult.error}`);
    } else {
      log(`✅ API send successful`);
    }
    
    // Monitor execution
    log(`🔍 Starting execution monitoring...`);
    const monitorResult = await monitorPatchExecution(patchId);
    
    return {
      success: true,
      patchId,
      copyResult,
      apiResult,
      monitorResult
    };
    
  } catch (error) {
    log(`❌ Error sending patch: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  const command = process.argv[2];
  const arg = process.argv[3];
  
  switch (command) {
    case 'send':
      if (!arg) {
        log('❌ Please specify a patch file to send');
        log('Usage: node scripts/gpt-patch-interface.js send <patch-file>');
        break;
      }
      const result = await sendPatch(arg);
      console.log(JSON.stringify(result, null, 2));
      break;
      
    case 'status':
      if (!arg) {
        log('❌ Please specify a patch ID');
        log('Usage: node scripts/gpt-patch-interface.js status <patch-id>');
        break;
      }
      const status = await checkPatchStatus(arg);
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case 'monitor':
      if (!arg) {
        log('❌ Please specify a patch ID to monitor');
        log('Usage: node scripts/gpt-patch-interface.js monitor <patch-id>');
        break;
      }
      const monitorResult = await monitorPatchExecution(arg);
      console.log(JSON.stringify(monitorResult, null, 2));
      break;
      
    default:
      console.log('🤖 GPT Patch Interface');
      console.log('=====================');
      console.log('');
      console.log('Usage:');
      console.log('  node scripts/gpt-patch-interface.js send <patch-file>    - Send patch for execution');
      console.log('  node scripts/gpt-patch-interface.js status <patch-id>    - Check patch status');
      console.log('  node scripts/gpt-patch-interface.js monitor <patch-id>   - Monitor patch execution');
      console.log('');
      console.log('Features:');
      console.log('  ✅ Autonomous patch execution');
      console.log('  ✅ Real-time status monitoring');
      console.log('  ✅ API integration');
      console.log('  ✅ CYOPS/MAIN routing');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  sendPatch,
  checkPatchStatus,
  monitorPatchExecution,
  testRunner
}; 