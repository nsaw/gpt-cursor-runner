/* eslint-disable */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const PRE = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-burndown-pre.json';
const POST = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-burndown-post.json';
const LOG = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/eslint-burndown-fixes.log';
const FIXABLE_RULES = new Set([
  'no-var','prefer-const','dot-notation','eqeqeq','no-extra-boolean-cast',
  'no-unused-vars','@typescript-eslint/no-unused-vars','no-const-assign','no-dupe-keys',
  'object-shorthand','prefer-template','no-useless-escape','no-debugger','no-undef',
  'no-unused-expressions','no-self-assign','no-empty','semi','quotes'
]);
const run = (args, timeoutMs=120000, jsonOut=null) => new Promise((resolve)=>{
  const outArgs = jsonOut ? ['-f','json','-o',jsonOut] : [];
  const p = spawn('npx', ['eslint', '.', '--ext', '.ts,.tsx,.js', '--no-error-on-unmatched-pattern', ...outArgs, ...args], { cwd: ROOT, stdio: outArgs.length?['ignore','ignore','inherit']:'inherit' });
  const t = setTimeout(()=>{ try{ p.kill('SIGKILL'); }catch(_){ } resolve({code:124}); }, timeoutMs);
  p.on('exit', c => { clearTimeout(t); resolve({code:c??1}); });
});
const summarize = (file) => {
  try {
    const r = JSON.parse(fs.readFileSync(file,'utf8'));
    let errors=0, warnings=0, byRule={};
    for (const f of r) {
      for (const m of (f.messages||[])) {
        if (m.severity===2) errors++; else if (m.severity===1) warnings++;
        if (m.ruleId) byRule[m.ruleId]=(byRule[m.ruleId]||0)+1;
      }
    }
    const top = Object.entries(byRule).sort((a,b)=>b[1]-a[1]).slice(0,10);
    return { errors, warnings, topRules: top.map(([rule,count])=>({rule,count})) };
  } catch { return { errors: -1, warnings: -1, topRules: [] }; }
};
(async ()=>{
  // 1) Baseline
  await run(['--max-warnings','1000000'], 90000, PRE);
  const pre = summarize(PRE);
  // 2) Target only *fixable* rules first pass (force-enable, then --fix)
  const forceRules = pre.topRules.filter(x=>FIXABLE_RULES.has(x.rule)).map(x=>['--rule',`${x.rule}:error`]).flat();
  await run(['--fix','--max-warnings','0', ...forceRules], 180000, null);
  // 3) Post snapshot
  await run(['--max-warnings','1000000'], 90000, POST);
  const post = summarize(POST);
  fs.writeFileSync(LOG, JSON.stringify({ pre, post, reducedErrors: pre.errors - post.errors, reducedWarnings: pre.warnings - post.warnings }, null, 2));
  // exit nonzero if no material improvement
  const improved = (pre.errors>0) && ((pre.errors - post.errors) / pre.errors >= 0.15);
  process.exit(improved ? 0 : 2);
})();
