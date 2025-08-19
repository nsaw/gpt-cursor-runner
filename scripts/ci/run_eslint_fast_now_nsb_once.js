#!/usr/bin/env node
// DEPRECATED shim — use npx eslint to remain compatible with modern ESLint "exports"
const {spawnSync}=require('child_process');
const args=process.argv.slice(2);
const r=spawnSync('npx',['eslint',...args],{stdio:'inherit'});
// eslint-disable-next-line no-process-exit
process.exit(r.status??1);
