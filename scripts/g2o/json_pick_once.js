#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let inputPath = null;
let jsonPath = null;
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--in' && i + 1 < args.length) {
    inputPath = args[i + 1];
  } else if (args[i] === '--path' && i + 1 < args.length) {
    jsonPath = args[i + 1];
  } else if (args[i] === '--out' && i + 1 < args.length) {
    outputPath = args[i + 1];
  }
}

if (!inputPath || !jsonPath || !outputPath) {
  console.error('Usage: node json_pick_once.js --in <json_file> --path <dot.notation> --out <json_file>');
  process.exit(1);
}

// Hard timeout: 3 seconds
const TIMEOUT_MS = 3000;
let timeoutId = null;

const timeoutPromise = new Promise((_, reject) => {
  timeoutId = setTimeout(() => {
    reject(new Error('JSON pick timeout after 3s'));
  }, TIMEOUT_MS);
});

const pickPromise = new Promise((resolve, reject) => {
  try {
    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      resolve({
        error: 'Input file not found',
        value: null,
        path: jsonPath
      });
      return;
    }

    // Read and parse JSON
    const jsonContent = fs.readFileSync(inputPath, 'utf8');
    const data = JSON.parse(jsonContent);

    // Navigate to the specified path using dot notation
    const pathParts = jsonPath.split('.');
    let current = data;
    
    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        resolve({
          error: `Path not found: ${jsonPath}`,
          value: null,
          path: jsonPath
        });
        return;
      }
    }

    resolve({
      value: current,
      path: jsonPath,
      found: true
    });
  } catch (error) {
    resolve({
      error: error.message,
      value: null,
      path: jsonPath
    });
  }
});

Promise.race([pickPromise, timeoutPromise])
  .then((result) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write result to output file
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`JSON_PICK_WRITTEN:${outputPath} (${result.found ? 'found' : 'not found'})`);
    process.exit(0);
  })
  .catch((error) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error(`JSON_PICK_ERROR:${error.message}`);
    
    const errorResult = {
      error: error.message,
      value: null,
      path: jsonPath
    };
    
    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, JSON.stringify(errorResult, null, 2));
    } catch (writeError) {
      console.error(`JSON_PICK_WRITE_ERROR:${writeError.message}`);
    }
    
    process.exit(2);
  });
