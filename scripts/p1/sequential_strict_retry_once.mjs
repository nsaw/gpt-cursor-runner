import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

const Q = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
  P1 = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1",
  F = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed",
  D = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.completed",
  TRI = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage",
  ST =
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/retry_state",
  HALT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1.HALT.json";

const MAX_RETRIES = 3,
  REPAIR_PASSES = 6,
  MAX_WARN = 19;

const pat = /^patch-v\d+\.\d+\.\d+\(P1\.(\d{2})\.(\d{2})\)_.*\.json(\.hold)?$/;
const key = (f) => {
  const m = f.match(/\(P1\.(\d{2})\.(\d{2})\)/);
  return [m ? +m[1] : 99, m ? +m[2] : 99, f];
};
const list = (d, rx) => {
  try {
    return fs.readdirSync(d).filter((f) => (rx ? rx.test(f) : true));
  } catch {
    return [];
  }
};
const plainQueue = () =>
  list(Q).filter((f) => f.endsWith(".json") && !f.endsWith(".hold"));
const exists = (dir, name) => fs.existsSync(path.join(dir, name));
const completed = (name) => exists(D, name);
const failed = (name) => exists(F, name);
const ensure = (d) => {
  try {
    fs.mkdirSync(d, { recursive: true });
  } catch {}
};

function orderP1() {
  const files = list(P1, pat);
  return files.sort((a, b) => {
    const [a1, a2, a3] = key(a),
      [b1, b2, b3] = key(b);
    return a1 - b1 || a2 - b2 || (a3 < b3 ? -1 : 1);
  });
}

function nextCandidate() {
  const files = orderP1();
  for (const f of files) {
    const base = f.replace(/\.hold$/, "");
    if (!completed(base)) {
      return base;
    }
  }
  return null;
}

function release(name) {
  if (plainQueue().length) return "QUEUE_NOT_EMPTY";
  const srcPlain = path.join(P1, name),
    srcHold = srcPlain + ".hold",
    dst = path.join(Q, name);
  if (fs.existsSync(srcPlain)) {
    fs.copyFileSync(srcPlain, dst);
    return "RELEASED_PLAIN";
  }
  if (fs.existsSync(srcHold)) {
    fs.copyFileSync(srcHold, dst);
    return "RELEASED_HOLD";
  }
  if (fs.existsSync(path.join(F, name))) {
    // self-heal: lift from failed to hold then release
    ensure(P1);
    fs.writeFileSync(srcHold, fs.readFileSync(path.join(F, name)));
    try {
      fs.unlinkSync(path.join(F, name));
    } catch {}
    fs.copyFileSync(srcHold, dst);
    return "RESTORED_FROM_FAILED";
  }
  return "SOURCE_MISSING";
}

function pickup() {
  execFileSync(
    "node",
    [
      path.join(
        "/Users/sawyer/gitSync/gpt-cursor-runner",
        "scripts/p1/pickup_watchdog_once.mjs",
      ),
      "--queue",
      Q,
      "--timeoutMs",
      "40000",
      "--emitHalt",
      HALT,
      "--emitProbe",
      path.join(Q, "G2o/pickup_probe.json"),
    ],
    { stdio: "inherit" },
  );
}

function repairAndValidate() {
  try {
    execFileSync(
      "node",
      [
        path.join(
          "/Users/sawyer/gitSync/gpt-cursor-runner",
          "scripts/validators/repair_loop_once.mjs",
        ),
        "--passes",
        String(REPAIR_PASSES),
        "--maxWarnings",
        String(MAX_WARN),
      ],
      { stdio: "inherit" },
    );
  } catch {}
  try {
    execFileSync(
      "node",
      [
        path.join(
          "/Users/sawyer/gitSync/gpt-cursor-runner",
          "scripts/validators/run_all_inline.mjs",
        ),
        "--env",
        "CYOPS",
        "--phase",
        "P1",
      ],
      { stdio: "inherit" },
    );
  } catch {}
}

function summarizeFail() {
  try {
    execFileSync(
      "node",
      [
        path.join(
          "/Users/sawyer/gitSync/gpt-cursor-runner",
          "scripts/executor/fail_summarize.mjs",
        ),
        "--root",
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
        "--failed",
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed",
        "--out",
        path.join("/Users/sawyer/gitSync/.cursor-cache", "CYOPS/summaries"),
      ],
      { stdio: "inherit" },
    );
  } catch {}
}

function requeueSame(name) {
  const src = path.join(F, name),
    dstHold = path.join(P1, name + ".hold");
  if (fs.existsSync(src)) {
    ensure(P1);
    fs.writeFileSync(dstHold, fs.readFileSync(src));
    try {
      fs.unlinkSync(src);
    } catch {}
    return "REQUEUED_HOLD";
  }
  return "NO_FAILED_SOURCE";
}

function getStateFile(name) {
  ensure(ST);
  return path.join(ST, name.replace(/[^a-zA-Z0-9_.()-]/g, "_") + ".json");
}
function loadAttempts(name) {
  const f = getStateFile(name);
  try {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    return j.attempts || 0;
  } catch {
    return 0;
  }
}
function saveAttempts(name, attempts, status) {
  const f = getStateFile(name);
  fs.writeFileSync(
    f,
    JSON.stringify({ ts: Date.now(), name, attempts, status }, null, 2),
  );
}

function enforceOneCycle() {
  ensure(TRI);
  ensure(ST);
  const target = nextCandidate();
  if (!target) {
    console.log("NO_CANDIDATE");
    return;
  }
  let attempts = loadAttempts(target);
  for (; attempts < MAX_RETRIES; attempts++) {
    const rel = release(target);
    console.log("RELEASE:" + rel + ":" + target);
    if (rel === "SOURCE_MISSING") {
      saveAttempts(target, attempts, "missing");
      break;
    }
    pickup(); // wait for executor
    if (completed(target)) {
      saveAttempts(target, attempts + 1, "completed");
      console.log("COMPLETED:" + target);
      return;
    }
    if (failed(target)) {
      summarizeFail();
      repairAndValidate();
      requeueSame(target);
      saveAttempts(target, attempts + 1, "retrying");
      continue;
    }
    // unknown outcome; break to avoid spin
    saveAttempts(target, attempts + 1, "unknown");
    break;
  }
  if (!completed(target)) {
    console.log("RETRY_EXHAUSTED:" + target);
    saveAttempts(target, attempts, "retry_exhausted");
    // emit/update P1.BLOCKED.json but DO NOT advance
    try {
      const out = path.join(P1, "P1.BLOCKED.json");
      let payload = {
        ts: Date.now(),
        reason: "retry_exhausted",
        hold: target,
        attempts,
      };
      fs.writeFileSync(out, JSON.stringify(payload, null, 2));
    } catch {}
  }
}

enforceOneCycle();
