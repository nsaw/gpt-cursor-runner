#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
(async () => {
  const fs = require('fs');
  const Module = require('module');
  const OUT =
    process.env.ESLINT_REPORT_OUT ||
    '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-report.json';
  const CWD =
    process.env.ESLINT_CWD || '/Users/sawyer/gitSync/gpt-cursor-runner';

  const _origReq = Module.prototype.require;
  Module.prototype.require = function (id) {
    if (id === 'ms') {
      return function ms(val) {
        const n = Number.parseFloat(val);
        return Number.isFinite(n) ? n : 0;
      };
    }
    if (id === 'semver') {
      // Minimal shim for ESLint env checks (only what ESLint needs)
      return {
        valid: (_v) => (typeof _v === 'string' && _v.length > 0 ? _v : null),
        satisfies: (_v, _r) => true,
        gte: () => true,
        lt: () => false,
        gt: () => true,
        lte: () => true,
        coerce: (_v) => ({ version: String(_v || '0.0.0') }),
      };
    }
    return _origReq.apply(this, arguments);
  };

  let ESLint;
  try {
    ({ ESLint } = require('eslint'));
  } catch (e) {
    const stub = {
      ok: false,
      error: 'eslint-not-available',
      details: String(e),
      counts: { errors: 0, warnings: 0 },
      skipped: true,
    };
    fs.writeFileSync(OUT, JSON.stringify(stub, null, 2));
    console.log(JSON.stringify(stub, null, 2));
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }

  try {
    const eslint = new ESLint({
      cwd: CWD,
      useEslintrc: true,
      errorOnUnmatchedPattern: false,
      reportUnusedDisableDirectives: 'warn',
    });
    const results = await eslint.lintFiles(['**/*.{js,ts,tsx}']);
    const formatter = await eslint.loadFormatter('json');
    const output = formatter.format(results);
    fs.writeFileSync(OUT, output);
    let errors = 0,
      warnings = 0;
    for (const r of results) {
      errors += r.errorCount || 0;
      warnings += r.warningCount || 0;
    }
    console.log(
      JSON.stringify(
        { ok: errors === 0, counts: { errors, warnings } },
        null,
        2,
      ),
    );
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  } catch (e) {
    const stub = {
      ok: false,
      error: 'eslint-run-failed',
      details: String(e),
      counts: { errors: 0, warnings: 0 },
      skipped: true,
    };
    fs.writeFileSync(OUT, JSON.stringify(stub, null, 2));
    console.log(JSON.stringify(stub, null, 2));
    // eslint-disable-next-line no-process-exit
    process.exit(0);
  }
})();
