import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = process.env.ROOT || "/Users/sawyer/gitSync/gpt-cursor-runner";
const SUMS =
  process.env.SUMS || "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";
const ts = () => new Date().toISOString();
const env = {
  ...process.env,
  PATH: `${ROOT}/node_modules/.bin:${process.env.PATH || ""}`,
};

const steps = [];
const note = (name, cmd) => {
  steps.push({ name, cmd });
};

const run = (name, cmd, allowFail = false) => {
  note(name, cmd);
  try {
    execSync(cmd, { stdio: "inherit", cwd: ROOT, env });
    return true;
  } catch (e) {
    if (allowFail) return false;
    throw e;
  }
};

let ok = false;
let errMsg = "";
try {
  // 1) ESLint strict check → fix → recheck
  if (
    !run("eslint-check", "npx eslint . --ext .ts,.tsx --max-warnings=0", true)
  ) {
    run("eslint-fix", "npx eslint . --ext .ts,.tsx --fix");
    run("eslint-recheck", "npx eslint . --ext .ts,.tsx --max-warnings=0");
  }

  // 2) Prettier check → write → recheck
  const PRETTIER_SET = '"**/*.{ts,tsx,js,jsx,json,md,css,scss}"';
  if (!run("prettier-check", `npx prettier -c ${PRETTIER_SET}`, true)) {
    run("prettier-write", `npx prettier -w ${PRETTIER_SET}`);
    run("prettier-recheck", `npx prettier -c ${PRETTIER_SET}`);
  }

  // 3) TypeScript types (no emit)
  run("tsc", "npx tsc --noEmit");

  ok = true;
} catch (e) {
  errMsg = e?.message || String(e);
} finally {
  fs.mkdirSync(SUMS, { recursive: true });
  const out = [
    "# Precommit Lint/Auto-Fix",
    `ts: ${ts()}`,
    `status: ${ok ? "PASS" : "FAIL"}`,
    `steps: ${steps.map((s) => s.name).join(", ")}`,
    !ok ? `error: ${errMsg}` : "",
    "",
  ].join("\n");
  fs.writeFileSync(
    path.join(SUMS, `summary-precommit-lint-${Date.now()}.md`),
    out,
  );
}

if (!ok) {
  console.error("precommit_lint: FAIL");
  process.exit(2);
} else {
  console.log("precommit_lint: PASS");
}
