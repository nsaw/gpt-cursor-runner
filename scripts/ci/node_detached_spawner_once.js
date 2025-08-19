#!/usr/bin/env node
// node_detached_spawner_once.js — NB-2.0 compliant detached spawner (no shells)
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const [,, targetScript, logFile, pidFile] = process.argv;
if (!targetScript || !logFile || !pidFile) {
  console.error('Usage: node_detached_spawner_once.js <targetScript> <logFile> <pidFile>');
  process.exit(2);
}

// Ensure log directory exists
fs.mkdirSync(path.dirname(logFile), { recursive: true });
fs.mkdirSync(path.dirname(pidFile), { recursive: true });

// Spawn detached process
const child = spawn('node', [targetScript], {
  detached: true,
  stdio: ['ignore', 'pipe', 'pipe']
});

// Write PID to file
fs.writeFileSync(pidFile, child.pid.toString());

// Pipe output to log file
const logStream = fs.createWriteStream(logFile);
child.stdout.pipe(logStream);
child.stderr.pipe(logStream);

// Detach from parent
child.unref();

console.log(JSON.stringify({
  ok: true,
  pid: child.pid,
  logFile,
  pidFile,
  message: 'Process spawned detached'
}));
