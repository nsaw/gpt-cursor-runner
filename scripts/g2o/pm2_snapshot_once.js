#!/usr/bin/env node

const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--out' && i + 1 < args.length) {
    outputPath = args[i + 1];
    break;
  }
}

if (!outputPath) {
  console.error('Usage: node pm2_snapshot_once.js --out <json_path>');
  process.exit(1);
}

// Hard timeout: 7 seconds
const TIMEOUT_MS = 7000;
let timeoutId = null;

const timeoutPromise = new Promise((_, reject) => {
  timeoutId = setTimeout(() => {
    reject(new Error('PM2 snapshot timeout after 7s'));
  }, TIMEOUT_MS);
});

const snapshotPromise = new Promise((resolve, reject) => {
  pm2.connect((err) => {
    if (err) {
      reject(err);
      return;
    }

    pm2.list((err, list) => {
      if (err) {
        reject(err);
        return;
      }

      // Count by status
      const statusCounts = {};
      const nameCounts = {};
      
      list.forEach(proc => {
        statusCounts[proc.pm2_env.status] = (statusCounts[proc.pm2_env.status] || 0) + 1;
        nameCounts[proc.name] = (nameCounts[proc.name] || 0) + 1;
      });

      const result = {
        timestamp: new Date().toISOString(),
        processes: list,
        counts: {
          byStatus: statusCounts,
          byName: nameCounts,
          total: list.length
        }
      };

      resolve(result);
    });
  });
});

Promise.race([snapshotPromise, timeoutPromise])
  .then((result) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write JSON output
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`PM2_SNAPSHOT_WRITTEN:${outputPath}`);
    process.exit(0);
  })
  .catch((error) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error(`PM2_SNAPSHOT_ERROR:${error.message}`);
    
    // Write error JSON
    const errorResult = {
      timestamp: new Date().toISOString(),
      error: error.message,
      processes: [],
      counts: {
        byStatus: {},
        byName: {},
        total: 0
      }
    };
    
    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, JSON.stringify(errorResult, null, 2));
    } catch (writeError) {
      console.error(`PM2_SNAPSHOT_WRITE_ERROR:${writeError.message}`);
    }
    
    process.exit(2);
  });
