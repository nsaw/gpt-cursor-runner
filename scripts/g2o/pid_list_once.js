#!/usr/bin/env node

const fs = require('fs');

function listPids(pidFilePath) {
  try {
    if (!fs.existsSync(pidFilePath)) {
      console.log('No PID file found');
      process.exit(0);
    }
        
    const pids = JSON.parse(fs.readFileSync(pidFilePath, 'utf8'));
    Object.entries(pids).forEach(([name, info]) => {
      console.log(`  ${name}: PID ${info.pid} (started: ${info.started})`);
    });
        
    process.exit(0);
  } catch (error) {
    console.error(`PID_LIST_ERROR:${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node pid_list_once.js <pidFilePath>');
  process.exit(1);
}

listPids(args[0]);
