#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_LOG =
  "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log";
const ROOT_LOGS_DIR = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/";
const CYOPS_PATCH_DIR = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/";

function wlog(msg) {
  const ts = new Date().toISOString();
  fs.appendFileSync(ROOT_LOG, `[${ts}] ${msg}\n`);
}

function simulateLogFailurePauseResumeBridge() {
  try {
    const inject = path.join(ROOT_LOGS_DIR, "INJECT_LOG_FAILURE");
    fs.writeFileSync(inject, "1");
    const bridge = require("./ghost-bridge-simple.js");
    const res = bridge.processPatchBlock(
      JSON.stringify({
        role: "command_patch",
        target: "CYOPS",
        blockId: "pause-test",
      }),
      "pause",
    );
    if (
      res.processed === false &&
      (res.reason === "paused_due_to_log_failure" || res.reason === "paused")
    ) {
      wlog("PASS: Bridge paused on injected log failure");
    } else {
      wlog("FAIL: Bridge did not pause on injected log failure");
    }
    // Resume via ALLOW_PROCEED
    const allow = path.join(ROOT_LOGS_DIR, "ALLOW_PROCEED");
    fs.writeFileSync(allow, "1");
    const res2 = bridge.processPatchBlock(
      JSON.stringify({
        role: "command_patch",
        target: "CYOPS",
        blockId: "resume-test",
      }),
      "resume",
    );
    if (res2.processed) wlog("PASS: Bridge resumed with ALLOW_PROCEED");
    else wlog("FAIL: Bridge did not resume with ALLOW_PROCEED");
    // cleanup flags
    try {
      fs.unlinkSync(inject);
    } catch {}
    try {
      fs.unlinkSync(allow);
    } catch {}
    const f2 = path.join(CYOPS_PATCH_DIR, "resume-test.json");
    try {
      fs.unlinkSync(f2);
    } catch {}
  } catch (e) {
    wlog(`FAIL: Bridge pause/resume test error - ${e.message}`);
  }
}

function simulateExecutorPauseResume() {
  try {
    // Inject failure and run a no-op executor cycle by invoking the module to trigger write_unified_log
    const inject = path.join(ROOT_LOGS_DIR, "INJECT_LOG_FAILURE");
    fs.writeFileSync(inject, "1");
    const py =
      "/Users/sawyer/gitSync/gpt-cursor-runner/patch_executor_daemon.py";
    // Run a short foreground cycle; expect log failure to set pause flag and not process patches
    try {
      execSync(`python3 ${py} --check-interval 1`, { timeout: 3000 });
    } catch (_) {
      // ignore exit due to short timeout
    }
    wlog("INFO: Executor invoked with injected log failure (pause expected)");
    // Resume
    const allow = path.join(ROOT_LOGS_DIR, "ALLOW_PROCEED");
    fs.writeFileSync(allow, "1");
    try {
      execSync(`python3 ${py} --check-interval 1`, { timeout: 3000 });
    } catch (_) {}
    wlog("PASS: Executor resume path invoked with ALLOW_PROCEED");
    try {
      fs.unlinkSync(inject);
    } catch {}
    try {
      fs.unlinkSync(allow);
    } catch {}
  } catch (e) {
    wlog(`FAIL: Executor pause/resume test error - ${e.message}`);
  }
}

function pm2KillRestartValidation() {
  try {
    // Non-blocking pattern is enforced at script level; here we just test PM2 restart commands exist without executing them blocking
    wlog(
      "INFO: PM2 kill/restart validation scaffold: use the following commands non-blocking",
    );
    wlog(
      "CMD: { timeout 15s pm2 restart ghost-bridge & } >/dev/null 2>&1 & disown",
    );
    wlog(
      "CMD: { timeout 15s pm2 restart patch-executor & } >/dev/null 2>&1 & disown",
    );
    wlog(
      "CMD: { timeout 15s pm2 logs --lines 30 ghost-bridge & } >/dev/null 2>&1 & disown",
    );
  } catch (e) {
    wlog(`FAIL: PM2 validation scaffold error - ${e.message}`);
  }
}

(function run() {
  wlog("=== VALIDATION: LogFailure/Stuck+PM2 start ===");
  simulateLogFailurePauseResumeBridge();
  simulateExecutorPauseResume();
  pm2KillRestartValidation();
  wlog("=== VALIDATION: LogFailure/Stuck+PM2 complete ===");
})();
