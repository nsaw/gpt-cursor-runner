#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any, require-await, @typescript-eslint/no-unused-vars */

const fs = require('fs');

function statFileOnce(filePath, minBytes = 0) {
  try {
    if (!fs.existsSync(filePath)) {
      console.error(`FILE_NOT_FOUND:${filePath}`);
      process.exit(1); // eslint-disable-line no-process-exit
    }

    const stats = fs.statSync(filePath);

    if (stats.size < minBytes) {
      console.error(`FILE_TOO_SMALL:${filePath}:${stats.size} < ${minBytes}`);
      process.exit(1); // eslint-disable-line no-process-exit
    }

    console.log(`FILE_OK:${filePath}:${stats.size} bytes`);
    process.exit(0); // eslint-disable-line no-process-exit
  } catch (error) {
    console.error(`STAT_ERROR:${filePath}:${error.message}`);
    process.exit(1); // eslint-disable-line no-process-exit
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error(
    'Usage: node stat_file_once.js <filepath> [--min-bytes <size>]',
  );
  process.exit(1); // eslint-disable-line no-process-exit
}

const filePath = args[0];
let minBytes = 0;

// Parse --min-bytes option
for (let i = 1; i < args.length; i++) {
  if (args[i] === '--min-bytes' && i + 1 < args.length) {
    minBytes = parseInt(args[i + 1], 10);
    break;
  }
}

statFileOnce(filePath, minBytes);
