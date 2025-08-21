#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const LOG_FILE =
  '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log';
const CYOPS_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';

function writeLog(line) {
  try {
    const ts = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${ts}] ${line}\n`);
  } catch (e) {
    // Best effort
    console.error('Validation log write failed:', e.message);
  }
}

function safe(name) {
  return name.replace(/[^\w./-]/g, '_');
}

function main() {
  writeLog('=== VALIDATION: Ghost Bridge/Monitor start ===');
  let failures = 0;

  // Load ghost bridge functions
  const bridge = require('./ghost-bridge-simple.js');

  // Test 1: JSON patch detection/processing
  try {
    const jsonBlock = JSON.stringify(
      {
        role: 'command_patch',
        target: 'CYOPS',
        blockId: 'validation-json-001',
        summary: 'test json patch',
      },
      null,
      2,
    );

    const res = bridge.processPatchBlock(jsonBlock, 'validation-json');
    if (!res.processed)
      throw new Error(`processPatchBlock returned false: ${res.reason}`);

    const filePath = path.join(CYOPS_PATCH_DIR, safe(`${res.filename}`));
    if (!fs.existsSync(filePath)) throw new Error('Patch file not written');

    // cleanup
    fs.unlinkSync(filePath);
    writeLog('PASS: JSON patch extraction and write');
  } catch (e) {
    failures++;
    writeLog(`FAIL: JSON patch extraction - ${e.message}`);
  }

  // Test 2: YAML patch detection/processing
  try {
    const yamlBlock = [
      'role: command_patch',
      'target: CYOPS',
      'blockId: validation-yaml-001',
      'summary: test yaml patch',
    ].join('\n');

    const res = bridge.processPatchBlock(yamlBlock, 'validation-yaml');
    if (!res.processed)
      throw new Error(`processPatchBlock returned false: ${res.reason}`);

    const filePath = path.join(CYOPS_PATCH_DIR, safe(`${res.filename}`));
    if (!fs.existsSync(filePath)) throw new Error('Patch file not written');

    // cleanup
    fs.unlinkSync(filePath);
    writeLog('PASS: YAML patch extraction and write');
  } catch (e) {
    failures++;
    writeLog(`FAIL: YAML patch extraction - ${e.message}`);
  }

  // Test 3: Heartbeat writes
  try {
    const statusFile =
      '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-status.json';
    bridge.emitHeartbeat();
    bridge.emitHeartbeat();
    if (!fs.existsSync(statusFile))
      throw new Error('ghost-bridge-status.json not found');
    writeLog('PASS: Heartbeat file write');
  } catch (e) {
    failures++;
    writeLog(`FAIL: Heartbeat write - ${e.message}`);
  }

  // Test 4: Stale patch detection
  try {
    if (!fs.existsSync(CYOPS_PATCH_DIR))
      fs.mkdirSync(CYOPS_PATCH_DIR, { recursive: true });
    const staleFile = path.join(CYOPS_PATCH_DIR, 'validation-stale.json');
    fs.writeFileSync(staleFile, JSON.stringify({ test: true }, null, 2));
    const staleMTime = new Date(Date.now() - 16 * 60 * 1000); // 16 min ago
    fs.utimesSync(staleFile, staleMTime, staleMTime);
    bridge.checkStalePatches();
    fs.unlinkSync(staleFile);
    writeLog('PASS: Stale patch detection invoked');
  } catch (e) {
    failures++;
    writeLog(`FAIL: Stale patch detection - ${e.message}`);
  }

  writeLog(`=== VALIDATION: Ghost Bridge/Monitor end (${failures} failures) ===`);
  return failures === 0;
}

if (require.main === module) {
  main().then((success) => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { main };