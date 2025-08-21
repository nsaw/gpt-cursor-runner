/* eslint-disable */
const fs = require('fs'); const path = require('path');
const QUEUE_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const WARN_MS = 15 * 60 * 1000;
function lastActivity(dir){
  try{
    const files = fs.readdirSync(dir).map(f=>path.join(dir,f));
    const times = files.map(f=>fs.statSync(f).mtimeMs).sort((a,b)=>b-a);
    return times[0]||0;
  }catch{ return 0; }
}
setInterval(()=>{
  const last = lastActivity(QUEUE_DIR); const age = Date.now()-last;
  const status = (last && age < WARN_MS) ? 'healthy' : 'stale';
  process.stdout.write(`[p0-patch-sla-watch] status=${status} ageMs=${age||-1}\n`);
}, 5000);
