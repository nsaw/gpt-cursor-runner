/* eslint-disable */
const {spawnSync}=require('child_process'); const path=require('path'), fs=require('fs');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"; const TSC=path.join(ROOT,'node_modules/typescript/bin/tsc');
const CFG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/_tsconfig.sample.json";
const r=spawnSync(process.execPath,[TSC,'-p',CFG,'--pretty','false'],{cwd:ROOT,stdio:'pipe',encoding:'utf8'});
fs.writeFileSync("/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/tsc-post.txt", (r.stdout||'')+(r.stderr||'')); process.exit(r.status??1);
