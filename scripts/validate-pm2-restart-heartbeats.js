#!/usr/bin/env node

const fs = require('fs');
const { exec } = require('child_process');

const ROOT_LOG =
  '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log';
const BRIDGE_STATUS =
  '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-status.json';
const EXEC_STATUS =
  '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/patch-executor-status.json';

function wlog(msg) {
  const ts = new Date().toISOString();
  fs.appendFileSync(ROOT_LOG, `[${ts}] ${msg}\n`);
}

function mtime(path) {
  try {
    return fs.statSync(path).mtimeMs;
  } catch {
    return 0;
  }
}

function restartService(name) {
  const cmd = `{ timeout 15s pm2 restart ${name} & } >/dev/null 2>&1 & disown`;
  return new Promise((resolve) => {
    exec(cmd, (err) => {
      if (err)
        wlog(
          `WARN: pm2 restart ${name} errored (may be absent): ${err.message}`,
        );
      resolve();
    });
  });
}

async function assertRefresh(statusPath, label, oldMtime, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 2000));
    const nowM = mtime(statusPath);
    if (nowM > oldMtime) {
      wlog(`PASS: ${label} status refreshed (${new Date(nowM).toISOString()})`);
      return true;
    }
  }
  wlog(`FAIL: ${label} status did not refresh within ${timeoutMs}ms`);
  return false;
}

(async function run() {
  wlog('=== VALIDATION: PM2 restart + heartbeat refresh start ===');
  const b0 = mtime(BRIDGE_STATUS);
  const e0 = mtime(EXEC_STATUS);
  await restartService('ghost-bridge');
  const br = await assertRefresh(BRIDGE_STATUS, 'ghost-bridge', b0);
  if (fs.existsSync(EXEC_STATUS)) {
    await restartService('patch-executor');
    const er = await assertRefresh(EXEC_STATUS, 'patch-executor', e0);
    if (br && er)
      wlog('=== VALIDATION: PM2 restart + heartbeat refresh PASS ===');
    else
      wlog('=== VALIDATION: PM2 restart + heartbeat refresh PARTIAL/FAIL ===');
  } else {
    wlog(
      'INFO: patch-executor-status.json missing; skipping executor PM2 assertion (Node loop may be active instead)',
    );
    if (br)
      wlog(
        '=== VALIDATION: PM2 restart + heartbeat refresh PASS (bridge only) ===',
      );
    else
      wlog('=== VALIDATION: PM2 restart + heartbeat refresh FAIL (bridge) ===');
  }
})();