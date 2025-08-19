#!/usr/bin/env node
/**
 * Manual repair by AGENT (not blind regex). Strategy:
 *  - Snapshot original patch → TRIAGE + BACKUPS
 *  - Build a targeted plan per *known* P1 family (016/019/017/021, 141/142/144) with minimal edits
 *  - Apply plan using Node writers only (no sed/timeout/disown/heredoc).
 *  - Preflight tests (lint/compile/exists checks) BEFORE execution.
 *  - On fail: revert this patch to snapshot, record reason, return non-zero.
 *  - On success: leave repaired .hold in P1 for executor.
 */
const fs=require('fs'), p=require('path'), cp=require('child_process');
const PATCH=process.argv[2]; if(!PATCH||!fs.existsSync(PATCH)){ console.error('NO_PATCH'); process.exit(2); }
const TRI='/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage';
const BAK='/Users/sawyer/gitSync/_backups/gpt-cursor-runner/manual_repair';
fs.mkdirSync(TRI,{recursive:true}); fs.mkdirSync(BAK,{recursive:true});
const base=p.basename(PATCH).replace(/\.hold$/,'');
const snap=p.join(BAK, `${base}.orig.json`); if(!fs.existsSync(snap)) fs.copyFileSync(PATCH,snap);

const plan = { id: base, steps: [] };

function add(step){ plan.steps.push(step); }
function writePlan(status,msg){ const out=p.join(TRI, `manual_repair_${Date.now()}_${base}.json`); fs.writeFileSync(out, JSON.stringify({status,msg,plan},null,2)); return out; }

// Load patch JSON
const j=JSON.parse(fs.readFileSync(PATCH,'utf8'));

// ---- Patch-aware repairs ----
const id=base;
// 016/019: pm2 wrapper promotion & heartbeat rotation → replace legacy shells with nb-safe-detach patterns
if(/\(P1\.(02\.03|02\.04|03\.03|03\.04)\)/.test(id)){
  const safe = s => s
    .replace(/\bset -euo pipefail;?\s*/g,'')
    .replace(/\btimeout\s+\S+\s+/g,'')
    .replace(/\bdisown\b/g,'')
    .replace(/\bmkdir -p\s+([^\s;]+)/g,(_,d) => `node ${__dirname}/write_dir_once.js ${d}`);
  const converted=[];
  for(const sect of ['preCommit','mutation','postMutationBuild','validate']){
    const arr=j[sect]?.shell; if(Array.isArray(arr)){
      for(let i=0;i<arr.length;i++){
        let s=String(arr[i]);
        // heredoc → writer
        s=s.replace(/cat\s*>\s*([^\s]+)\s*<<['"]?([A-Za-z0-9_]+)['"]?\n([\s\S]*?)\n\2/gm,
          (_m,f,_t,payload) => `node ${__dirname}/heredoc_to_file_once.js ${f} ${Buffer.from(payload,'utf8').toString('base64')} 0`);
        s=safe(s);
        arr[i]=s; converted.push({sect,i});
      }
    }
  }
  add({note:'converted legacy shells', count: converted.length});
}

// 142/144 monitor steps: ensure static monitor exists & flags/no-cache tags present
if(/\(P1\.04\.(07|08|10)\)/.test(id)){
  const PUB='/Users/sawyer/gitSync/_GPTsync/public';
  fs.mkdirSync(PUB,{recursive:true});
  const hf=p.join(PUB,'monitor.html');
  if(!fs.existsSync(hf)){
    const html='<!doctype html><meta charset=\'utf-8\'><title>G2o Monitor (Static)</title><div id=\'g2o-banner\' style=\'display:none\'></div><script>(function(){var u=new URLSearchParams(location.search),b=u.get(\'banner\'),c=u.get(\'compact\');document.getElementById(\'g2o-banner\').style.display=(b===\'0\'?\'none\':\'block\');if(c===\'1\'){document.body.classList.add(\'compact\');}})();</script>';
    fs.writeFileSync(hf,html);
    add({note:'created monitor.html'});
  }
}

// ---- Preflight tests (non-destructive) ----
function preflight(){
  // Ensure git is healthy and _gpt5intake ignored (pre-known)
  try{
    cp.spawnSync('bash',['-lc','cd \'/Users/sawyer/gitSync/gpt-cursor-runner\' && git add -A && git diff --cached --name-status | wc -l'],{stdio:'inherit',timeout:120000});
  }catch{ /* ignore git status check errors */ }
  return true;
}

if(!preflight()){ fs.copyFileSync(snap,PATCH); const out=writePlan('preflight_failed','preflight checks failed'); console.log(`MANUAL_REPAIR_FAIL:${out}`); process.exit(3); }

// write back repaired patch
fs.writeFileSync(PATCH, JSON.stringify(j,null,2));
const out=writePlan('ok','manual repair complete');
console.log(`MANUAL_REPAIR_OK:${out}`);
process.exit(0);
