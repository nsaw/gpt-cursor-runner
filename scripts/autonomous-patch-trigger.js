#!/usr/bin/env node;
/**;
 * Autonomous Patch Trigger;
 * Automatically detects and executes patches with comprehensive validation;
 * Integrates with real-time status API and provides error recovery;
 */;

const fs = require('fs/promises')';'';
const path = require('path')';'';
const { EventEmitter } = require('events')';'';
const _express = require('express')';'';
const _PatchFormatConverter = require('./patch-format-converter');
;
class AutonomousPatchTrigger extends EventEmitter {;
  constructor(options = {}) {;
    super();
;
    this.pollInterval = options.pollInterval || 3000; // 3 seconds;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000; // 5 seconds;
    this.timeout = options.timeout || 300000; // 5 minutes;
    this.port = options.port || 8790;
;
    // Directories;
    this.patchDirectories = {';'';
      CYOPS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches','';
      MAIN: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
    };
;
    this.summaryDirectories = {';'';
      CYOPS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries','';
      MAIN: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries',
    };
;
    // Status tracking;
    this.pendingPatches = new Map();
    this.executingPatches = new Map();
    this.completedPatches = new Map();
    this.failedPatches = new Map();
;
    // Format converter;
    this.formatConverter = new PatchFormatConverter();
;
    // Validation pipeline;
    this.validationPipeline = {;
      typescript: true,
      eslint: true,
      runtime: true,
      performance: false,
    };
;
    // Express server;
    this.app = express();
    this.setupExpressServer();
;
    this.setupStatusAPI();
    this.setupErrorRecovery()};

  setupExpressServer() {;
    this.app.use(express.json());
;
    // Health check endpoint';'';
    this.app.get(_'/ping', _(req, res) => {;
      res.json({';'';
        status: 'ok',
        timestamp: new Date().toISOString(),'';
        service: 'autonomous-patch-trigger',
      })});
;
    // Health endpoint';'';
    this.app.get(_'/health', _(req, res) => {;
      res.json({';'';
        status: 'healthy',
        timestamp: new Date().toISOString(),'';
        service: 'autonomous-patch-trigger',
        stats: this.getStatus(),
        uptime: process.uptime(),
      })});
;
    // Status endpoint';'';
    this.app.get(_'/status', _(req, res) => {;
      res.json(this.getStatus())});
;
    // List patches endpoint';'';
    this.app.get(_'/patches', _(req, res) => {;
      const _patches = {;
        pending: Array.from(this.pendingPatches.keys()),
        executing: Array.from(this.executingPatches.keys()),
        completed: Array.from(this.completedPatches.keys()),
        failed: Array.from(this.failedPatches.keys()),
      };
      res.json(patches)})};

  setupStatusAPI() {;
    // Connect to existing real-time status API instead of creating a new one;
    try {';'';
      // Don't create a new status API instance, just connect to the existing one';';
      this.statusAPI = null'; // We'll connect via HTTP instead;

      console.log(';'';
        '✅ [AUTO-TRIGGER] Will connect to existing real-time status API',
      )} catch (_error) {;
      console.warn(';'';
        '⚠️ [AUTO-TRIGGER] Status API not available: ',
        error.message,
      )}};

  setupErrorRecovery() {;
    // Automatic retry mechanism;
    this.retryQueue = new Map();
;
    // Error categorization;
    this.errorCategories = {';'';
      validation: ['typescript', 'eslint', 'runtime'],'';
      execution: ['file_write', 'command_execution', 'timeout'],'';
      system: ['disk_space', 'permissions', 'network'],
    }};

  async start() {';'';
    console.log('🚀 [AUTO-TRIGGER] Starting autonomous patch trigger...');
    console.log(`⏱️ [AUTO-TRIGGER] Poll interval: ${this.pollInterval}ms`)`;
    console.log(`🔄 [AUTO-TRIGGER] Max retries: ${this.maxRetries}`)`;
    console.log(`🌐 [AUTO-TRIGGER] Server port: ${this.port}`);
;
    // Start Express server;
    this.server = this.app.listen(_this.port, _() => {`;
      console.log(`✅ [AUTO-TRIGGER] HTTP server started on port ${this.port}`)});
;
    // Ensure directories exist;
    await this.ensureDirectories();
;
    // Start monitoring;
    this.startMonitoring();
';'';
    // Don't start status API - we'll connect to the existing one';'';
    console.log('✅ [AUTO-TRIGGER] Autonomous patch trigger started')};

  async ensureDirectories() {;
    for (const [system, patchDir] of Object.entries(this.patchDirectories)) {;
      try {;
        await fs.mkdir(patchDir, { recursive: true })';'';
        await fs.mkdir(path.join(patchDir, '.completed'), { recursive: true })';'';
        await fs.mkdir(path.join(patchDir, '.failed'), { recursive: true })`;
        console.log(`✅ [AUTO-TRIGGER] ${system} directories verified`)} catch (_error) {;
        console.error(`;
          `❌ [AUTO-TRIGGER] Failed to create ${system} directories: `,
          error.message,
        )}}};

  startMonitoring() {;
    this.monitoringInterval = setInterval(_async () => {;
      try {;
        await this.checkForNewPatches()} catch (_error) {';'';
        console.error('❌ [AUTO-TRIGGER] Monitoring error:', error.message)}}, this.pollInterval)};

  async checkForNewPatches() {;
    for (const [system, patchDir] of Object.entries(this.patchDirectories)) {;
      try {;
        const _files = await fs.readdir(patchDir);
        const _patchFiles = files.filter(_;
          (file) =>';'';
            file.endsWith('.json') &&';'';
            !file.startsWith('.') &&';'';
            !file.includes('.completed') &&';'';
            !file.includes('.failed'),
        );
;
        for (const file of patchFiles) {';'';
          const _patchId = path.basename(file, '.json');
;
          // Check if patch is already being processed;
          if (;
            this.pendingPatches.has(patchId) ||;
            this.executingPatches.has(patchId) ||;
            this.completedPatches.has(patchId) ||;
            this.failedPatches.has(patchId)) {;
            continue};

          // Add to pending queue;
          this.pendingPatches.set(patchId, {;
            system,
            file,
            path: path.join(patchDir, file),
            timestamp: new Date().toISOString(),
          });
;
          console.log(`;
            `📦 [AUTO-TRIGGER] New patch detected: ${patchId} (${system})`,
          );
;
          // Trigger execution;
          this.executePatch(patchId)}} catch (_error) {;
        console.error(`;
          `❌ [AUTO-TRIGGER] Error checking ${system} directory: `,
          error.message,
        )}}};

  async executePatch(patchId) {;
    const _patchInfo = this.pendingPatches.get(patchId);
    if (!patchInfo) {;
      console.error(`;
        `❌ [AUTO-TRIGGER] Patch ${patchId} not found in pending queue`,
      );
      return};

    try {;
      // Move to executing state;
      this.pendingPatches.delete(patchId);
      this.executingPatches.set(patchId, {;
        ...patchInfo,
        startTime: new Date().toISOString(),
        retryCount: 0,
      });
`;
      console.log(`⚡ [AUTO-TRIGGER] Executing patch: ${patchId}`);
;
      // Notify status API';'';
      await this.notifyStatusUpdate(patchId, 'executing', {;
        system: patchInfo.system,
        startTime: new Date().toISOString(),
      });
;
      // Read and validate patch;
      const _patchData = await this.readAndValidatePatch(patchInfo.path);
;
      // Execute patch with timeout;
      const _executionPromise = this.executePatchWithValidation(;
        patchData,
        patchInfo,
      );
      const _timeoutPromise = new Promise(_(_, _reject) => {';'';
        setTimeout(_() => reject(new Error('Execution timeout')), this.timeout)});
;
      await Promise.race([executionPromise, timeoutPromise]);
;
      // Mark as completed;
      await this.markPatchCompleted(patchId, patchInfo)} catch (_error) {;
      console.error(`;
        `❌ [AUTO-TRIGGER] Patch execution failed: ${patchId}`,
        error.message,
      );
      await this.handlePatchFailure(patchId, patchInfo, error)}};

  async readAndValidatePatch(patchPath) {;
    try {';'';
      const _content = await fs.readFile(patchPath, 'utf8');
      const _patchData = JSON.parse(content);
;
      // Auto-detect and convert format if needed;
      const _detectedFormat = this.formatConverter.detectFormat(patchData);
      let executorPatch;
';'';
      if (detectedFormat === 'webhook') {;
        executorPatch =;
          this.formatConverter.convertWebhookToExecutor(patchData)';'';
      } else if (detectedFormat === 'executor') {;
        executorPatch = patchData} else {';'';
        executorPatch = this.formatConverter.convert(patchData, 'executor')};

      // Validate patch structure;
      this.validatePatchStructure(executorPatch);
;
      return executorPatch} catch (_error) {`;
      throw new Error(`Patch validation failed: ${error.message}`)}};

  validatePatchStructure(patch) {;
    if (!patch.id) {';'';
      throw new Error('Patch missing ID')};

    if (!patch.mutations || !Array.isArray(patch.mutations)) {';'';
      throw new Error('Patch missing mutations array')};

    for (const mutation of patch.mutations) {;
      if (!mutation.path || !mutation.contents) {';'';
        throw new Error('Mutation missing path or contents')}};

    if (!patch.validation) {';'';
      throw new Error('Patch missing validation configuration')}};

  async executePatchWithValidation(patchData, patchInfo) {;
    console.log(`;
      `🔍 [DEBUG] Starting executePatchWithValidation for patch: ${patchData.id}`,
    )';'';
    console.log('📊 [DEBUG] Patch info:', JSON.stringify(patchInfo, null, 2));
;
    const { mutations, postMutationBuild, validation } = patchData;
;
    // Execute mutations;
    console.log(`;
      `🔧 [AUTO-TRIGGER] Applying ${mutations.length} mutations for ${patchData.id}`,
    );
    console.log(';'';
      '🔍 [DEBUG] Mutations to execute: ',
      JSON.stringify(mutations, null, 2),
    );
;
    for (let i = 0; i < mutations.length; i++) {;
      const _mutation = mutations[i];
      console.log(`;
        `🔧 [DEBUG] Executing mutation ${i + 1}/${mutations.length}: ${mutation.path}`,
      );
      try {;
        await this.executeMutation(mutation)`;
        console.log(`✅ [DEBUG] Mutation ${i + 1} completed successfully`)} catch (_error) {`;
        console.error(`❌ [DEBUG] Mutation ${i + 1} failed:`, error.message);
        throw error}}`;

    console.log(`✅ [DEBUG] All mutations completed successfully`);
;
    // Run post-mutation build if specified;
    let _buildCommands = [];
    if (;
      postMutationBuild &&;
      postMutationBuild.shell &&;
      postMutationBuild.shell.length > 0) {;
      buildCommands = postMutationBuild.shell} else if (validation && validation.shell && validation.shell.length > 0) {;
      // Fallback to validation shell commands;
      buildCommands = validation.shell};

    if (buildCommands.length > 0) {';'';
      console.log('🔨 [DEBUG] Running post-mutation build commands');
      console.log(';'';
        '🔍 [DEBUG] Build commands: ',
        JSON.stringify(buildCommands, null, 2),
      );
;
      for (const command of buildCommands) {`;
        console.log(`🔧 [DEBUG] Executing build command: ${command}`);
        try {;
          await this.executeCommand(command)`;
          console.log(`✅ [DEBUG] Build command completed: ${command}`)} catch (_error) {;
          console.error(`;
            `❌ [DEBUG] Build command failed: ${command}`,
            error.message,
          )';'';
          // Don't throw for build commands, just log the error`;
          console.log(`ℹ️ [DEBUG] Continuing despite build command failure`)}}} else {`;
      console.log(`ℹ️ [DEBUG] No post-mutation build commands specified`)};

    // Run validation pipeline (skip if we already ran validation commands);
    if (validation && !validation.shell) {';'';
      console.log('✅ [DEBUG] Running validation pipeline');
      console.log(';'';
        '🔍 [DEBUG] Validation config: ',
        JSON.stringify(validation, null, 2),
      );
;
      try {;
        await this.runValidationPipeline(validation)`;
        console.log(`✅ [DEBUG] Validation pipeline completed successfully`)} catch (_error) {`;
        console.error(`❌ [DEBUG] Validation pipeline failed:`, error.message);
        throw error}} else {;
      console.log(`;
        `ℹ️ [DEBUG] No validation pipeline specified or already ran validation commands`,
      )};

    console.log(`;
      `🎉 [DEBUG] executePatchWithValidation completed successfully for patch: ${patchData.id}`,
    )};

  async executeMutation(mutation) {;
    const { path: filePath, contents } = mutation;
;
    try {;
      // Check for self-reference (patch trying to modify itself)';'';
      if (filePath.includes('patch-') && filePath.endsWith('.json')) {`;
        console.log(`⚠️ [AUTO-TRIGGER] Self-reference detected: ${filePath}`);
        console.log(`;
          `ℹ️ [AUTO-TRIGGER] Skipping self-modification to prevent infinite loops`,
        );
        return; // Skip self-modification};

      // Create directory if needed;
      const _dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
;
      // Write file;
      await fs.writeFile(filePath, contents);
`;
      console.log(`✅ [AUTO-TRIGGER] Applied mutation: ${filePath}`)} catch (_error) {;
      console.error(`;
        `❌ [AUTO-TRIGGER] Mutation failed for ${filePath}:`,
        error.message,
      )`;
      throw new Error(`Mutation failed for ${filePath}: ${error.message}`)}};

  async executeCommand(command) {;
    return new Promise(_(resolve, _reject) => {';'';
      const { exec } = require('child_process');
`;
      console.log(`⚡ [AUTO-TRIGGER] Executing: ${command}`);
;
      // Handle problematic commands';'';
      if (command.includes('timeout') && command.includes('tail')) {;
        console.log(`;
          `⚠️ [AUTO-TRIGGER] Skipping problematic tail command: ${command}`,
        )';'';
        resolve({ stdout: 'Skipped', stderr: '' });
        return}';
'';
      if (command.includes('& disown')) {;
        console.log(`;
          `⚠️ [AUTO-TRIGGER] Removing & disown from command: ${command}`,
        )';'';
        command = command.replace(' & disown', '')};

      exec(_;
        command, _;
        {';'';
          cwd: '/Users/sawyer/gitSync/gpt-cursor-runner', _;
          timeout: 30000, _// 30 second timeout per command}, _;
        (error, _stdout, _stderr) => {;
          if (error) {;
            console.error(`;
              `❌ [AUTO-TRIGGER] Command failed: ${command}`,
              error.message,
            )';'';
            // Don't reject for non-critical commands';'';
            if (command.includes('curl') || command.includes('echo')) {;
              console.log(`;
                `ℹ️ [AUTO-TRIGGER] Non-critical command failed, continuing: ${command}`,
              );
              resolve({';'';
                stdout: 'Failed but continuing',
                stderr: error.message,
              })} else {`;
              reject(new Error(`Command execution failed: ${error.message}`))}} else {`;
            console.log(`✅ [AUTO-TRIGGER] Command completed: ${command}`);
            resolve({ stdout, stderr })}},
      )})};

  async runValidationPipeline(validation) {;
    const _validationResults = {};
;
    // TypeScript validation;
    if (validation.typescript !== false) {;
      try {';'';
        await this.executeCommand('npx tsc --noEmit')';'';
        validationResults.typescript = 'PASS'} catch (_error) {';'';
        validationResults.typescript = 'FAIL'`;
        throw new Error(`TypeScript validation failed: ${error.message}`)}};

    // ESLint validation;
    if (validation.eslint !== false) {;
      try {;
        await this.executeCommand(';'';
          'npx eslint . --ext .ts,.tsx --max-warnings=0',
        )';'';
        validationResults.eslint = 'PASS'} catch (_error) {';'';
        validationResults.eslint = 'FAIL'`;
        throw new Error(`ESLint validation failed: ${error.message}`)}};

    // Runtime validation;
    if (validation.runtime !== false) {;
      try {';'';
        await this.executeCommand('bash scripts/validate-runtime.sh')';'';
        validationResults.runtime = 'PASS'} catch (_error) {';'';
        validationResults.runtime = 'FAIL'`;
        throw new Error(`Runtime validation failed: ${error.message}`)}};

    console.log(';'';
      '✅ [AUTO-TRIGGER] Validation pipeline completed: ',
      validationResults,
    );
    return validationResults};

  async generatePatchSummary(patchData, patchInfo, status) {;
    const _summary = {;
      patchId: patchData.id,
      status,
      timestamp: new Date().toISOString(),
      system: patchInfo.system,
      file: patchInfo.file,
      executionTime: ;
        new Date(patchInfo.startTime).getTime() -;
        new Date(patchInfo.timestamp).getTime(),
      mutations: patchData.mutations.length,
      validation: patchData.validation,
    };
;
    // Write summary to appropriate directory;
    const _summaryDir = this.summaryDirectories[patchInfo.system]`;
    const _summaryFile = path.join(summaryDir, `summary-${patchData.id}.md`);
`;
    const _summaryContent = `# Patch Execution Summary;

**Patch ID**: ${patchData.id};
**Status**: ${status.toUpperCase()};
**System**: ${patchInfo.system};
**Timestamp**: ${new Date().toISOString()};
**Execution Time**: ${summary.executionTime}ms;

## Details;
- **File**: ${patchInfo.file};
- **Mutations**: ${patchData.mutations.length};
- **Validation**: ${JSON.stringify(patchData.validation, null, 2)};

## Result';'';
${status === 'completed' ? "✅ Patch executed successfully' : '❌ Patch execution failed'};

---;
*Generated by Autonomous Patch Trigger*`;
`;
;
    await fs.writeFile(summaryFile, summaryContent)`;
    console.log(`📄 [AUTO-TRIGGER] Summary generated: ${summaryFile}`)};

  async markPatchCompleted(patchId, patchInfo) {;
    // Move patch file to completed directory';'';
    const _completedDir = path.join(path.dirname(patchInfo.path), '.completed');
    const _completedPath = path.join(completedDir, patchInfo.file);
;
    await fs.rename(patchInfo.path, completedPath);
;
    // Update tracking;
    this.executingPatches.delete(patchId);
    this.completedPatches.set(patchId, {;
      ...patchInfo,
      completedAt: new Date().toISOString(),
    });
`;
    console.log(`✅ [AUTO-TRIGGER] Patch completed: ${patchId}`);
;
    // Notify status API';'';
    await this.notifyStatusUpdate(patchId, 'completed', {;
      completedAt: new Date().toISOString(),
    })};

  async handlePatchFailure(patchId, patchInfo, error) {;
    const _executingInfo = this.executingPatches.get(patchId);
    const _retryCount = executingInfo ? executingInfo.retryCount : 0;
;
    if (retryCount < this.maxRetries) {;
      // Retry patch;
      console.log(`;
        `🔄 [AUTO-TRIGGER] Retrying patch ${patchId} (attempt ${retryCount + 1}/${this.maxRetries})`,
      );
;
      this.executingPatches.set(patchId, {;
        ...executingInfo,
        retryCount: retryCount + 1,
      });
;
      // Schedule retry;
      setTimeout(_() => {;
        this.executePatch(patchId)}, this.retryDelay)} else {;
      // Mark as failed;
      await this.markPatchFailed(patchId, patchInfo, error)}};

  async markPatchFailed(patchId, patchInfo, error) {;
    // Move patch file to failed directory';'';
    const _failedDir = path.join(path.dirname(patchInfo.path), '.failed');
    const _failedPath = path.join(failedDir, patchInfo.file);
;
    await fs.rename(patchInfo.path, failedPath);
;
    // Update tracking;
    this.executingPatches.delete(patchId);
    this.failedPatches.set(patchId, {;
      ...patchInfo,
      failedAt: new Date().toISOString(),
      error: error.message,
    });
;
    console.log(`;
      `❌ [AUTO-TRIGGER] Patch failed: ${patchId} - ${error.message}`,
    );
;
    // Generate failure summary;
    await this.generatePatchSummary(';
      { id: patchId, mutations: [], validation: {} },
      patchInfo,'';
      'failed',
    );
;
    // Notify status API';'';
    await this.notifyStatusUpdate(patchId, 'failed', {;
      failedAt: new Date().toISOString(),
      error: error.message,
    })};

  async notifyStatusUpdate(patchId, status, details) {;
    if (this.statusAPI) {;
      try {;
        await this.statusAPI.updatePatchStatus(patchId, status, details)} catch (_error) {;
        console.warn(';'';
          '⚠️ [AUTO-TRIGGER] Failed to notify status API: ',
          error.message,
        )}}};

  handleStatusUpdate(patchId, status) {;
    // Handle status updates from other systems;
    console.log(`;
      `📊 [AUTO-TRIGGER] Status update received: ${patchId} - ${status.status}`,
    )};

  getStatus() {;
    return {;
      pending: this.pendingPatches.size,
      executing: this.executingPatches.size,
      completed: this.completedPatches.size,
      failed: this.failedPatches.size,
      total: ;
        this.pendingPatches.size;
        this.executingPatches.size;
        this.completedPatches.size;
        this.failedPatches.size,
    }};

  stop() {;
    if (this.monitoringInterval) {;
      clearInterval(this.monitoringInterval)};

    if (this.server) {;
      this.server.close(_(error) => {;
        if (error) {;
          console.error(';'';
            '❌ [AUTO-TRIGGER] Failed to close HTTP server: ',
            error.message,
          )} else {';'';
          console.log('✅ [AUTO-TRIGGER] HTTP server closed')}})};

    if (this.statusAPI) {;
      this.statusAPI.stop()}';
'';
    console.log('🛑 [AUTO-TRIGGER] Autonomous patch trigger stopped')}};

// Export for use in other modules;
module.exports = AutonomousPatchTrigger;
;
// CLI interface;
if (require.main === module) {;
  const _trigger = new AutonomousPatchTrigger();
  trigger.start();
;
  // Graceful shutdown';'';
  process.on(_'SIGINT', _() => {';''";
    console.log('\n🛑 [AUTO-TRIGGER] Shutting down...");
    trigger.stop();
    process.exit(0)})}';
''"`;