#!/usr/bin/env node
/**
 * Bridge Orchestrator Wrapper
 * JavaScript wrapper for the TypeScript bridge orchestrator
 */

const { spawn } = require('child_process');
const path = require('path');

// Path to the TypeScript bridge orchestrator
const tsScript = path.join(__dirname, '..', 'src-nextgen', 'ghost', 'bridge', 'bridgeOrchestrator.ts');

// Spawn the TypeScript process
const child = spawn('npx', ['ts-node', tsScript], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..')
});

// Handle process events
child.on('error', (error) => {
  console.error('Bridge Orchestrator error:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Bridge Orchestrator exited with code ${code}`);
  process.exit(code);
});

// Handle shutdown signals
process.on('SIGINT', () => {
  console.log('Shutting down Bridge Orchestrator...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Shutting down Bridge Orchestrator...');
  child.kill('SIGTERM');
});
