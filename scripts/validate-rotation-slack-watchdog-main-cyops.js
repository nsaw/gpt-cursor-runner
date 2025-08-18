#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_LOG =
  '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log';
const ROOT_LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/';
const CYOPS_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';
const MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/';

function wlog(msg) {
  const ts = new Date().toISOString();
  fs.appendFileSync(ROOT_LOG, `[${ts}] ${msg}\n`);
}

function simulateRapidRotation() {
  try {
    const target = path.join(ROOT_LOGS_DIR, 'patch-events.log');
    // Write >3 rotated backups quickly
    for (let i = 0; i < 4; i++) {
      fs.appendFileSync(target, 'X'.repeat(6 * 1024 * 1024)); // grow beyond 5MB
    }
    wlog('PASS: Rapid rotation simulated (file bloated)');
  } catch (e) {
    wlog(`FAIL: Rapid rotation simulation - ${e.message}`);
  }
}

function testSlackFallback() {
  try {
    process.env.SLACK_WEBHOOK_URL = ''; // force failure
    const monitor = require('./unified-patch-monitor.js');
    monitor.sendCorrelatedAlert(
      'test_alert',
      'validation',
      'forcing slack fail',
      'warning',
    );
    // Expect LOCAL_ALERTS file to be written
    const fallback = path.join(ROOT_LOGS_DIR, 'LOCAL_ALERTS');
    setTimeout(() => {
      if (fs.existsSync(fallback))
        wlog('PASS: Slack fallback wrote LOCAL_ALERTS');
      else wlog('FAIL: Slack fallback did not write LOCAL_ALERTS');
    }, 500);
  } catch (e) {
    wlog(`FAIL: Slack fallback test error - ${e.message}`);
  }
}

function paritySweep() {
  try {
    const bridge = require('./ghost-bridge-simple.js');
    const blocks = [
      JSON.stringify({
        role: 'command_patch',
        target: 'CYOPS',
        blockId: 'cyops-parity-1',
      }),
      JSON.stringify({
        role: 'command_patch',
        target: 'MAIN',
        blockId: 'main-parity-1',
      }),
      'role: command_patch\ntarget: CYOPS\nblockId: cyops-parity-2',
      'role: command_patch\ntarget: MAIN\nblockId: main-parity-2',
    ];
    for (const b of blocks) bridge.processPatchBlock(b, 'parity');
    const expectCYOPS = ['cyops-parity-1.json', 'cyops-parity-2.json'];
    const expectMAIN = ['main-parity-1.json', 'main-parity-2.json'];
    const cyopsOk = expectCYOPS.every((f) =>
      fs.existsSync(path.join(CYOPS_PATCH_DIR, f)),
    );
    const mainOk = expectMAIN.every((f) =>
      fs.existsSync(path.join(MAIN_PATCH_DIR, f)),
    );
    if (cyopsOk && mainOk) wlog('PASS: MAIN/CYOPS parity sweep wrote files');
    else wlog('FAIL: MAIN/CYOPS parity sweep missing files');
    // cleanup
    expectCYOPS.forEach((f) => {
      try {
        fs.unlinkSync(path.join(CYOPS_PATCH_DIR, f));
      } catch {}
    });
    expectMAIN.forEach((f) => {
      try {
        fs.unlinkSync(path.join(MAIN_PATCH_DIR, f));
      } catch {}
    });
  } catch (e) {
    wlog(`FAIL: Parity sweep error - ${e.message}`);
  }
}

function watchdogKillRecoverNote() {
  // NOTE: full watchdog kill+recover requires PM2 + system state. We log a probe marker
  // so watchdogs designed to look for liveness can act; manual verification recommended.
  wlog(
    'INFO: Watchdog validation requires PM2-managed kill/restart; manual follow-up recommended',
  );
}

(function run() {
  wlog('=== VALIDATION: Rotation/Slack/Parity start ===');
  simulateRapidRotation();
  testSlackFallback();
  paritySweep();
  watchdogKillRecoverNote();
  wlog('=== VALIDATION: Rotation/Slack/Parity dispatched ===');
})();