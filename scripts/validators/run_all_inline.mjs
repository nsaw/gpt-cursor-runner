import { jsonWrite, httpOk, pm2CoreOk, runGate } from "../tools/nb_utils.mjs";
import { join } from "path";

const ROOT = process.env.ROOT,
  META = process.env.META;
const out = { ts: new Date().toISOString(), gates: {} };

// __VERSIONING_VALIDATION_STAGE__ (NB-safe, idempotent)
try {
  require("child_process").execSync(
    "node scripts/tools/validate_patch_naming_strict.mjs",
    { stdio: "inherit" },
  );
} catch (e) {
  console.error(
    "[validators] validate_patch_naming_strict failed; aborting gates.",
  );
  process.exit(2);
}

// === BEGIN: PRECOMMIT REPAIR LOOP (idempotent) ===
import { spawnSync as __spawnSync } from "child_process";
(function __repairLoopStage() {
  try {
    const env = Object.assign({}, process.env, {
      MIN_PASSES: process.env.MIN_PASSES ?? "6",
      MAX_PASSES: process.env.MAX_PASSES ?? "10",
      MAX_WARNINGS: process.env.MAX_WARNINGS ?? "19",
      EARLY_STOP: process.env.EARLY_STOP ?? "false",
    });
    const r = __spawnSync(
      "node",
      [
        "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/validators/repair_loop_once.mjs",
      ],
      { stdio: "inherit", env },
    );
    if (r.status !== 0) {
      console.error(
        "[repair_loop] thresholds not met after configured passes; failing gates.",
      );
      process.exit(r.status || 2);
    }
  } catch (e) {
    console.error("[repair_loop] stage crashed:", e?.message || e);
    process.exit(2);
  }
})();
// === END: PRECOMMIT REPAIR LOOP ===

// __PRECOMMIT_LINT_STAGE__ (NB-safe, idempotent)
try {
  require("child_process").execSync(
    "node scripts/validators/precommit_lint_once.mjs --mode=pipeline",
    { stdio: "inherit" },
  );
} catch (e) {
  console.error("[validators] precommit_lint_once failed; aborting gates.");
  process.exit(2);
}

// planes
out.gates.plane8787 =
  httpOk("http://127.0.0.1:8787/api/status", 4000) ||
  httpOk("http://127.0.0.1:8787/", 4000);
out.gates.plane5051 = httpOk("http://127.0.0.1:5051/health", 4000);

// pm2 core
const core = pm2CoreOk();
out.gates.pm2 = core.ok;
out.pm2_bad = core.bad || [];

// playwright present/install
let pw = runGate(
  "node",
  [
    "-e",
    "try{require('child_process').execSync('npx playwright --version',{stdio:[`ignore`,`ignore`,`ignore`]});process.exit(0)}catch{process.exit(1)}",
  ],
  10000,
);
if (pw.status !== 0) {
  pw = runGate(
    "sh",
    ["-lc", `cd ${ROOT} && npx -y playwright@1.46.0 install chromium`],
    180000,
  );
}
out.gates.pw_install = pw.status === 0;

// visual
const vis = runGate(
  "node",
  [join(ROOT, "scripts/validators/g2o_visual_once_nb.mjs")],
  75000,
);
out.gates.visual = vis.status === 0;

// tsc
const tsc = runGate("sh", ["-lc", `cd ${ROOT} && npx tsc --noEmit`], 70000);
out.gates.tsc = tsc.status === 0;

// eslint
const esl = runGate(
  "sh",
  ["-lc", `cd ${ROOT} && npx eslint . --ext .ts,.tsx --max-warnings=19`],
  130000,
);
out.gates.eslint = esl.status === 0;

out.pass = Object.values(out.gates).every(Boolean);
jsonWrite(join(META, "gate_summary.json"), out);
console.log(JSON.stringify(out));
process.exit(out.pass ? 0 : 2);
