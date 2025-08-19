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

const planesOk = () =>
  httpOk("http://127.0.0.1:8787/api/status", 4000) ||
  (httpOk("http://127.0.0.1:8787/", 4000) &&
    httpOk("http://127.0.0.1:5051/health", 4000));

(async () => {
  let cycles = 0;
  console.log("P1 Simple Progression Runner Started");

  while (true) {
    if (existsSync(join(META, "P1.HALT.json"))) {
      STATUS({ state: "HALT_MARKER" });
      console.log("Halt marker found, exiting");
      process.exit(2);
    }

    const plain = listPlain(PLAIN);
    const p1 = listP1(P1);

    STATUS({
      phase: "P1",
      plain_count: plain.length,
      p1_left: p1.length,
      state: "idle",
    });
    console.log(`Cycle ${cycles}: Plain=${plain.length}, P1=${p1.length}`);

    if (p1.length === 0 && plain.length === 0) {
      jsonWrite(join(META, "P1.DONE.json"), {
        ts: new Date().toISOString(),
        done: true,
      });
      STATUS({ state: "DONE" });
      console.log("P1 complete, exiting");
      process.exit(0);
    }

    // If plain has a patch, wait for executor
    if (plain.length > 0) {
      console.log(`Waiting for executor to process: ${plain[0]}`);
      STATUS({ state: "executor_wait", plain_count: plain.length });

      // Wait up to ~60s for executor pickup
      let waited = 0,
        step = 4000;
      while (listPlain(PLAIN).length > 0 && waited < 60000) {
        await sleep(step);
        waited += step;
        console.log(`Waited ${waited}ms for executor`);
      }

      // Simple gate check after executor likely moved it
      console.log("Running gates after executor processing");
      const gatesOk = runGates();
      if (gatesOk) {
        STATUS({ state: "gates_passed_after_executor" });
        console.log("Gates passed after executor");
      } else {
        STATUS({ state: "gates_failed_after_executor" });
        console.log("Gates failed after executor");
      }
      continue; // loop to release next
    }

    // Plain empty: release next
    if (listPlain(PLAIN).length === 0) {
      console.log("Plain queue empty, releasing next patch");
      const ok = releaseNext();
      STATUS({
        state: ok ? "released_next" : "no_candidate_or_busy",
        plain_count: listPlain(PLAIN).length,
      });

      if (ok) {
        console.log("Successfully released next patch");
        // brief settle delay
        await sleep(4000);
      } else {
        console.log("Failed to release next patch");
      }
    }

    cycles++;
    if (cycles % 10 === 0) STATUS({ state: "heartbeat" });
    await sleep(3000);
  }
})().catch((e) => {
  STATUS({ state: "runner_error", error: String(e) });
  console.error("Runner error:", e);
  process.exit(2);
});
