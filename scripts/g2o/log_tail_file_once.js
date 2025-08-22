#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let filePath = null;
let bytes = 65536; // Default: 64KB
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--file' && i + 1 < args.length) {
    filePath = args[i + 1];
  } else if (args[i] === '--bytes' && i + 1 < args.length) {
    bytes = parseInt(args[i + 1], 10);
  } else if (args[i] === '--out' && i + 1 < args.length) {
    outputPath = args[i + 1];
  }
}

if (!filePath || !outputPath) {
  console.error('Usage: node log_tail_file_once.js --file <path> --bytes <number> --out <path>');
  process.exit(1);
}

// Hard timeout: 5 seconds
const TIMEOUT_MS = 5000;
let timeoutId = null;

const timeoutPromise = new Promise((_, reject) => {
  timeoutId = setTimeout(() => {
    reject(new Error('Log tail timeout after 5s'));
  }, TIMEOUT_MS);
});

const tailPromise = new Promise((resolve, reject) => {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      resolve({
        error: 'File not found',
        content: '',
        bytesRead: 0,
        fileSize: 0
      });
      return;
    }

    // Get file stats
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    
    if (fileSize === 0) {
      resolve({
        content: '',
        bytesRead: 0,
        fileSize: 0
      });
      return;
    }

    // Calculate start position (read from end)
    const startPos = Math.max(0, fileSize - bytes);
    const bytesToRead = fileSize - startPos;

    // Read file slice
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(bytesToRead);
    
    fs.readSync(fd, buffer, 0, bytesToRead, startPos);
    fs.closeSync(fd);

    const content = buffer.toString('utf8');
    
    resolve({
      content,
      bytesRead: bytesToRead,
      fileSize,
      startPos
    });
  } catch (error) {
    reject(error);
  }
});

Promise.race([tailPromise, timeoutPromise])
  .then((result) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write content to output file
    fs.writeFileSync(outputPath, result.content || '');
    console.log(`LOG_TAIL_WRITTEN:${outputPath} (${result.bytesRead || 0} bytes)`);
    process.exit(0);
  })
  .catch((error) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error(`LOG_TAIL_ERROR:${error.message}`);
    
    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, `ERROR: ${error.message}`);
    } catch (writeError) {
      console.error(`LOG_TAIL_WRITE_ERROR:${writeError.message}`);
    }
    
    process.exit(2);
  });
