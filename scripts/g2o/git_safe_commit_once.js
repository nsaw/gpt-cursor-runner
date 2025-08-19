#!/usr/bin/env node
const fs = require('fs'); const path = require('path');
const {execFile} = require('child_process');
function pickGit(){ for (const p of ['/opt/homebrew/bin/git','/usr/local/bin/git','/usr/bin/git','git']) { try { fs.accessSync(p, fs.constants.X_OK); return p; } catch { /* ignore and try next path */ } } throw new Error('git binary not found'); }
function arg(flag){ const i=process.argv.indexOf(flag); return i>0?process.argv[i+1]:''; }
const repo = path.resolve(arg('--repo')||process.cwd());
const message = arg('--message') || 'NB2 pre-mutation snapshot';
const allowlist = (arg('--allowlist')||'').split(',').filter(Boolean);
const bypass = String(arg('--bypassPreCommit')||'false').toLowerCase()==='true';
const allowEmpty = String(arg('--allowEmpty')||'true').toLowerCase()==='true';
const git = pickGit();
function run(args,cwd){ return new Promise((res,rej) => execFile(git,args,{cwd},(e,so,se) => e?rej({e,so,se}):res({so,se}))); }
(async() => {try{
  await run(['rev-parse','--is-inside-work-tree'],repo); await run(['reset'],repo);
  for(const rel of allowlist){const ab=path.join(repo,rel); if(fs.existsSync(ab)) await run(['add','--',rel],repo);}
  const args=['commit','-m',message]; if(allowEmpty) args.push('--allow-empty'); if(bypass) args.push('--no-verify');
  await run(args,repo); let short=''; try{short=(await run(['rev-parse','--short','HEAD'],repo)).so.trim();}catch{ /* ignore if rev-parse fails */ }
  console.log(JSON.stringify({ok:true,commitHash:short,message},null,2)); process.exit(0);
}catch(err){console.log(JSON.stringify({ok:false,step:'safe-commit',error:String(err.se||err.e||err)},null,2)); process.exit(1);}})();
