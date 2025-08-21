#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function writeB64FileOnce(filePath, base64Content) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Decode base64 content
    const decodedContent = Buffer.from(base64Content, 'base64').toString(
      'utf8',
    );

    // Write file
    fs.writeFileSync(filePath, decodedContent);

    console.log(`B64_FILE_WRITTEN:${filePath}`);
    process.exit(0);
  } catch (error) {
    console.error(`B64_FILE_WRITE_ERROR:${filePath}:${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.error(
    'Usage: node write_b64_file_once.js <filePath> <base64Content>',
  );
  process.exit(1);
}

const [filePath, base64Content] = args;
writeB64FileOnce(filePath, base64Content);
