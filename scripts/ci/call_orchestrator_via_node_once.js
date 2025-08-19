#!/usr/bin/env node
// call_orchestrator_via_node_once.js
// Usage: call_orchestrator_via_node_once.js <orchestrator_js> [args...]
const { spawnSync } = require('child_process');
const [,, script, ...rest] = process.argv;
if (!script) { console.error('Usage: call_orchestrator_via_node_once.js <orchestrator_js> [args...]'); process.exit(2); }
const out = spawnSync(process.execPath, [script, ...rest], { stdio: 'inherit' });
process.exit(out.status ?? 1);
