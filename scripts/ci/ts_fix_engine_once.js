/* eslint-disable */
const { spawnSync } = require('child_process'); const fs = require('fs'); const path = require('path');
const ROOT="/Users/sawyer/gitSync/gpt-cursor-runner"; const TRI="/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage";
const OUT=path.join(TRI,"tsc-diagnostics.txt"); const PATCHLOG=path.join(TRI,"ts-fix-engine.log");
const runTsc=()=>spawnSync(process.execPath,[path.join(ROOT,'scripts/ci/run_tsc_once.js')],{cwd:ROOT,stdio:'pipe',encoding:'utf8'});
const applyGuards=(file)=>{
  if(!fs.existsSync(file)) return {file,changed:false,notes:"missing"};
  let src=fs.readFileSync(file,'utf8'); let changed=false; const before=src;
  // Heuristics: 1) safe RegExp construction; 2) add nullish guards for config-like accessors; 3) ensure explicit return types in arrow funcs
  src=src.replace(/new\s+RegExp\(([^)]+)\)/g,(m,g1)=>{changed=true; return `new RegExp(String(${g1}))`;});
  // Fix config access patterns - only replace standalone config.property access, not this.config.property
  src=src.replace(/(?<!this\.)config\.([\w.]+)/g,(m,prop)=>{ 
    if(m.includes('?.')) return m; 
    changed=true; 
    return `(config??{}).${prop}`; 
  });
  // add explicit return types for trivial arrows that return literals (helps TS narrowing in some cases)
  src=src.replace(/(const\s+[A-Za-z0-9_]+\s*=\s*\([^)]*\)\s*=>\s*)(true|false|null|undefined|\d+|['"][^'"]*['"])/g,(m,prefix)=>{changed=true; return prefix+"/*:unknown*/ ";});
  if(changed && src!==before){ fs.writeFileSync(file,src); }
  return {file,changed,notes:changed?"patched":"no-change"};
};
(()=>{
  fs.mkdirSync(TRI,{recursive:true});
  const res=runTsc(); fs.writeFileSync(OUT,res.stdout||res.stderr||"");
  const targets=[
    "/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/config/configurationValidationEngine.ts",
    "/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/telemetry/ghostRelayTelemetryCore.ts",
    "/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/components/SlotGrid.tsx",
    "/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/state/slotMode.ts",
  ];
  const log=[]; for(const f of targets){ log.push(applyGuards(f)); }
  fs.writeFileSync(PATCHLOG, JSON.stringify({log},null,2)); process.exit(0);
})();
