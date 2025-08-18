#!/usr/bin/env node
const fs=require('fs'), p=require('path');
const L='/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs';
const Q='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const P1=p.join(Q,'G2o/P1');
const list=d=>{try{return fs.readdirSync(d)}catch{ return [] }};
const plain=list(Q).filter(f=>f.endsWith('.json')&&!f.endsWith('.hold'));
const p1=list(P1).filter(f=>/^patch-v.+\.json(\.hold)?$/.test(f));
fs.mkdirSync(L,{recursive:true});
const msg=['UP-TO-SPEED','- runner_state: g2o-direct-ready','- executor_pickup_health: n/a (direct)','- counts: plain='+plain.length+', p1_candidates='+p1.length].join('\n');
fs.appendFileSync(p.join(L,'patch-events.log'),'[ACK] '+msg+'\n');
console.log(msg);
