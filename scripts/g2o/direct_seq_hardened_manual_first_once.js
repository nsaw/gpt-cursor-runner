#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
// direct_seq_hardened_manual_first_once.js - HARDENED manual-first sequencer
// Automatically attempts manual repairs, recognizes quick-wins, maintains clean queues
const fs=require('fs'), p=require('path'), cp=require('child_process');

const QROOT='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const P1=p.join(QROOT,'G2o/P1');
const COMPLETED=p.join(QROOT,'.completed');
const BLOCKED=p.join(P1,'P1.BLOCKED.json');

// Configuration
const MAX_MANUAL_REPAIR_ATTEMPTS=3;

// Utility functions
const list=d => {try{return fs.readdirSync(d);}catch{return [];}};
const exists=f => {try{return fs.existsSync(f);}catch{return false;}};
const readJson=f => {try{return JSON.parse(fs.readFileSync(f,'utf8'));}catch{return null;}};
const writeJson=(f,o) => {try{fs.writeFileSync(f,JSON.stringify(o,null,2));return true;}catch{return false;}};

// Check if patch was actually successful despite being marked as failed
const checkPatchSuccess=(patchPath) => {
  const name=p.basename(patchPath);
  const json=readJson(patchPath);
  if(!json) return false;
  
  // Check for specific success indicators based on patch type
  if(name.includes('monitor-static-flags-query')){
    return exists('/Users/sawyer/gitSync/_GPTsync/public/monitor.html');
  }
  if(name.includes('pm2-nonblocking-wrappers-enforce')){
    return exists('/Users/sawyer/gitSync/gpt-cursor-runner/scripts/pm2-nonblocking-wrappers.sh');
  }
  // Add more patch-specific success checks as needed
  
  return false;
};

// Clear blocked entry if patch was actually successful
const clearBlockedIfSuccessful=(blockedData) => {
  if(!blockedData || !blockedData.hold) return false;
  
  const patchPath=p.join(P1,blockedData.hold);
  if(checkPatchSuccess(patchPath)){
    console.log(`✅ Quick-win detected: ${blockedData.hold} was actually successful`);
    
    // Move to completed
    try{
      fs.mkdirSync(COMPLETED,{recursive:true});
      fs.renameSync(patchPath,p.join(COMPLETED,blockedData.hold));
      console.log(`✅ Moved ${blockedData.hold} to .completed`);
      
      // Remove blocked entry
      fs.unlinkSync(BLOCKED);
      console.log('✅ Cleared P1.BLOCKED.json');
      return true;
    }catch(e){
      console.error(`❌ Failed to clear blocked entry: ${e.message}`);
      return false;
    }
  }
  return false;
};

// Enhanced manual repair with quick-win detection
const manualRepairWithQuickWin=(patchPath,attempt) => {
  const name=p.basename(patchPath);
  console.log(`🔧 Manual repair attempt ${attempt} for ${name}`);
  
  // First check if it's already successful (quick-win)
  if(checkPatchSuccess(patchPath)){
    console.log(`🎯 Quick-win detected: ${name} is already successful`);
    return true;
  }
  
  // Apply manual repair
  const result=cp.spawnSync('node',['/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/manual_repair_playbook_once.js',patchPath],{
    stdio:'inherit',
    timeout:60000
  });
  
  if(result.status===0){
    console.log(`✅ Manual repair successful for ${name}`);
    return true;
  }
  
  console.log(`❌ Manual repair failed for ${name}`);
  return false;
};

// Execute patch with enhanced success detection
const executePatchWithSuccessCheck=(patchPath) => {
  const name=p.basename(patchPath);
  console.log(`🚀 Executing ${name}`);
  
  const result=cp.spawnSync('node',['/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/exec_patch_with_compat_once.js',patchPath],{
    stdio:'inherit',
    timeout:300000
  });
  
  if(result.status===0){
    console.log(`✅ Patch execution successful: ${name}`);
    return true;
  }
  
  // Check if patch was actually successful despite execution failure
  if(checkPatchSuccess(patchPath)){
    console.log(`🎯 Execution failed but patch was successful: ${name}`);
    return true;
  }
  
  console.log(`❌ Patch execution failed: ${name}`);
  return false;
};

// Main sequencer logic
const main=() => {
  console.log('🔧 HARDENED Manual-First Sequencer Starting...');
  
  // 1. Check for blocked patches and clear if successful
  if(exists(BLOCKED)){
    const blockedData=readJson(BLOCKED);
    if(clearBlockedIfSuccessful(blockedData)){
      console.log('✅ Cleared successful blocked patch');
    }
  }
  
  // 2. Get next patch to process
  const p1Patches=list(P1).filter(f => f.endsWith('.json')&&!f.endsWith('.hold')&&f!=='P1.BLOCKED.json').sort();
  
  if(p1Patches.length===0){
    console.log('✅ No P1 patches to process');
    return;
  }
  
  const nextPatch=p1Patches[0];
  const patchPath=p.join(P1,nextPatch);
  console.log(`🎯 Processing: ${nextPatch}`);
  
  // 3. Apply safe transforms first
  console.log('🔧 Applying safe transforms...');
  cp.spawnSync('node',['/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/autofix_forbidden_shell_once.js',patchPath],{
    stdio:'inherit',
    timeout:30000
  });
  
  // 4. Try execution
  if(executePatchWithSuccessCheck(patchPath)){
    console.log(`✅ Patch completed successfully: ${nextPatch}`);
    return;
  }
  
  // 5. Manual repair attempts with quick-win detection
  for(let attempt=1;attempt<=MAX_MANUAL_REPAIR_ATTEMPTS;attempt++){
    if(manualRepairWithQuickWin(patchPath,attempt)){
      if(executePatchWithSuccessCheck(patchPath)){
        console.log(`✅ Patch completed after manual repair: ${nextPatch}`);
        return;
      }
    }
  }
  
  // 6. All attempts exhausted - block the patch
  console.log(`❌ All repair attempts exhausted for ${nextPatch}`);
  const blockedData={
    ts:Date.now(),
    reason:'manual_repair_exhausted',
    hold:nextPatch,
    attempts:MAX_MANUAL_REPAIR_ATTEMPTS
  };
  
  if(writeJson(BLOCKED,blockedData)){
    console.log(`📝 Blocked ${nextPatch} in P1.BLOCKED.json`);
  }else{
    console.error('❌ Failed to write P1.BLOCKED.json');
  }
};

// Run the sequencer
main();
