#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
// pm2_requirements_probe_from_manifest.js
// Reads pm2-health.pre.json and config/pm2.allowlist.json to report present/missing + phase/required flags.
const fs = require('fs'), path = require('path');
const outPath = process.argv[2], healthPath = process.argv[3], manifestPath = process.argv[4];
function readJson(p){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch{return null;} }
const health = readJson(healthPath)||{};
const manifest = readJson(manifestPath)||{services:[]};
const list = Array.isArray(health.list)?health.list:(Array.isArray(health.processes)?health.processes:[]);
const running = new Set(list.map(p => p.name||p.pm2_env?.name).filter(Boolean));
const report = manifest.services.map(s => ({
  name: s.name, required: !!s.required, phase: s.phase||'', desc: s.desc||'',
  present: running.has(s.name)
}));
const missingRequired = report.filter(r => r.required && !r.present).map(r => r.name);
const zeroState = (list.length===0);
const result = {
  ok: missingRequired.length===0,
  zeroState,
  observedCount: list.length||0,
  present: report.filter(r => r.present).map(r => r.name),
  missing: report.filter(r => !r.present).map(r => r.name),
  missingRequired,
  detailed: report
};
if (outPath) fs.writeFileSync(outPath, JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
