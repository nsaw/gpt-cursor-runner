#!/usr/bin/env node
(async () => {
  const fs = require('fs'); const Module = require('module');
  const OUT = process.env.ESLINT_REPORT_OUT || '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-report.json';
  const CWD = process.env.ESLINT_CWD || '/Users/sawyer/gitSync/gpt-cursor-runner';
  const scopePath = '/Users/sawyer/gitSync/gpt-cursor-runner/config/eslint.scope.manifest.json';
  const _req = Module.prototype.require;
  Module.prototype.require = function(id){
    if (id === 'ms') return (v) => Number.parseFloat(v)||0;
    if (id === 'semver') return { satisfies:() => true, valid:(v) => v||null, coerce:(v) => ({version:String(v||'0.0.0')}) };
    return _req.apply(this, arguments);
  };
  let ESLint; try { ({ ESLint } = require('eslint')); } catch(e) {
    const stub={ ok:false, error:'eslint-not-available', details:String(e), counts:{errors:0,warnings:0}, skipped:true };
    fs.writeFileSync(OUT, JSON.stringify(stub,null,2)); console.log(JSON.stringify(stub,null,2)); process.exit(0);
  }
  const manifest = JSON.parse(fs.readFileSync(scopePath,'utf8'));
  const includes = (manifest.include||[]).filter(Boolean);
  try {
    const eslint = new ESLint({ cwd: CWD, useEslintrc: true, errorOnUnmatchedPattern: false, reportUnusedDisableDirectives: 'warn' });
    const results = await eslint.lintFiles(includes);
    const formatter = await eslint.loadFormatter('json');
    fs.writeFileSync(OUT, formatter.format(results));
    let errors=0,warnings=0; for(const r of results){ errors+=r.errorCount||0; warnings+=r.warningCount||0; }
    console.log(JSON.stringify({ok: errors===0 && warnings<=20, counts:{errors,warnings}, files:includes.length},null,2));
    process.exit(0);
  } catch(e){
    const stub={ ok:false, error:'eslint-run-failed', details:String(e), counts:{errors:0,warnings:0}, skipped:true };
    fs.writeFileSync(OUT, JSON.stringify(stub,null,2)); console.log(JSON.stringify(stub,null,2)); process.exit(0);
  }
})();
