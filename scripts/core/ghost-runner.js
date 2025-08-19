#!/usr/bin/env node;

/**;
 * Ghost Runner Service;
 * Handles patch execution and monitoring for both MAIN and CYOPS environments;
 *;
 * Usage:;
 *   node scripts/ghost-runner.js;
 *   node scripts/ghost-runner.js --env=MAIN;
 *   node scripts/ghost-runner.js --env=CYOPS;
 */;

const fs = require('fs')';'';
const path = require('path')';'';
const _express = require('express')';'';
const { exec } = require('child_process');
;
// Configuration;
const _PORT = process.env.***REMOVED***_RUNNER_PORT || 5053;
const _ENV =';'';
  process.argv.find(_(arg) => arg.startsWith('--env='))?.split('=')[1] ||';'';
  'CYOPS'';'';
const _CACHE_ROOT = '/Users/sawyer/gitSync/.cursor-cache'';'';
const _PATCHES_DIR = path.join(CACHE_ROOT, ENV, 'patches')';'';
const _SUMMARIES_DIR = path.join(CACHE_ROOT, ENV, 'summaries')';'';
const _HEARTBEAT_DIR = path.join(CACHE_ROOT, ENV, '.heartbeat')';'';
const _LOGS_DIR = path.join(PATCHES_DIR, '.logs');
;
// Ensure directories exist;
[PATCHES_DIR, SUMMARIES_DIR, HEARTBEAT_DIR, LOGS_DIR].forEach(_(dir) => {;
  if (!fs.existsSync(dir)) {;
    fs.mkdirSync(dir, { recursive: true })}});
;
const _app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
;
// Logging;
const _log = (_message) => {;
  const _timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [***REMOVED***-RUNNER:${ENV}] ${message}`)};
;
// Health check endpoint';'';
app.get(_'/health', _(req, res) => {;
  res.json({';'';
    status: 'healthy','';
    service: 'ghost-runner',
    environment: ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,'';
    endpoints: ['/health', '/status', '/patches', '/execute', '/monitor'],
  })});
;
// Status endpoint';'';
app.get(_'/status', _(req, res) => {;
  const _status = {';'';
    service: 'ghost-runner',
    environment: ENV,'';
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),
    patches: {;
      pending: 0,
      completed: 0,
      failed: 0,
    },
    directories: {;
      patches: PATCHES_DIR,
      summaries: SUMMARIES_DIR,
      heartbeat: HEARTBEAT_DIR,
    },
  };
;
  // Count patches;
  try {;
    if (fs.existsSync(PATCHES_DIR)) {;
      const _files = fs.readdirSync(PATCHES_DIR)';'';
      status.patches.pending = files.filter(_(f) => f.endsWith('.json')).length}';
'';
    const _completedDir = path.join(PATCHES_DIR, '.completed')';'';
    const _failedDir = path.join(PATCHES_DIR, '.failed');
;
    if (fs.existsSync(completedDir)) {;
      status.patches.completed = fs;
        .readdirSync(completedDir)';'';
        .filter(_(f) => f.endsWith('.json')).length};

    if (fs.existsSync(failedDir)) {;
      status.patches.failed = fs;
        .readdirSync(failedDir)';'';
        .filter(_(f) => f.endsWith('.json')).length}} catch (_error) {`;
    log(`Error counting patches: ${error.message}`)};

  res.json(status)});
;
// List patches endpoint';'';
app.get(_'/patches', _(req, res) => {;
  try {;
    const _files = fs.readdirSync(PATCHES_DIR);
    const _patches = files';'';
      .filter(_(f) => f.endsWith('.json'));
      .map(_(f) => ({;
        name: f,
        path: path.join(PATCHES_DIR, f),
        size: fs.statSync(path.join(PATCHES_DIR, f)).size,
        modified: fs.statSync(path.join(PATCHES_DIR, f)).mtime,
      }));
;
    res.json({;
      environment: ENV,
      patches,
      count: patches.length,
    })} catch (_error) {;
    res.status(500).json({';'';
      error: 'Failed to list patches',
      message: error.message,
    })}});
;
// Receive and execute patch endpoint';'';
app.post(_'/patch', _(req, res) => {;
  const _patch = req.body;
;
  if (!patch || !patch.id) {;
    return res.status(400).json({';'';
      error: 'Invalid patch data: missing id',
    })}`;

  log(`Received patch: ${patch.id}`);
;
  // Save patch to file`;
  const _patchPath = path.join(PATCHES_DIR, `${patch.id}.json`);
  try {;
    fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2))`;
    log(`Patch saved to: ${patchPath}`)} catch (_error) {`;
    log(`Failed to save patch: ${error.message}`);
    return res.status(500).json({';'';
      error: 'Failed to save patch',
      message: error.message,
    })};

  // Execute the patch immediately;
  executePatch(patch.id, patchPath, res)});
;
// Execute patch endpoint (for existing patches)';'';
app.post(_'/execute', _(req, res) => {;
  const { patchId } = req.body;
;
  if (!patchId) {;
    return res.status(400).json({';'';
      error: 'patchId is required',
    })}`;

  const _patchPath = path.join(PATCHES_DIR, `${patchId}.json`);
;
  if (!fs.existsSync(patchPath)) {;
    return res.status(404).json({';'';
      error: 'Patch not found',
      patchId,
    })}`;

  log(`Executing patch: ${patchId}`);
  executePatch(patchId, patchPath, res)});
;
// Patch execution function with enhanced logging;
function executePatch(_patchId, _patchPath, res) {`;
  log(`Starting execution of patch: ${patchId}`);
;
  // Log the patch execution attempt`;
  const _logEntry = `[${new Date().toISOString()}] Executing patch: ${patchId}\n`';'';
  const _logFile = path.join(LOGS_DIR, 'patch-execution.log');
  try {;
    fs.appendFileSync(logFile, logEntry)} catch (_error) {`;
    log(`Failed to write to log file: ${error.message}`)};

  // Execute patch using the patch executor';'';
  const _executorScript = path.join(__dirname, 'patch-executor.js')';''`;
  const _command = `node '${executorScript}' '${patchPath}'`;
;
  exec(_command, _{ cwd: __dirname }, _(error, _stdout, _stderr) => {;
    if (error) {`;
      log(`Patch execution failed: ${error.message}`);
      res.status(500).json({';'';
        error: 'Patch execution failed',
        message: error.message,
        stderr,
      })} else {`;
      log(`Patch executed successfully: ${patchId}`);
      res.json({;
        success: true,
        patchId,
        output: stdout,
      })}})};

// Monitor endpoint';'';
app.get(_'/monitor', _(req, res) => {;
  const _monitor = {';'';
    service: 'ghost-runner',
    environment: ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    directories: {;
      patches: {;
        path: PATCHES_DIR,
        exists: fs.existsSync(PATCHES_DIR),
        readable: fs.accessSync;
          ? (_() => {;
              try {;
                fs.accessSync(PATCHES_DIR, fs.constants.R_OK);
                return true} catch {;
                return false}})();
          : true,
      },
      summaries: {;
        path: SUMMARIES_DIR,
        exists: fs.existsSync(SUMMARIES_DIR),
        readable: fs.accessSync;
          ? (_() => {;
              try {;
                fs.accessSync(SUMMARIES_DIR, fs.constants.R_OK);
                return true} catch {;
                return false}})();
          : true,
      },
      heartbeat: {;
        path: HEARTBEAT_DIR,
        exists: fs.existsSync(HEARTBEAT_DIR),
        readable: fs.accessSync;
          ? (_() => {;
              try {;
                fs.accessSync(HEARTBEAT_DIR, fs.constants.R_OK);
                return true} catch {;
                return false}})();
          : true,
      },
    },
  };
;
  res.json(monitor)});
;
// Heartbeat endpoint';'';
app.get(_'/heartbeat', _(req, res) => {;
  const _heartbeat = {';'';
    service: 'ghost-runner',
    environment: ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),'';
    status: 'alive',
  };
;
  // Write heartbeat to file';'';
  const _heartbeatFile = path.join(HEARTBEAT_DIR, 'ghost-runner-heartbeat.json');
  try {;
    fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeat, null, 2))} catch (_error) {`;
    log(`Failed to write heartbeat: ${error.message}`)};

  res.json(heartbeat)});
;
/* NEW /patch HANDLER */';'';
app.post(_'/patch', _async (req, res) => {;
  try {;
    const _data = JSON.stringify(req.body, null, 2)`;
    const _id = req.body.id || `patch_${Date.now()}``;
    const _file = `/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/${id}.json`';'';
    await require('fs').promises.writeFile(file, data)`;
    console.log(`[***REMOVED***] Saved ${id} to CYOPS patches dir`);
    res.status(200).json({ ok: true, saved: true, id })} catch (_e) {';'';
    console.error('[***REMOVED***] Save failed:', e);
    res.status(500).json({ ok: false, error: String(e) })}});
;
// Start server;
app.listen(_PORT, _() => {`;
  log(`Ghost Runner started on port ${PORT} for environment ${ENV}`)`;
  log(`Patches directory: ${PATCHES_DIR}`)`;
  log(`Summaries directory: ${SUMMARIES_DIR}`)`;
  log(`Heartbeat directory: ${HEARTBEAT_DIR}`)`;
  log(`Logs directory: ${LOGS_DIR}`)});
;
// Graceful shutdown';'';
process.on(_'SIGINT', _() => {';'';
  log('Shutting down Ghost Runner...');
  process.exit(0)});
';'';
process.on(_'SIGTERM', _() => {';'';
  log('Shutting down Ghost Runner...');
  process.exit(0)});
;
// Error handling';'';
process.on(_'uncaughtException', _(error) => {`;
  log(`Uncaught Exception: ${error.message}`)`;
  log(`Stack: ${error.stack}`);
  process.exit(1)});
';'';
process.on(_'unhandledRejection', _(reason, _promise) => {`;
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1)})';
''`;