#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function writeTextFileOnce(filePath, content) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(filePath, content);

    console.log(`TEXT_FILE_WRITTEN:${filePath}`);
    process.exit(0);
  } catch (error) {
    console.error(`TEXT_FILE_WRITE_ERROR:${filePath}:${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error('Usage: node write_text_file_once.js <filePath> <content>');
  process.exit(1);
}

writeTextFileOnce(args[0], args[1]);
