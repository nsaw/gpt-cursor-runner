#!/usr/bin/env node
const fs = require('fs');
const p = require('path');
const cp = require('child_process');

const QROOT = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const P1 = p.join(QROOT, 'G2o/P1');
const FAILED = p.join(QROOT, '.failed');
const COMPLETED = p.join(QROOT, '.completed');
const LOGS = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs';
const TRI = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage';
const MAX_SAFE = parseInt(process.env.MAX_SAFE_AUTOFIX_ATTEMPTS || '1', 10);
const MAX_MANUAL = parseInt(process.env.MAX_MANUAL_REPAIR_ATTEMPTS || '2', 10);

fs.mkdirSync(LOGS, { recursive: true });
fs.mkdirSync(TRI, { recursive: true });

const log = s => {
  fs.appendFileSync(p.join(LOGS, 'patch-events.log'), `[SEQ-MANUAL] ${s}\n`);
  console.log(s);
};

const list = d => {
  try {
    return fs.readdirSync(d);
  } catch {
    return [];
  }
};

function orderList() {
  const orderFile = p.join(P1, 'execution_order_P1.md');
  let order = list(P1).filter(f => /^patch-v.+\.json(\.hold)?$/.test(f)).map(x => x.replace(/\.hold$/, ''));
  try {
    const lines = fs.readFileSync(orderFile, 'utf8').split(/\r?\n/).filter(Boolean);
    const inDir = new Set(order);
    order = lines.filter(l => l.startsWith('patch-v') && inDir.has(l));
  } catch { /* ignore file read errors */ }
  return order;
}

function restoreFromFailed(base) {
  const src = p.join(FAILED, base);
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(P1, { recursive: true });
  fs.writeFileSync(p.join(P1, `${base}.hold`), fs.readFileSync(src));
  fs.unlinkSync(src);
  return true;
}

function candidate() {
  const order = orderList();
  for (const base of order) {
    if (fs.existsSync(p.join(COMPLETED, base))) continue;
    if (fs.existsSync(p.join(FAILED, base))) {
      restoreFromFailed(base);
      return base;
    }
    if (fs.existsSync(p.join(P1, base)) || fs.existsSync(p.join(P1, `${base}.hold`))) return base;
  }
  return null;
}

function execCompat(abs) {
  return cp.spawnSync('node', [p.join(__dirname, 'exec_patch_with_compat_once.js'), abs], { stdio: 'inherit' }).status === 0;
}

(function main() {
  while (true) {
    const base = candidate();
    if (!base) {
      log('NO_CANDIDATE');
      process.exit(0); // eslint-disable-line no-process-exit
    }
    const abs = fs.existsSync(p.join(P1, `${base}.hold`)) ? p.join(P1, `${base}.hold`)
      : fs.existsSync(p.join(P1, base)) ? p.join(P1, base) : null;
    if (!abs) {
      log(`ERR_NO_SOURCE:${base}`);
      process.exit(2); // eslint-disable-line no-process-exit
    }

    // 1) SAFE transforms (one pass)
    for (let i = 1; i <= MAX_SAFE; i++) {
      cp.spawnSync('node', [p.join(__dirname, 'autofix_forbidden_shell_once.js'), abs], { stdio: 'inherit' });
      if (execCompat(abs)) {
        fs.mkdirSync(COMPLETED, { recursive: true });
        try {
          fs.renameSync(abs, p.join(COMPLETED, base));
        } catch { /* ignore rename errors */ }
        log(`PASS_SAFE:${base}`);
        continue; // to next patch
      }
      // rehydrate from failed for next step
      const f = p.join(FAILED, base);
      if (fs.existsSync(f)) {
        fs.mkdirSync(P1, { recursive: true });
        fs.writeFileSync(p.join(P1, `${base}.hold`), fs.readFileSync(f));
        fs.unlinkSync(f);
      }
    }

    // 2) MANUAL repair by AGENT (patch-aware playbook) with tests
    let passed = false;
    for (let a = 1; a <= MAX_MANUAL; a++) {
      const r = cp.spawnSync('node', [p.join(__dirname, 'manual_repair_playbook_once.js'), abs], { stdio: 'inherit' });
      if (r.status !== 0) {
        log(`MANUAL_REPAIR_FAIL_PRE:${base}:attempt=${a}`);
        continue;
      }
      if (execCompat(abs)) {
        fs.mkdirSync(COMPLETED, { recursive: true });
        try {
          fs.renameSync(abs, p.join(COMPLETED, base));
        } catch { /* ignore rename errors */ }
        log(`PASS_MANUAL:${base}:attempt=${a}`);
        passed = true;
        break;
      }
      // rehydrate for next manual attempt
      const f = p.join(FAILED, base);
      if (fs.existsSync(f)) {
        fs.mkdirSync(P1, { recursive: true });
        fs.writeFileSync(p.join(P1, `${base}.hold`), fs.readFileSync(f));
        fs.unlinkSync(f);
      }
      log(`RETRY_MANUAL:${base}:attempt=${a}`);
    }
    if (!passed) {
      const blocked = p.join(P1, 'P1.BLOCKED.json');
      const obj = { ts: Date.now(), reason: 'agent_manual_repair_exhausted', patch: base, attempts: { safe: MAX_SAFE, manual: MAX_MANUAL } };
      try {
        fs.writeFileSync(blocked, JSON.stringify(obj, null, 2));
      } catch { /* ignore write errors */ }
      log(`HALT:${base}:agent_manual_repair_exhausted`);
      process.exit(3); // eslint-disable-line no-process-exit
    }
    // loop to next candidate
  }
})();
