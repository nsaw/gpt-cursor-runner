#!/usr/bin/env node
(function(){
  const fs=require('fs'),p=require('path');
  const Q=process.env.QUEUE||'/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
  const P1=process.env.P1DIR||'/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1';
  const name='patch-v2.0.144(P1.04.10)_monitor-no-cache-hardening.json';
  const src=p.join(Q,'.failed',name);
  const dst=p.join(P1,name);
  if(fs.existsSync(src)){
    fs.mkdirSync(P1,{recursive:true});
    fs.writeFileSync(dst,fs.readFileSync(src));
    fs.unlinkSync(src);
    console.log('RESTORED_144_TO_P1');
  } else {
    console.log('NO_FAILED_144');
  }
})();
