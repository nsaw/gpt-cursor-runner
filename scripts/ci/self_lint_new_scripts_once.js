/* eslint-disable */
const { spawnSync } = require('child_process');
const path="/Users/sawyer/gitSync/gpt-cursor-runner";
const node=(args)=>spawnSync(process.execPath,args,{cwd:path,stdio:'inherit'});
const run=(mod,args)=>spawnSync(process.execPath,[mod,...args],{cwd:path,stdio:'inherit'});
// 1) Lint scripts/* (do not fail on warnings)
run("scripts/ci/eslint_run_local_once.js",["scripts","--ext",".js,.ts",".","--max-warnings","1000000"]);
// 2) Syntax/load check: require() the orchestrators (throws on syntax errors)
try { require("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/eslint_fix_loop_once.js"); } catch(e){ console.error("[self-lint] eslint_fix_loop_once.js load failed",e); process.exit(2); }
try { require("/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o/pm2_converge_once_v3.js"); } catch(e){ console.error("[self-lint] pm2_converge_once_v3.js load failed",e); process.exit(2); }
process.exit(0);
