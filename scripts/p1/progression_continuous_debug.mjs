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

console.log("DEBUG: Starting progression_continuous_debug.mjs");

const ROOT = process.env.ROOT,
  META = process.env.META,
  PLAIN = process.env.PATCHES_ROOT,
  P1 = process.env.PATCHES_P1;
const TICKER = join(META, "tickers/p1.json");
const LASTREL = join(META, "P1.LAST_RELEASE.json");

console.log("DEBUG: Environment variables:");
console.log("  ROOT:", ROOT);
console.log("  META:", META);
console.log("  PLAIN:", PLAIN);
console.log("  P1:", P1);

const STATUS = (o) => {
  console.log("DEBUG: STATUS called with:", o);
  jsonWrite(TICKER, { ts: new Date().toISOString(), ...o });
};

const releaseNext = () => {
  console.log("DEBUG: releaseNext called");
  const r = runGate(
    "node",
    [join(ROOT, "scripts/p1/release_next_once.mjs")],
    12000,
  );
  console.log("DEBUG: releaseNext result:", r.status);
  return r.status === 0;
};

const runGates = () => {
  console.log("DEBUG: runGates called");
  const result =
    runGate(
      "node",
      [join(ROOT, "scripts/validators/run_all_inline.mjs")],
      240000,
    ).status === 0;
  console.log("DEBUG: runGates result:", result);
  return result;
};

const retract = () => {
  console.log("DEBUG: retract called");
  try {
    if (!existsSync(LASTREL)) {
      console.log("DEBUG: LASTREL does not exist");
      return false;
    }
    const { released } = JSON.parse(readFileSync(LASTREL, "utf8"));
    const bn = basename(released);
    console.log("DEBUG: retracting file:", bn);
    // move back to P1
    renameSync(released, join(P1, bn));
    jsonWrite(join(META, "P1.HALT.json"), {
      ts: new Date().toISOString(),
      reason: "gate_fail_or_executor",
    });
    return true;
  } catch (e) {
    console.log("DEBUG: retract error:", e.message);
    return false;
  }
};

const pm2Nudge = () => {
  console.log("DEBUG: pm2Nudge called");
  const core = pm2CoreOk();
  console.log("DEBUG: pm2Nudge result:", core);
  return core.ok;
};

const planesOk = () => {
  console.log("DEBUG: planesOk called");
  const result =
    httpOk("http://127.0.0.1:8787/api/status", 4000) ||
    (httpOk("http://127.0.0.1:8787/", 4000) &&
      httpOk("http://127.0.0.1:5051/health", 4000));
  console.log("DEBUG: planesOk result:", result);
  return result;
};

(async () => {
  console.log("DEBUG: Main function started");
  let cycles = 0;
  while (true) {
    console.log("DEBUG: Cycle", cycles);

    if (existsSync(join(META, "P1.HALT.json"))) {
      console.log("DEBUG: HALT marker found, exiting");
      STATUS({ state: "HALT_MARKER" });
      process.exit(2);
    }

    const plain = listPlain(PLAIN);
    const p1 = listP1(P1);
    console.log("DEBUG: plain.length:", plain.length, "p1.length:", p1.length);

    STATUS({
      phase: "P1",
      plain_count: plain.length,
      p1_left: p1.length,
      state: "idle",
    });

    if (p1.length === 0 && plain.length === 0) {
      console.log("DEBUG: No patches left, marking done");
      jsonWrite(join(META, "P1.DONE.json"), {
        ts: new Date().toISOString(),
        done: true,
      });
      STATUS({ state: "DONE" });
      process.exit(0);
    }

    // If plain has a patch, wait for executor
    if (plain.length > 0) {
      console.log("DEBUG: Plain has patches, waiting for executor");
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
        console.log("DEBUG: Gates failed, starting auto-fix");
        // Start 6-pass auto-fix loop
        for (let attempt = 1; attempt <= 6; attempt++) {
          STATUS({ state: "auto_fix", attempt });
          console.log("DEBUG: Auto-fix attempt:", attempt);
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
        console.log("DEBUG: Gates passed after executor");
        STATUS({ state: "gates_passed_after_executor" });
      }
      continue; // loop to release next
    }

    // Plain empty: release next
    if (listPlain(PLAIN).length === 0) {
      console.log("DEBUG: Plain empty, releasing next");
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
  console.error("DEBUG: Main function error:", e);
  STATUS({ state: "runner_error", error: String(e) });
  process.exit(2);
});
