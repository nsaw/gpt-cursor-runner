#!/usr/bin/env node
const fs = require('fs'), path = require('path');
const out = process.argv[2];
const repo = process.argv[3] || process.cwd();
const semverPath = path.join(repo, 'node_modules', 'semver');
const res = { ok:false, exists:false, requireOk:false, error:null, files: {} };
try { res.exists = fs.existsSync(semverPath); } catch {}
const reFile = path.join(semverPath, 'internal', 're.js');
try { res.files.re = fs.existsSync(reFile) ? fs.readFileSync(reFile,'utf8').slice(0,200) : null; } catch (e) { res.files.re = String(e); }
try { require.resolve('semver'); res.requireOk = true; res.ok = true; } catch (e) { res.error = String(e); res.ok = false; }
try { fs.writeFileSync(out, JSON.stringify(res, null, 2)); } catch {}
console.log(JSON.stringify(res, null, 2));
