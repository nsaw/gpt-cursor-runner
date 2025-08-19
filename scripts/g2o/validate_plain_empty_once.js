#!/usr/bin/env node
const fs=require('fs');
const Q='/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
const plain=(fs.readdirSync(Q).filter(f => f.endsWith('.json')&&!f.endsWith('.hold')));
if(plain.length){ console.log(`PLAIN_FOUND:${plain.join(',')}`); process.exit(2); }
console.log('PLAIN_EMPTY');
