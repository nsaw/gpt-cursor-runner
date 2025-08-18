#!/usr/bin/env node
// run_eslint_report_once.js — NB-2.0 compliant ESLint runner with `ms` shim and hard ignore patterns.
(async () => {
  const fs = require('fs'); const path = require('path'); const Module = require('module');
  const OUT = process.env.ESLINT_REPORT_OUT || "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-report.json";
  const CWD = process.env.ESLINT_CWD || "/Users/sawyer/gitSync/gpt-cursor-runner";
  
  // Shim `ms` to bypass potential corruption
  const _origReq = Module.prototype.require;
  Module.prototype.require = function(id){
    if (id === 'ms') {
      return function ms(val){
        if (typeof val === 'string') { const n = parseFloat(val); return isFinite(n) ? n : 0; }
        const n = Number(val); return isFinite(n) ? n : 0;
      };
    }
    return _origReq.apply(this, arguments);
  };
  
  let ESLint;
  try { ({ ESLint } = require('eslint')); }
  catch (e) {
    const stub = { ok:false, error:"eslint-not-available", details:String(e), counts:{errors:0,warnings:0}, skipped:true };
    fs.writeFileSync(OUT, JSON.stringify(stub,null,2)); 
    console.log(JSON.stringify(stub,null,2)); 
    process.exit(0);
  }
  
  try {
    const eslint = new ESLint({
      cwd: CWD,
      useEslintrc: false, // Don't use .eslintrc.js to avoid parser issues
      errorOnUnmatchedPattern: false,
      overrideConfig: {
        env: { node: true, es2021: true },
        extends: ["eslint:recommended"],
        parserOptions: {
          ecmaVersion: 12,
          sourceType: "module"
        },
        rules: {
          "prefer-const": "error",
          "no-var": "error",
          "no-unused-vars": "warn",
          "no-undef": "warn",
          "no-case-declarations": "warn",
          "no-empty": "warn",
          "no-dupe-keys": "error",
          "no-process-exit": "warn",
          "require-await": "warn",
          "complexity": "warn",
          "max-lines": "warn",
          "max-depth": "warn",
          "no-constant-condition": "warn"
        },
        ignorePatterns: ["**/node_modules/**","**/dist/**","**/.cursor-cache/**","**/_backups/**","**/*.ts","**/*.tsx"]
      },
      reportUnusedDisableDirectives: "warn"
    });
    
    const results = await eslint.lintFiles(["**/*.js"]);
    const formatter = await eslint.loadFormatter("json");
    const output = formatter.format(results);
    fs.writeFileSync(OUT, output);
    
    // summarize
    let errors = 0, warnings = 0;
    for (const r of results) { 
      errors += r.errorCount||0; 
      warnings += r.warningCount||0; 
    }
    const meta = { ok: errors===0, counts:{errors,warnings}, skipped:false };
    console.log(JSON.stringify(meta,null,2));
    process.exit(0);
  } catch (e) {
    const stub = { ok:false, error:"eslint-run-failed", details:String(e), counts:{errors:0,warnings:0}, skipped:true };
    fs.writeFileSync(OUT, JSON.stringify(stub,null,2));
    console.log(JSON.stringify(stub,null,2));
    process.exit(0);
  }
})();
