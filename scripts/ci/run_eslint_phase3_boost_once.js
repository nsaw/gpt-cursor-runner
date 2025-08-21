/* eslint-disable */
const { spawn } = require("child_process");
const fs = require("fs"),
  path = require("path");
const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const RUNNER = path.join(ROOT, "scripts/ci/eslint_run_local_once.js");
const PRE =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase3-pre.json";
const POST =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase3-post.json";
const DELTA =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-phase3-delta.json";
const OFF =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-top-offenders.json";

const FIXABLE = [
  "no-var",
  "prefer-const",
  "dot-notation",
  "eqeqeq",
  "object-shorthand",
  "no-extra-boolean-cast",
  "no-useless-escape",
  "semi",
  "quotes",
  "no-trailing-spaces",
  "no-multiple-empty-lines",
];
const forceFlags = FIXABLE.map((r) => ["--rule", `${r}:error`]).flat();
const run = (args, out) =>
  new Promise((res) => {
    const outArgs = out ? ["-f", "json", "-o", out] : [];
    const p = spawn(
      process.execPath,
      [RUNNER, ".", "--ext", ".ts,.tsx,.js", ...outArgs, ...args],
      {
        cwd: ROOT,
        stdio: outArgs.length ? ["ignore", "ignore", "inherit"] : "inherit",
      },
    );
    const t = setTimeout(() => {
      try {
        p.kill("SIGKILL");
      } catch (_) {}
      res(124);
    }, 300000);
    p.on("exit", (c) => {
      clearTimeout(t);
      res(c ?? 1);
    });
  });
const summarize = (file) => {
  try {
    const r = JSON.parse(fs.readFileSync(file, "utf8"));
    let e = 0,
      w = 0;
    for (const f of r) {
      for (const m of f.messages || []) {
        if (m.severity === 2) e++;
        else if (m.severity === 1) w++;
      }
    }
    return { errors: e, warnings: w };
  } catch {
    return { errors: -1, warnings: -1 };
  }
};
(async () => {
  // Pre snapshot
  await run(["-f", "json", "-o", PRE, "--max-warnings", "1000000"], null);
  let ranked = [];
  try {
    ranked = JSON.parse(fs.readFileSync(OFF, "utf8")).ranked || [];
  } catch {
    ranked = [];
  }
  // If offenders missing/empty, build a quick offenders list by reusing PRE
  if (!ranked.length) {
    let r = [];
    try {
      r = JSON.parse(fs.readFileSync(PRE, "utf8"));
    } catch {}
    const tally = {};
    const pathMod = require("path");
    for (const f of r) {
      const errs = (f.messages || []).filter((m) => m.severity === 2).length;
      if (!errs) continue;
      const rel = pathMod.relative(ROOT, f.filePath);
      const dir2 = rel.split(pathMod.sep).slice(0, 2).join("/") || ".";
      tally[dir2] = (tally[dir2] || 0) + errs;
    }
    ranked = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .map(([dir, errors]) => ({ dir, errors }));
  }
  const attempt = async (count) => {
    const targets = ranked.slice(0, count).map((x) => x.dir);
    for (const dir of targets) {
      await run(
        [
          "--fix",
          "--fix-type",
          "problem,suggestion,layout",
          "--max-warnings",
          "0",
          ...forceFlags,
          dir,
        ],
        null,
      );
    }
  };
  // Pass 1: top 12
  await attempt(12);
  // Pass 2: escalate to top 20
  await attempt(20);
  // Post snapshot after passes
  await run(["-f", "json", "-o", POST, "--max-warnings", "1000000"], null);
  const pre = summarize(PRE),
    post = summarize(POST);
  let ratio = pre.errors > 0 ? (pre.errors - post.errors) / pre.errors : 0;

  // If still under 15%, do a last resort repo-wide fix-only pass
  if (ratio < 0.15) {
    await run(
      [
        "--fix",
        "--fix-type",
        "problem,suggestion,layout",
        "--max-warnings",
        "0",
        ...forceFlags,
      ],
      null,
    );
    await run(["-f", "json", "-o", POST, "--max-warnings", "1000000"], null);
    const post2 = summarize(POST);
    ratio = pre.errors > 0 ? (pre.errors - post2.errors) / pre.errors : 0;
  }

  const finalPost = summarize(POST);
  const delta = {
    pre,
    post: finalPost,
    reducedErrors: pre.errors - finalPost.errors,
    reducedWarnings: pre.warnings - finalPost.warnings,
    ratio,
  };
  fs.writeFileSync(DELTA, JSON.stringify(delta, null, 2));
  process.exit(ratio >= 0.15 ? 0 : 2);
})();
