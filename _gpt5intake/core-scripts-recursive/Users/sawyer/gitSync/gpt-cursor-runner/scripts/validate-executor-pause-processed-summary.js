#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT_LOG =
  "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/validation-tests.log";
const ROOT_LOGS_DIR = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/";
const PATCHES_DIR = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/";
const SUMMARIES_DIR = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/";

function wlog(msg) {
  const ts = new Date().toISOString();
  fs.appendFileSync(ROOT_LOG, `[${ts}] ${msg}\n`);
}

function writeDummyPatch(id) {
  const file = path.join(PATCHES_DIR, `${id}.json`);
  const payload = {
    target_file: `/Users/sawyer/gitSync/gpt-cursor-runner/tmp/${id}.txt`,
    patch: { content: `dummy ${id}` },
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

(function run() {
  wlog(
    "=== VALIDATION: Executor pause keeps patch unprocessed; ALLOW_PROCEED processes ===",
  );
  const inject = path.join(ROOT_LOGS_DIR, "INJECT_LOG_FAILURE");
  const allow = path.join(ROOT_LOGS_DIR, "ALLOW_PROCEED");
  try {
    fs.unlinkSync(allow);
  } catch {}
  fs.writeFileSync(inject, "1");

  const id = `pause-exec-${Date.now()}`;
  const patchFile = writeDummyPatch(id);

  // Run a short executor cycle to attempt processing while paused
  const py = "/Users/sawyer/gitSync/gpt-cursor-runner/patch_executor_daemon.py";
  try {
    execSync(`python3 ${py} --check-interval 1`, { timeout: 3000 });
  } catch {}

  const completed = path.join(PATCHES_DIR, ".completed", `${id}.json`);
  const failed = path.join(PATCHES_DIR, ".failed", `${id}.json`);
  if (!exists(completed) && !exists(failed)) {
    wlog("PASS: Executor did not process patch while paused");
  } else {
    wlog("FAIL: Executor processed patch while paused");
  }

  // Resume and rerun with a longer window; remove inject to allow normal logging
  fs.writeFileSync(allow, "1");
  try {
    fs.unlinkSync(inject);
  } catch {}
  try {
    execSync(`python3 ${py} --check-interval 1`, { timeout: 20000 });
  } catch {}

  const summary = path.join(SUMMARIES_DIR, `summary-${id}.md`);
  // Allow a short wait loop for file moves
  let waited = 0;
  while (!(exists(completed) || exists(failed)) && waited < 8000) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    waited += 200;
  }
  if (exists(completed) || exists(failed)) {
    wlog("PASS: Executor processed patch after ALLOW_PROCEED");
  } else {
    wlog("FAIL: Executor did not process patch after ALLOW_PROCEED");
  }
  // Allow delay for summary write and search if exact name not present
  let waitedSum = 0;
  while (!exists(summary) && waitedSum < 10000) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
    waitedSum += 200;
  }
  if (!exists(summary)) {
    try {
      const files = fs
        .readdirSync(SUMMARIES_DIR)
        .filter((f) => f.startsWith("summary-") && f.endsWith(".md"));
      for (const f of files) {
        const p = path.join(SUMMARIES_DIR, f);
        const c = fs.readFileSync(p, "utf8");
        if (c.includes(`Patch File: ${id}.json`)) {
          wlog(`PASS: Summary found by content match (${f})`);
          return;
        }
      }
      wlog("FAIL: Summary missing for processed patch");
    } catch (e) {
      wlog(`FAIL: Summary scan error - ${e.message}`);
    }
  } else {
    wlog("PASS: Summary created for processed patch");
  }

  // Cleanup flags (keep artifacts for inspection)
  try {
    fs.unlinkSync(inject);
  } catch {}
  // leave ALLOW_PROCEED present to avoid blocking ops after test
})();
