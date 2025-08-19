import fs from "fs";
import path from "path";

const ROOT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const FAILED = path.join(ROOT, ".failed");
const COMPLETED = path.join(ROOT, ".completed");
const ALLOW_PHASE = "P1."; // only allow active phase into plain queue

function list(d) {
  try {
    return fs.readdirSync(d);
  } catch {
    return [];
  }
}

function basename(f) {
  return f;
}

function ensureHoldForOutOfPhase() {
  const plain = list(ROOT).filter(
    (f) => f.endsWith(".json") && !f.endsWith(".hold"),
  );
  for (const f of plain) {
    if (!f.includes("(" + ALLOW_PHASE)) {
      // not current phase → hold it
      const src = path.join(ROOT, f);
      const dest = src + ".hold";
      try {
        if (!fs.existsSync(dest)) fs.renameSync(src, dest);
      } catch (e) {
        /* no-op */
      }
    }
  }
}

function cleanupFailedRequeued() {
  const plain = new Set(
    list(ROOT).filter((f) => f.endsWith(".json") && !f.endsWith(".hold")),
  );
  const failed = list(FAILED).filter((f) => f.endsWith(".json"));
  for (const f of failed) {
    if (plain.has(f)) {
      // same file name re-queued
      try {
        fs.unlinkSync(path.join(FAILED, f));
      } catch (e) {
        /* no-op */
      }
    }
  }
}

function cleanupFailedCompleted() {
  const completed = new Set(list(COMPLETED).filter((f) => f.endsWith(".json")));
  const failed = list(FAILED).filter((f) => f.endsWith(".json"));
  for (const f of failed) {
    if (completed.has(f)) {
      // same patch eventually completed
      try {
        fs.unlinkSync(path.join(FAILED, f));
      } catch (e) {
        /* no-op */
      }
    }
  }
}

const mode = process.argv[2] || "all";
if (mode === "phase-hold" || mode === "all") {
  ensureHoldForOutOfPhase();
}
if (mode === "cleanup-requeued" || mode === "all") {
  cleanupFailedRequeued();
}
if (mode === "cleanup-completed" || mode === "all") {
  cleanupFailedCompleted();
}

console.log("HOUSEKEEP_DONE:" + mode);
