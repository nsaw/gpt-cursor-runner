#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function restoreFromFailedOnce(patchName) {
  try {
    const failedDir =
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed';
    const targetDir =
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1';

    // Ensure target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const failedPath = path.join(failedDir, patchName);
    const targetPath = path.join(targetDir, patchName);

    // Check if patch exists in failed directory
    if (!fs.existsSync(failedPath)) {
      console.log(`PATCH_NOT_IN_FAILED:${patchName}`);
      process.exit(0); // Not an error if not found
    }

    // Copy from failed to target
    fs.copyFileSync(failedPath, targetPath);

    console.log(`PATCH_RESTORED:${patchName}`);
    process.exit(0);
  } catch (error) {
    console.error(`RESTORE_ERROR:${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node restore_from_failed_once.js <patch-name>');
  process.exit(1);
}

restoreFromFailedOnce(args[0]);
