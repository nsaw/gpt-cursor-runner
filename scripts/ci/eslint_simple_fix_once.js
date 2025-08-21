/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const RUNNER = path.join(ROOT, "scripts/ci/eslint_run_local_once.js");
const PRE = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-pre.json";
const POST = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-post.json";
const DELTA = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-loop-delta.json";

// Simple, non-blocking ESLint execution
const runEslint = (args, timeoutMs = 300000) => new Promise((resolve) => {
  const p = spawn(process.execPath, [RUNNER, ...args], { 
    cwd: ROOT, 
    stdio: ['ignore', 'pipe', 'pipe'] 
  });
  
  let stdout = '', stderr = '';
  p.stdout.on('data', d => stdout += d);
  p.stderr.on('data', d => stderr += d);
  
  const t = setTimeout(() => {
    try { p.kill('SIGKILL'); } catch(_) {}
    resolve({ code: 124, stdout, stderr });
  }, timeoutMs);
  
  p.on('exit', code => {
    clearTimeout(t);
    resolve({ code: code || 1, stdout, stderr });
  });
});

// Count errors and warnings from JSON output
const countIssues = (jsonFile) => {
  try {
    const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
    let errors = 0, warnings = 0;
    for (const file of data) {
      for (const msg of file.messages || []) {
        if (msg.severity === 2) errors++;
        else if (msg.severity === 1) warnings++;
      }
    }
    return { errors, warnings };
  } catch {
    return { errors: -1, warnings: -1 };
  }
};

(async () => {
  console.log("[eslint-simple-fix] Starting...");
  
  // 1. Get initial state
  console.log("[eslint-simple-fix] Getting initial state...");
  await runEslint([".", "--ext", ".ts,.tsx,.js", "-f", "json", "-o", PRE, "--max-warnings", "1000000"]);
  const preState = countIssues(PRE);
  console.log(`[eslint-simple-fix] Pre: ${preState.errors} errors, ${preState.warnings} warnings`);
  
  // 2. Apply auto-fixes for common rules
  console.log("[eslint-simple-fix] Applying auto-fixes...");
  const fixableRules = [
    'no-var', 'prefer-const', 'dot-notation', 'eqeqeq', 
    'object-shorthand', 'no-extra-boolean-cast', 'no-useless-escape',
    'semi', 'quotes', 'no-trailing-spaces', 'no-multiple-empty-lines',
    'eol-last', 'comma-dangle'
  ];
  
  for (const rule of fixableRules.slice(0, 5)) { // Limit to top 5 to avoid blocking
    console.log(`[eslint-simple-fix] Fixing rule: ${rule}`);
    await runEslint([
      ".", "--ext", ".ts,.tsx,.js", "--fix", 
      "--fix-type", "problem,suggestion,layout",
      "--rule", `${rule}:error`,
      "--max-warnings", "0"
    ]);
  }
  
  // 3. Apply unused variable prefixing
  console.log("[eslint-simple-fix] Applying unused variable prefixing...");
  const prefixer = spawn(process.execPath, [
    path.join(ROOT, "scripts/ci/eslint_apply_unused_prefix_once.js")
  ], { cwd: ROOT, stdio: 'inherit' });
  
  await new Promise(resolve => prefixer.on('exit', resolve));
  
  // 4. Final fix pass
  console.log("[eslint-simple-fix] Final fix pass...");
  await runEslint([
    ".", "--ext", ".ts,.tsx,.js", "--fix",
    "--fix-type", "problem,suggestion,layout",
    "--max-warnings", "0"
  ]);
  
  // 5. Get final state
  console.log("[eslint-simple-fix] Getting final state...");
  await runEslint([".", "--ext", ".ts,.tsx,.js", "-f", "json", "-o", POST, "--max-warnings", "1000000"]);
  const postState = countIssues(POST);
  console.log(`[eslint-simple-fix] Post: ${postState.errors} errors, ${postState.warnings} warnings`);
  
  // 6. Write delta
  const delta = {
    pre: { errors: preState.errors, warnings: preState.warnings },
    post: { errors: postState.errors, warnings: postState.warnings },
    deltaErrors: preState.errors - postState.errors,
    deltaWarnings: preState.warnings - postState.warnings
  };
  
  fs.writeFileSync(DELTA, JSON.stringify(delta, null, 2));
  console.log(`[eslint-simple-fix] Delta: -${delta.deltaErrors} errors, -${delta.deltaWarnings} warnings`);
  
  // Exit with success if we achieved the goal
  const success = postState.errors === 0 && postState.warnings <= 20;
  console.log(`[eslint-simple-fix] ${success ? 'SUCCESS' : 'PARTIAL'}: errors=${postState.errors}, warnings=${postState.warnings}`);
  process.exit(success ? 0 : 1);
})();
