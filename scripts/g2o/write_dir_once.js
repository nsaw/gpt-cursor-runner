#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
const fs = require('fs');

function writeDirectory(dirPath) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log('DIRECTORY_CREATED');
    return true;
  } catch (error) {
    console.error('FAILED:', error.message);
    return false;
  }
}

function main() {
  const dirPath = process.argv[2];
  
  if (!dirPath) {
    console.error('NO_DIRECTORY_PATH');
    return 1;
  }
  
  const success = writeDirectory(dirPath);
  return success ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}
