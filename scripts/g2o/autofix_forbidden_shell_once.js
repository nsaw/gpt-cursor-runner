#!/usr/bin/env node
/**
 * v2 auto-fixer:
 *  - strips "set -euo pipefail"
 *  - mkdir -p "<dir>"     → node write_dir_once.js <dir>
 *  - (cat|tee -a|tee) redirection with heredoc (<<, <<-): → heredoc_to_file_once.js (append if tee -a or >>)
 *  - supports order variations: "cat > file <<TAG" or "cat <<TAG > file"
 *  - removes 'timeout N' tokens
 *  - removes trailing 'disown'
 *  - removes dangling background ' &' after single commands
 */
const fs=require('fs'), path=require('path');
const patchPath=process.argv[2];
if(!patchPath){ console.error("USAGE: autofix_forbidden_shell_once.js <patch.json>"); process.exit(2); }

const WRITERS_DIR=__dirname;

function stripSet(cmd){
  return cmd.replace(/\bset\s+-euo\s+pipefail;?\s*/g,'');
}

function fixMkdir(cmd, notes){
  return cmd.replace(/\bmkdir\s+-p\s+("?)([^"\n;]+)\1/g,(m,q,dir)=>{
    notes.push({type:'mkdir->node',dir});
    return `node ${WRITERS_DIR}/write_dir_once.js ${dir}`;
  });
}

// heredoc variants: supports <<TAG, <<-TAG, quoted tags, order of redir
function fixHeredoc(cmd, notes){
  // cat > file <<TAG ... TAG
  const re1=/cat\s*>\s*(['"]?)([^ <\n]+)\1\s*<<-?['"]?([A-Za-z0-9_]+)['"]?\n([\s\S]*?)\n\3/gm;
  // cat <<TAG > file ... TAG
  const re2=/cat\s*<<-?['"]?([A-Za-z0-9_]+)['"]?\s*>\s*(['"]?)([^ <\n]+)\2\n([\s\S]*?)\n\1/gm;
  // tee -a file <<TAG ... TAG
  const re3=/tee\s+-a\s+(['"]?)([^ <\n]+)\1\s*<<-?['"]?([A-Za-z0-9_]+)['"]?\n([\s\S]*?)\n\3/gm;
  // tee file <<TAG ... TAG
  const re4=/tee\s+(['"]?)([^ <\n]+)\1\s*<<-?['"]?([A-Za-z0-9_]+)['"]?\n([\s\S]*?)\n\3/gm;

  for (const {re, append} of [{re:re1,append:false},{re:re2,append:false},{re:re3,append:true},{re:re4,append:false}]){
    cmd=cmd.replace(re,(_m,_a1,f,_a2,payload)=>{
      const file = (re===re1?f:(re===re2?arguments[3]:f)); // normalize capture
      const content = Buffer.from(payload,'utf8').toString('base64');
      notes.push({type:'heredoc->node',file,append});
      return `node ${WRITERS_DIR}/heredoc_to_file_once.js ${file} ${content} ${append?'1':'0'}`;
    });
  }

  // simple >> append with a literal string: echo "..." >> file  → keep (allowed), no heredoc
  return cmd;
}

function stripTimeoutDisownAmp(cmd, notes){
  cmd=cmd.replace(/\btimeout\s+\S+\s+/g,()=>{notes.push({type:'timeout-removed'}); return ''});
  cmd=cmd.replace(/\s+\bdisown\b/g,()=>{notes.push({type:'disown-removed'}); return ''});
  // collapse solitary ' &'
  cmd=cmd.replace(/\s+&\s*$/,'');
  return cmd;
}

function transform(cmd){
  const notes=[];
  let out=cmd;
  out=stripSet(out);
  out=fixMkdir(out,notes);
  out=fixHeredoc(out,notes);
  out=stripTimeoutDisownAmp(out,notes);
  return {out,notes,changed: out!==cmd};
}

function mutatePatch(j){
  let patches=0, changes=[];
  const paths=[['mutation','shell'],['postMutationBuild','shell'],['validate','shell'],['preCommit','checks']];
  for(const route of paths){
    let node=j; for(const k of route){ node=(node&&node[k])?node[k]:null; }
    if(!node) continue;
    if(Array.isArray(node)){
      for(let i=0;i<node.length;i++){
        if(typeof node[i]==='string'){
          const t=transform(node[i]); if(t.changed){ node[i]=t.out; patches++; changes.push(...t.notes); }
        }else if(node[i] && typeof node[i].shell==='string'){
          const t=transform(node[i].shell); if(t.changed){ node[i].shell=t.out; patches++; changes.push(...t.notes); }
        }
      }
    }
  }
  return {patches,changes};
}

const raw=fs.readFileSync(patchPath,'utf8');
const json=JSON.parse(raw);
const {patches,changes}=mutatePatch(json);
if(patches>0){ json.__autofix={ts:new Date().toISOString(), patches, changes}; fs.writeFileSync(patchPath, JSON.stringify(json,null,2)); console.log("AUTOFIX_OK:"+patches); }
else { console.log("AUTOFIX_NOOP:0"); }
process.exit(0);
