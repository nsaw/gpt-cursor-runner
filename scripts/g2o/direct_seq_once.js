/* eslint-disable @typescript-eslint/no-unused-vars */
#!/usr/bin/env node
const fs = require('fs'), p = require('path'), {spawnSync} = require('child_process');
const ROOT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const P1   = p.join(ROOT,"G2o","P1");
const DONE = p.join(ROOT,".completed");
const FAIL = p.join(ROOT,".failed");
const LOG  = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/patch-events.log";

const order = [
  "patch-v2.0.016(P1.02.03)_pm2-nonblocking-wrappers-enforce.json",
  "patch-v2.0.019(P1.02.04)_promote-pm2-wrappers-enforce-to-root.json",
  "patch-v2.0.017(P1.03.03)_heartbeat-rapid-rotation-alerts.json",
  "patch-v2.0.021(P1.03.04)_promote-heartbeat-rotation-to-root.json"
];

const exists = f => { try { return fs.existsSync(f); } catch { return false; } };
const log = m => { try { fs.mkdirSync(p.dirname(LOG),{recursive:true}); fs.appendFileSync(LOG, "[G2o-Direct] "+m+"\n"); } catch {} };
const runNode = (file, args=[]) => spawnSync("node", [file, ...args], { stdio: "inherit" });

function ensureCandidate(name) {
  const inP1 = p.join(P1, name);
  const inFail = p.join(FAIL, name);
  const inDone = p.join(DONE, name);
  if (exists(inDone)) { log("SKIP_DONE:"+name); return {status:"skip"}; }
  if (exists(inP1))  { log("PRESENT_P1:"+name); return {status:"ok", path: inP1}; }
  if (exists(inFail)) {
    const r = runNode("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/restore_from_failed_once.js", [name]);
    if (r.status !== 0) return {status:"err", why:"restore_failed"};
    return {status:"ok", path: p.join(P1, name)};
  }
  return {status:"miss"};
}

// Hygiene before we begin
runNode("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/ack_ready_once.js");
runNode("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/p1/phase_hold_and_failed_cleanup_once.mjs", ["all"]);
runNode("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/validate_plain_empty_once.js");

for (const name of order) {
  const st = ensureCandidate(name);
  if (st.status === "skip") continue;
  if (st.status === "miss") { log("MISSING:"+name); continue; }
  if (st.status === "err")  { log("RESTORE_ERROR:"+name); process.exit(2); }

  // Execute strictly one; stop on first failure
  log("EXEC_BEGIN:"+name);
  const r = runNode("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/exec_patch_with_compat_once.js", [st.path]);
  // Post-step single-flight assert
  runNode("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/validate_plain_empty_once.js");

  const donePath = p.join(DONE, name);
  const failPath = p.join(FAIL, name);
  if (exists(donePath)) { log("EXEC_OK:"+name); continue; }
  if (exists(failPath)) { log("EXEC_FAIL:"+name); process.exit(1); }

  // Fallback: unknown state
  log("EXEC_UNKNOWN:"+name);
  process.exit(3);
}
log("SEQUENCE_CYCLE_COMPLETE");
