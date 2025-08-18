#!/usr/bin/env node
const {execFile}=require('child_process');
const pick = (k,def=[]) => { const a=process.argv.find(x=>x.startsWith(`--${k}=`)); return a? a.split('=')[1].split(',').filter(Boolean) : def; };
const apps = pick('only',[]);
const envFile = process.argv.find(x=>x.startsWith('--env='))?.split('=')[1] || '/Users/sawyer/gitSync/.cursor-cache/MAIN/validation/.env.main';

// First update environment if file exists
if(require('fs').existsSync(envFile)) {
  execFile('pm2',['reload','all','--update-env'],{},(err)=>{
    if(err) console.log('PM2_UPDATE_ENV_ERR:',err.message);
    else console.log('PM2_UPDATE_ENV_OK');
  });
}

// Then restart specific apps if specified
if(apps.length > 0) {
  execFile('pm2',['restart',...apps,'--update-env'],{},(err)=>{
    if(err) console.log('PM2_RESTART_ERR:',err.message);
    else console.log('PM2_RESTART_OK:',apps.join(','));
  });
} else {
  console.log('PM2_NO_APPS_SPECIFIED');
}
process.exit(0); // non-blocking by design
