#!/usr/bin/env node
const {execFile}=require('child_process');
const fs=require('fs');
const path=require('path');

// Parse arguments
const args = process.argv.slice(2);
let jsonOut = null;
let allowlist = [];

// Parse --json-out and --allowlist
for(let i = 0; i < args.length; i++) {
  if(args[i] === '--json-out') {
    jsonOut = args[i+1];
  }
  if(args[i] === '--allowlist') {
    allowlist = args[i+1].split(',').filter(Boolean);
  }
}

const pick = (k,def=[]) => { const a=process.argv.find(x=>x.startsWith(`--${k}=`)); return a? a.split('=')[1].split(',').filter(Boolean) : def; };
const apps = pick('apps',[]);

execFile('pm2',['jlist'],{},(err,stdout)=>{
  if(err){ 
    console.log('PM2_JLIST_ERR'); 
    if(jsonOut) {
      try {
        fs.mkdirSync(path.dirname(jsonOut), {recursive: true});
        fs.writeFileSync(jsonOut, JSON.stringify({error: 'PM2_JLIST_ERR', timestamp: new Date().toISOString()}), 'utf8');
      } catch(e) {
        console.error('PM2_HEALTH_FAIL:'+e.message);
      }
    }
    process.exit(0); 
  }
  
  let list=[]; 
  try{ 
    list=JSON.parse(stdout);
  } catch(e) {
    console.error('PM2_HEALTH_FAIL: JSON parse error - ' + e.message);
    process.exit(2);
  }
  
  // Filter by allowlist if provided
  if(allowlist.length > 0) {
    list = list.filter(p => allowlist.includes(p.name));
  }
  
  // Filter by apps if provided
  if(apps.length > 0) {
    list = list.filter(p => apps.includes(p.name));
  }
  
  const bad = list.filter(p => p.pm2_env.status !== 'online')
                  .map(p => `${p.name}:${p.pm2_env.status}`);
  
  const result = {
    timestamp: new Date().toISOString(),
    total: list.length,
    online: list.filter(p => p.pm2_env.status === 'online').length,
    offline: list.filter(p => p.pm2_env.status !== 'online').length,
    status: bad.length ? 'unhealthy' : 'healthy',
    unhealthy: bad,
    services: list.map(p => ({
      name: p.name,
      status: p.pm2_env.status,
      pm_id: p.pm_id
    }))
  };
  
  // Write JSON output if requested
  if(jsonOut) {
    try {
      fs.mkdirSync(path.dirname(jsonOut), {recursive: true});
      fs.writeFileSync(jsonOut, JSON.stringify(result, null, 2), 'utf8');
      console.log('PM2_HEALTH_JSON_WRITTEN:' + jsonOut);
    } catch(e) {
      console.error('PM2_HEALTH_FAIL:'+e.message);
      process.exit(2);
    }
  }
  
  // Console output for compatibility
  console.log(bad.length? `PM2_HEALTH_BAD:${bad.join(',')}` : 'PM2_HEALTH_OK');
  process.exit(0);
});
