#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REPO_ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const LOGS_DIR = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs';

// Ensure logs directory exists
fs.mkdirSync(LOGS_DIR, { recursive: true });

// Get patch file from command line argument
const patchFile = process.argv[2];
if (!patchFile) {
  console.error('Usage: node direct_apply_once.js <patch-file>');
  process.exitCode = 1;
  return;
}

const patchPath = path.resolve(patchFile);
if (!fs.existsSync(patchPath)) {
  console.error(`Patch file not found: ${patchPath}`);
  process.exitCode = 1;
  return;
}

try {
  console.log(`Applying patch: ${patchPath}`);

  // Change to repo root
  process.chdir(REPO_ROOT);

  // Apply the patch
  execSync(`git apply "${patchPath}"`, { stdio: 'inherit' });

  console.log('Patch applied successfully');

  // Log the application
  const logEntry = {
    timestamp: new Date().toISOString(),
    patch: patchPath,
    status: 'applied',
    repo: REPO_ROOT,
  };

  fs.appendFileSync(
    path.join(LOGS_DIR, 'patch-applications.log'),
    `${JSON.stringify(logEntry)}\n`,
  );
} catch (error) {
  console.error('Failed to apply patch:', error.message);
  process.exitCode = 1;
}
