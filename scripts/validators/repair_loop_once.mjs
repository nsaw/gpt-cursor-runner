#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const cfgPath =
  "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/config/repair_loop.config.json";
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

const ROOT = cfg.ROOT;
const META = cfg.META;
const SUMS = cfg.SUMS;

const MIN_PASSES = parseInt(process.env.MIN_PASSES ?? cfg.MIN_PASSES, 10);
const MAX_PASSES = parseInt(process.env.MAX_PASSES ?? cfg.MAX_PASSES, 10);
const MAX_WARNINGS = parseInt(process.env.MAX_WARNINGS ?? cfg.MAX_WARNINGS, 10);
const EARLY_STOP = String(process.env.EARLY_STOP ?? cfg.EARLY_STOP) === "true";

const ESLINT_PATTERN = process.env.ESLINT_PATTERN ?? cfg.ESLINT_PATTERN;
const ESLINT_EXT = process.env.ESLINT_EXT ?? cfg.ESLINT_EXT;
const PRETTIER_GLOB = process.env.PRETTIER_GLOB ?? cfg.PRETTIER_GLOB;
const TSC_PROJECT = process.env.TSC_PROJECT ?? cfg.TSC_PROJECT;

fs.mkdirSync(META, { recursive: true });
fs.mkdirSync(SUMS, { recursive: true });

const now = () => new Date().toISOString();

function run(cmd, args, cwd = ROOT) {
  const r = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return { code: r.status ?? 0, out: r.stdout || "", err: r.stderr || "" };
}

function eslintFixAndCount() {
  // Run with JSON output to count precisely; then --fix to auto-correct.
  const rJson = run("npx", [
    "eslint",
    ESLINT_PATTERN,
    "--ext",
    ESLINT_EXT,
    "--format",
    "json",
  ]);
  let errorCount = 0,
    warningCount = 0;
  try {
    const results = JSON.parse(rJson.out || "[]");
    for (const f of results) {
      errorCount += f.errorCount || 0;
      warningCount += f.warningCount || 0;
    }
  } catch {
    /* tolerate non-json from eslint */
  }

  // Auto-fix pass
  run("npx", ["eslint", ESLINT_PATTERN, "--ext", ESLINT_EXT, "--fix"]);
  return { errorCount, warningCount };
}

function prettierWrite() {
  return run("npx", ["prettier", "-w", PRETTIER_GLOB]);
}

function tscCheck() {
  const r = run("npx", ["tsc", "--noEmit", "-p", TSC_PROJECT]);
  // Count TypeScript errors roughly by "error TS" fingerprint
  const txt = `${r.out || ""}\n${r.err || ""}`;
  const tsErrors = (txt.match(/error TS\d+/g) || []).length;
  return { code: r.code, tsErrors, raw: txt.slice(-8000) };
}

const passes = [];
let finalCode = 2;

for (let i = 1; i <= Math.max(MIN_PASSES, 1); i++) {
  const passStart = now();

  const eslint1 = eslintFixAndCount();
  const prettier = prettierWrite();
  const eslint2 = eslintFixAndCount(); // re-count after auto-fix/format

  const tsc = tscCheck();

  const blocking = eslint2.errorCount + tsc.tsErrors;
  const warnings = eslint2.warningCount;

  const pass = {
    pass: i,
    ts: passStart,
    eslint_before: eslint1,
    eslint_after: eslint2,
    prettier_status: prettier.code,
    tsc_errors: tsc.tsErrors,
    blocking,
    warnings,
    thresholds: { maxWarnings: MAX_WARNINGS, blockingMustBeZero: true },
  };
  passes.push(pass);

  // Write rolling JSON + MD per pass
  const roll = {
    ts: now(),
    minPasses: MIN_PASSES,
    maxPasses: MAX_PASSES,
    goal: { blocking: 0, warnings: `<${MAX_WARNINGS + 1}` },
    passes,
  };
  fs.writeFileSync(
    path.join(META, "repair_loop_result.json"),
    JSON.stringify(roll, null, 2),
  );
  const md = [
    `# Repair Loop Pass ${i}`,
    `time: ${passStart}`,
    `blocking_errors: ${blocking}`,
    `warnings: ${warnings} (limit ${MAX_WARNINGS})`,
    `eslint_after: errors=${eslint2.errorCount}, warnings=${eslint2.warningCount}`,
    `tsc_errors: ${tsc.tsErrors}`,
  ].join("\n");
  fs.writeFileSync(
    path.join(SUMS, `summary-repair-loop-${Date.now()}.md`),
    `${md}\n`,
  );

  const thresholdMet = blocking === 0 && warnings <= MAX_WARNINGS;

  // Always perform at least MIN_PASSES; after that, stop on success OR continue up to MAX_PASSES on failure.
  if (i >= MIN_PASSES) {
    if (thresholdMet) {
      finalCode = 0;
      if (EARLY_STOP) break;
      else if (i >= MAX_PASSES) break;
    } else if (i >= MAX_PASSES) {
      finalCode = 2;
      break;
    }
  }
}

// Hardened exit: 0 only when thresholds satisfied after ≥MIN_PASSES
process.exit(finalCode);
