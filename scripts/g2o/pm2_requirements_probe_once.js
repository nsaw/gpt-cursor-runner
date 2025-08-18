#!/usr/bin/env node
// pm2_requirements_probe_once.js: Reads pm2-health.pre.json and reports allowlist coverage.
const fs=require('fs'); const path=require('path');
const outPath = process.argv[2] || '';
const healthPath = process.argv[3] || '';
const allow = (process.argv[4]||'').split(',').filter(Boolean);
function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch{ return null; } }
const health = readJson(healthPath) || {};
const list = Array.isArray(health.list)?health.list: (Array.isArray(health.processes)?health.processes: []);
const names = new Set(list.map(p=>p.name||p.pm2_env?.name).filter(Boolean));
const missing = allow.filter(x=>!names.has(x));
const present = allow.filter(x=>names.has(x));
const zeroState = (list.length===0);
const result = { ok: missing.length===0, zeroState, allowlist: allow, present, missing, count: (list.length||0), observed: [...names] };
if (outPath) { fs.writeFileSync(outPath, JSON.stringify(result,null,2)); }
console.log(JSON.stringify(result,null,2));
