// marathon_kill_if_stale_once.js — no shebang
const fs=require('fs'); const [,, stateFile]=process.argv;
try{
  const s=JSON.parse(fs.readFileSync(stateFile,'utf8')); if(!s||!s.pid) process.exit(0);
  if(s.ok===true || s.status==='green') process.exit(0);
  try{ process.kill(s.pid,0); }catch{ process.exit(0); } // not running
  try{ process.kill(s.pid,'SIGTERM'); }catch{ /* process already terminated */ }
}catch{ /* state file not found or invalid - ignore */ }
