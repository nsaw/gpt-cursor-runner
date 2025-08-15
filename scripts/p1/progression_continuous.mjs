process.env.RUNNER_CONTINUE_ON_FAIL =
  process.env.RUNNER_CONTINUE_ON_FAIL || "1";
process.env.MAX_AUTOFIX_ATTEMPTS = process.env.MAX_AUTOFIX_ATTEMPTS || "6";
process.env.PATCHES_ROOT =
  process.env.PATCHES_ROOT ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
process.env.PATCHES_P1 =
  process.env.PATCHES_P1 ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1";

import { existsSync, readFileSync, renameSync } from "fs";
import { join, basename } from "path";
import {
  listPlain,
  listP1,
  jsonWrite,
  httpOk,
  pm2CoreOk,
  runGate,
  sleep,
} from "../tools/nb_utils.mjs";

const ROOT = process.env.ROOT,
  META = process.env.META,
  PLAIN = process.env.PATCHES_ROOT,
  P1 = process.env.PATCHES_P1;
const TICKER = join(META, "tickers/p1.json");
const LASTREL = join(META, "P1.LAST_RELEASE.json");

const STATUS = (o) => {
  jsonWrite(TICKER, { ts: new Date().toISOString(), ...o });
};

const releaseNext = () => {
  // call existing helper
  const r = runGate(
    "node",
    [join(ROOT, "scripts/p1/release_next_once.mjs")],
    12000,
  );
  return r.status === 0;
};

const runGates = () =>
  runGate("node", [join(ROOT, "scripts/validators/run_all_inline.mjs")], 240000)
    .status === 0;

const retract = () => {
  try {
    if (!existsSync(LASTREL)) return false;
    const { released } = JSON.parse(readFileSync(LASTREL, "utf8"));
    const bn = basename(released);
    // move back to P1
    renameSync(released, join(P1, bn));
    jsonWrite(join(META, "P1.HALT.json"), {
      ts: new Date().toISOString(),
      reason: "gate_fail_or_executor",
    });
    return true;
  } catch {
    return false;
  }
};

const pm2Nudge = () => {
  // light-touch: rely on gate runner to detect pm2; here we just signal needed
  const core = pm2CoreOk();
  return core.ok;
};

const planesOk = () =>
  httpOk("http://127.0.0.1:8787/api/status", 4000) ||
  (httpOk("http://127.0.0.1:8787/", 4000) &&
    httpOk("http://127.0.0.1:5051/health", 4000));

(async () => {
  console.log("DEBUG: Runner starting...");
  let cycles = 0;
  while (true) {
    console.log("DEBUG: Cycle", cycles, "starting...");
    if (existsSync(join(META, "P1.HALT.json"))) {
      console.log("DEBUG: HALT marker found");
      STATUS({ state: "HALT_MARKER" });
      process.exit(2);
    }
    const plain = listPlain(PLAIN);
    const p1 = listP1(P1);
    console.log(
      "DEBUG: P1 patches:",
      p1.length,
      "Plain patches:",
      plain.length,
    );
    STATUS({
      phase: "P1",
      plain_count: plain.length,
      p1_left: p1.length,
      state: "idle",
    });
    if (p1.length === 0 && plain.length === 0) {
      console.log("DEBUG: P1 DONE condition met");
      jsonWrite(join(META, "P1.DONE.json"), {
        ts: new Date().toISOString(),
        done: true,
      });
      STATUS({ state: "DONE" });
      process.exit(0);
    }

    // If plain has a patch, wait for executor
    if (plain.length > 0) {
      // Wait up to ~120s for executor pickup
      let waited = 0,
        step = 4000;
      while (listPlain(PLAIN).length > 0 && waited < 120000) {
        STATUS({
          state: "executor_wait",
          plain_count: listPlain(PLAIN).length,
          wait_ms: waited,
        });
        await sleep(step);
        waited += step;
      }
      // Gate after executor likely moved it
      if (!runGates()) {
        // Start auto-fix loop
        for (
          let attempt = 1;
          attempt <= parseInt(process.env.MAX_AUTOFIX_ATTEMPTS || "6", 10);
          attempt++
        ) {
          STATUS({ state: "auto_fix", attempt });
          // attempt set:
          if (attempt === 1) {
            /* re-run gates immediately */
          }
          if (attempt === 2) {
            /* ensure planes */ if (!planesOk()) await sleep(3000);
          }
          if (attempt === 3) {
            /* pm2 nudge check */ pm2Nudge();
          }
          if (attempt === 4) {
            /* reinstall playwright */ runGate(
              "sh",
              [
                "-lc",
                `cd ${ROOT} && npx -y playwright@1.46.0 install chromium`,
              ],
              180000,
            );
          }
          if (attempt === 5) {
            /* visual-only retry */ runGate(
              "node",
              [join(ROOT, "scripts/validators/g2o_visual_once_nb.mjs")],
              90000,
            );
          }
          if (attempt === 6) {
            /* retract and halt */ retract();
            STATUS({ state: "HALT_EMIT" });
            process.exit(2);
          }
          if (runGates()) {
            STATUS({ state: "auto_fix_pass", attempt });
            break;
          }
        }
      } else {
        STATUS({ state: "gates_passed_after_executor" });
      }
      continue; // loop to release next
    }

    // Plain empty: release next
    if (listPlain(PLAIN).length === 0) {
      const ok = releaseNext();
      STATUS({
        state: ok ? "released_next" : "no_candidate_or_busy",
        plain_count: listPlain(PLAIN).length,
      });
      // immediate gates pre-check to catch early issues
      runGates(); // fire-and-collect (result written to META)
      // brief settle delay
      await sleep(4000);
    }

    cycles++;
    if (cycles % 50 === 0) STATUS({ state: "heartbeat" });
    await sleep(3000);
  }
})().catch((e) => {
  STATUS({ state: "runner_error", error: String(e) });
  process.exit(2);
});
