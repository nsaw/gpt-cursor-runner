#!/usr/bin/env node
/**
 * NB-2.0 pre-commit gate (staged-only, ESLint Node API, no CLI length limits).
 * - Blocks on:   errorCount > 0  OR  warningCount >= MAX_WARN
 * - MAX_WARN tuned below to match current contract.
 */
const { spawnSync } = require("child_process");
const { ESLint } = require("eslint");
const fs = require("fs");
const path = require("path");

const MAX_WARN = 20; // contract gate for staged set only
const repoRoot = process.cwd();

// Run ban node eval guard first
try {
  require(path.join(repoRoot, 'scripts/ci/ban_node_eval_guard.js'));
} catch (err) {
  console.error("pre-commit: ban node eval guard failed");
  process.exit(1); // eslint-disable-line no-process-exit
}

// Get staged files (nul-separated, robust to spaces/newlines)
const diff = spawnSync("git", ["diff", "--cached", "--name-only", "-z"], { encoding: "buffer" });
if (diff.status !== 0) {
  console.error("pre-commit: failed to read staged files");
  process.exit(1); // eslint-disable-line no-process-exit
}
const raw = diff.stdout || Buffer.alloc(0);
const parts = raw.toString("utf8").split("\u0000").filter(Boolean);

// Filter to lintable extensions, ensure they still exist and are inside repo
// Explicitly exclude node_modules, _gpt5intake, _backups, and other excluded directories
const lintable = parts
  .filter(f => /\.(?:js|ts|tsx)$/.test(f))
  .filter(f => !f.includes('node_modules/'))
  .filter(f => !f.includes('_gpt5intake/'))
  .filter(f => !f.includes('_backups/'))
  .filter(f => !f.includes('.cursor-cache/'))
  .filter(f => !f.includes('dist/'))
  .filter(f => !f.includes('coverage/'))
  .map(f => path.resolve(repoRoot, f))
  .filter(f => fs.existsSync(f));

if (lintable.length === 0) {
  process.exit(0); // nothing to check // eslint-disable-line no-process-exit
}

(async () => {
  const eslint = new ESLint({ 
    useEslintrc: true, 
    cache: true, 
    fix: false,
    ignorePath: path.join(repoRoot, '.eslintignore'),
    overrideConfig: {
      ignorePatterns: [
        "**/node_modules/**",
        "**/_gpt5intake/**", 
        "**/_backups/**",
        "**/.cursor-cache/**",
        "**/dist/**",
        "**/coverage/**"
      ]
    }
  });
  const results = await eslint.lintFiles(lintable);
  const errorCount = results.reduce((a, r) => a + (r.errorCount || 0), 0);
  const warningCount = results.reduce((a, r) => a + (r.warningCount || 0), 0);

  // Write an artifact for traceability
  const outDir = path.resolve(repoRoot, ".cursor-cache/ROOT/.logs");
  try { fs.mkdirSync(outDir, { recursive: true }); } catch {}
  fs.writeFileSync(
    path.join(outDir, "precommit.eslint-staged.json"),
    JSON.stringify({ files: lintable, errorCount, warningCount }, null, 2)
  );

  const formatter = await eslint.loadFormatter("stylish");
  const text = formatter.format(results);
  if (text && text.trim()) process.stdout.write(text);

  if (errorCount > 0 || warningCount >= MAX_WARN) {
    console.error(
      `\n✖ pre-commit: ESLint gate failed on staged set — errors:${errorCount} warnings:${warningCount} (max warnings:${MAX_WARN})`
    );
    process.exit(1); // eslint-disable-line no-process-exit
  }

  console.log(`\n✓ pre-commit: ESLint gate passed — errors:${errorCount} warnings:${warningCount} (max warnings:${MAX_WARN})`);
  process.exit(0); // eslint-disable-line no-process-exit
})().catch(err => {
  console.error("pre-commit: unexpected failure\n", err);
  process.exit(2); // eslint-disable-line no-process-exit
});
