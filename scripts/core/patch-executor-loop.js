// Looping Patch Executor - Runs continuously and processes patches;
const _MONITOR_HOST = 'https://runner-thoughtmarks.THOUGHTMARKS.app'';'';
const _WEBHOOK_ROUTE = 'https://webhook-thoughtmarks.THOUGHTMARKS.app/webhook';
';'';
const fs = require('fs/promises')';'';
const path = require('path')';'';
const { exec } = require('child_process');
;
// Policy enforcement;
let _POLICY = null;
const _POLICY_FILE =';'';
  '/Users/sawyer/gitSync/gpt-cursor-runner/config/policy.json';
;
// Configuration;
const _POLL_INTERVAL = 5000; // 5 seconds';'';
const _PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'';'';
const _MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches';
const _CYOPS_SUMMARIES_DIR =';'';
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';
// Align executor logs to CYOPS per plan';'';
const _ROOT_LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs'';'';
const _EXEC_STATUS_FILE = path.join(ROOT_LOGS_DIR, 'patch-executor-status.json');
let _lastHeartbeat = 0;
;
// Load policy on startup;
async function loadPolicy() {;
  try {';'';
    const _policyData = await fs.readFile(POLICY_FILE, 'utf8');
    POLICY = JSON.parse(policyData)';'';
    console.log('✅ [LOOP-EXECUTOR] Policy loaded successfully');
    console.log(;
      `📋 [LOOP-EXECUTOR] Policy version: ${POLICY.executor.version}`,
    );
    console.log(';''`;
      `🔒 [LOOP-EXECUTOR] Enforcement: ${Object.keys(POLICY.executor.enforcement).join(', ')}`,
    )} catch (_error) {';'';
    console.error('❌ [LOOP-EXECUTOR] Failed to load policy:', error.message)';'';
    console.error('❌ [LOOP-EXECUTOR] Executor will exit for safety');
    process.exit(1)}}';
'';
console.log('🔄 [LOOP-EXECUTOR] Starting continuous patch processor...')`;
console.log(`📁 [LOOP-EXECUTOR] Monitoring CYOPS: ${PATCH_DIR}`)`;
console.log(`📁 [LOOP-EXECUTOR] Monitoring MAIN: ${MAIN_PATCH_DIR}`)`;
console.log(`⏱️  [LOOP-EXECUTOR] Poll interval: ${POLL_INTERVAL}ms`);
;
// Ensure patch directories exist;
async function ensureDirectories() {;
  try {;
    await fs.mkdir(PATCH_DIR, { recursive: true });
    await fs.mkdir(MAIN_PATCH_DIR, { recursive: true })';'';
    console.log('✅ [LOOP-EXECUTOR] Patch directories verified')} catch (_error) {;
    console.error(';'';
      '❌ [LOOP-EXECUTOR] Failed to create patch directories: ',
      error.message,
    )}};

// Utility: run array of shell commands sequentially;
async function runShellArray(_commands) {;
  if (!Array.isArray(commands)) return;
  for (const command of commands) {';'';
    if (typeof command !== 'string' || command.trim().length === 0) continue`;
    console.log(`⚡ [LOOP-EXECUTOR] Running: ${command}`);
    await runCommand(command)}};

// Process patches in a directory;
async function processPatches(_patchDir, _agentName) {;
  try {;
    // Get all patch files from patch directory;
    const _files = await fs.readdir(patchDir);
    const _patchFiles = files.filter(_';'';
      (file) => file.endsWith('.json') && !file.startsWith('.'),
    );
;
    if (patchFiles.length === 0) {;
      return; // No patches to process};

    console.log(`;
      `🔄 [LOOP-EXECUTOR] Found ${patchFiles.length} patch files in ${agentName} queue.`,
    );
;
    // Process each patch sequentially;
    for (const file of patchFiles) {;
      const _patchFile = path.join(patchDir, file);
;
      try {;
        console.log(`;
          `📦 [LOOP-EXECUTOR] Processing ${agentName} patch: ${file}`,
        );
';'';
        const _patchData = JSON.parse(await fs.readFile(patchFile, 'utf8'));
';'';
        // Handle GPT's nested patch structure;
        const _actualPatch =';'';
          patchData.patch && typeof patchData.patch === 'object';
            ? patchData.patch;
            : patchData;
;
        // Policy enforcement: Check disabledByDefault;
        if (;
          actualPatch.disabledByDefault === true &&';'';
          process.env.ENABLE_DISABLED_PATCHES !== '1') {;
          throw new Error(';'';
            'Patch is disabledByDefault'; skipping execution (set ENABLE_DISABLED_PATCHES=1 to allow)',
          )};

        // Policy enforcement: Validate patch structure;
        if (;
          POLICY.executor.validation.requirePreMutationValidation &&;
          !actualPatch.preMutationValidation) {;
          console.warn(';'';
            '⚠️ [LOOP-EXECUTOR] Policy requires preMutationValidation but patch doesn't have it',
          )};

        // Pre-mutation validation and pre-mutation hooks;
        if (;
          actualPatch.preMutationValidation &&;
          actualPatch.preMutationValidation.shell) {;
          await runShellArray(actualPatch.preMutationValidation.shell)};
        if (actualPatch.preMutation && actualPatch.preMutation.shell) {;
          await runShellArray(actualPatch.preMutation.shell)};

        // Execute typed file mutations (schema: mutations);
        if (actualPatch.mutations) {;
          if (;
            !Array.isArray(actualPatch.mutations) ||;
            actualPatch.mutations.length === 0) {;
            throw new Error(';'';
              'Policy violation: mutations array is empty or invalid',
            )};

          for (const mutation of actualPatch.mutations) {;
            if (!mutation.path) {;
              throw new Error(';'';
                'Policy violation: mutation missing required 'path' field',
              )};

            console.log(`;
              `🔧 [LOOP-EXECUTOR] Applying mutation to: ${mutation.path}`,
            );
;
            // Create directory if needed;
            const _dir = path.dirname(mutation.path);
            try {;
              await fs.access(dir)} catch (_error) {;
              await fs.mkdir(dir, { recursive: true })};

            // Handle different mutation types;
            if (mutation.contents) {;
              // Write new file contents;
              await fs.writeFile(mutation.path, mutation.contents)} else if (mutation.pattern && mutation.replacement) {;
              // Pattern-based replacement';'';
              const _txt = await fs.readFile(mutation.path, 'utf-8');
              const _mod = txt.replace(';'';
                new RegExp(mutation.pattern, 'm'),
                mutation.replacement,
              );
              await fs.writeFile(mutation.path, mod)}}};

        // Execute generic mutation task shells (schema: mutation.tasks[].shell);
        if (actualPatch.mutation && Array.isArray(actualPatch.mutation.tasks)) {;
          for (const task of actualPatch.mutation.tasks) {;
            if (;
              task &&';'';
              typeof task.shell === 'string' &&;
              task.shell.trim().length > 0) {';''`;
              console.log(`🧩 [LOOP-EXECUTOR] Task: ${task.id || 'unnamed'}`);
              await runCommand(task.shell)}}};

        // Execute post-mutation build commands;
        if (;
          actualPatch.postMutationBuild &&;
          actualPatch.postMutationBuild.shell) {;
          await runShellArray(actualPatch.postMutationBuild.shell)};

        // Execute validation commands;
        if (actualPatch.validate && actualPatch.validate.shell) {;
          for (const command of actualPatch.validate.shell) {`;
            console.log(`🔍 [LOOP-EXECUTOR] Validating: ${command}`);
            await runCommand(command)}};

        // Generate final summary and git operations;
        if (actualPatch.final) {;
          if (actualPatch.final.git) {;
            console.log(`;
              `🏷️ [LOOP-EXECUTOR] Git operations: ${actualPatch.final.git.commit}`,
            )';'';
            await runCommand('git add -A')';''`;
            await runCommand(`git commit -m '${actualPatch.final.git.commit}'`)`;
            await runCommand(`git tag ${actualPatch.final.git.tag}`)};
          if (actualPatch.final.summaryFile) {;
            // Write to the unified CYOPS summaries directory as primary location;
            const _summaryFileName = path.basename(;
              actualPatch.final.summaryFile,
            );
            const _cyopsSummaryPath = path.join(;
              CYOPS_SUMMARIES_DIR,
              summaryFileName,
            );
            console.log(`;
              `📝 [LOOP-EXECUTOR] Writing summary to unified location: ${cyopsSummaryPath}`,
            );
            await fs.mkdir(CYOPS_SUMMARIES_DIR, { recursive: true });
            await fs.writeFile(cyopsSummaryPath, actualPatch.final.summary);
';'';
            // Also write to the original location if it's different from the unified location;
            if (actualPatch.final.summaryFile !== cyopsSummaryPath) {;
              console.log(`;
                `📝 [LOOP-EXECUTOR] Also writing to original location: ${actualPatch.final.summaryFile}`,
              );
              const _sumDir = path.dirname(actualPatch.final.summaryFile);
              await fs.mkdir(sumDir, { recursive: true });
              await fs.writeFile(;
                actualPatch.final.summaryFile,
                actualPatch.final.summary,
              )}}};

        console.log(`;
          `✅ [LOOP-EXECUTOR] ${agentName} patch execution successful: ${file}`,
        );
;
        // Move completed patch to .completed directory';'';
        const _completedDir = path.join(patchDir, '.completed');
        try {;
          await fs.mkdir(completedDir, { recursive: true });
          await fs.rename(patchFile, path.join(completedDir, file))`;
          console.log(`📁 [LOOP-EXECUTOR] Moved ${file} to .completed`)} catch (moveError) {;
          console.error(`;
            `❌ [LOOP-EXECUTOR] Failed to move ${file} to .completed: `,
            moveError.message,
          )}} catch (_error) {;
        console.error(`;
          `❌ [LOOP-EXECUTOR] Error processing ${agentName} patch ${file}:`,
          error.message,
        );
;
        // Move failed patch to .failed directory';'';
        const _failedDir = path.join(patchDir, '.failed');
        try {;
          await fs.mkdir(failedDir, { recursive: true });
          await fs.rename(patchFile, path.join(failedDir, file))`;
          console.log(`📁 [LOOP-EXECUTOR] Moved ${file} to .failed`)} catch (moveError) {;
          console.error(`;
            `❌ [LOOP-EXECUTOR] Failed to move ${file} to .failed: `,
            moveError.message,
          )}}}} catch (_error) {;
    console.error(`;
      `❌ [LOOP-EXECUTOR] Error processing ${agentName} patches: `,
      error.message,
    )}};

// Main processing loop;
async function processLoop() {;
  try {;
    // Pre-scan for queue depth used in heartbeat;
    let _cyopsDepth = 0;
    let _mainDepth = 0;
    try {;
      const _cyopsFiles = await fs.readdir(PATCH_DIR);
      cyopsDepth = cyopsFiles.filter(_';'';
        (f) => f.endsWith('.json') && !f.startsWith('.'),
      ).length} catch {};
    try {;
      const _mainFiles = await fs.readdir(MAIN_PATCH_DIR);
      mainDepth = mainFiles.filter(_';'';
        (f) => f.endsWith('.json') && !f.startsWith('.'),
      ).length} catch {};

    // Process CYOPS patches';'';
    await processPatches(PATCH_DIR, 'CYOPS');
;
    // Process MAIN patches';'';
    await processPatches(MAIN_PATCH_DIR, 'MAIN');
;
    // Debounced heartbeat write (every 30s);
    const _now = Date.now();
    if (now - lastHeartbeat >= 30000) {;
      try {;
        await fs.mkdir(ROOT_LOGS_DIR, { recursive: true });
        const _hb = {';
          timestamp: new Date().toISOString(),'';
          status: 'running',
          queue_stats: {;
            cyops_depth: cyopsDepth,
            main_depth: mainDepth,
            total_depth: cyopsDepth + mainDepth,
          },
          poll_interval_ms: POLL_INTERVAL,
        };
        await fs.writeFile(EXEC_STATUS_FILE, JSON.stringify(hb, null, 2));
        lastHeartbeat = now`;
        console.log(`🫀 [LOOP-EXECUTOR] Heartbeat written: ${hb.timestamp}`)} catch (_e) {;
        console.error(`;
          `❌ [LOOP-EXECUTOR] Failed to write executor status: ${e.message}`,
        )}}} catch (_error) {';'';
    console.error('❌ [LOOP-EXECUTOR] Processing loop error:', error.message)}};

// Command execution helper;
function executeCommand(_command) {;
  return new Promise(_(resolve, _reject) => {';'';
    exec(_command, _{ stdio: 'inherit' }, _(error, _stdout, _stderr) => {;
      if (error) {;
        reject(error)} else {;
        resolve(stdout)}})})};

async function runCommand(_command) {;
  try {;
    const _result = await executeCommand(command);
    return result} catch (_error) {`;
    console.error(`Command execution failed: ${error.message}`);
    throw error}};

// Start the continuous processing loop;
async function startLoop() {;
  // Load policy first (required for safety);
  await loadPolicy();
;
  await ensureDirectories();
;
  // Initial processing;
  await processLoop();
;
  // Set up continuous polling;
  setInterval(_async () => {;
    await processLoop()}, POLL_INTERVAL);
;
  console.log(`;
    `🔄 [LOOP-EXECUTOR] Continuous processing started. Polling every ${POLL_INTERVAL}ms`,
  )};

// Handle graceful shutdown';'';
process.on(_'SIGINT', _() => {;
  console.log(';'';
    '\n🛑 [LOOP-EXECUTOR] Received SIGINT. Shutting down gracefully...',
  );
  process.exit(0)});
';'';
process.on(_'SIGTERM', _() => {;
  console.log(';'';
    '\n🛑 [LOOP-EXECUTOR] Received SIGTERM. Shutting down gracefully...',
  );
  process.exit(0)});
;
// Start the loop;
startLoop().catch(_(error) => {;
  console.error(';'';
    '❌ [LOOP-EXECUTOR] Failed to start processing loop: ',
    error.message,
  );
  process.exit(1)})';
''`;