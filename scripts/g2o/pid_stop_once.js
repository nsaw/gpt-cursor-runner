#!/usr/bin/env node

const fs = require('fs');

function stopPids(pidFilePath) {
  try {
    if (!fs.existsSync(pidFilePath)) {
      console.log('No PID file found');
      process.exit(0);
    }

    const pids = JSON.parse(fs.readFileSync(pidFilePath, 'utf8'));
    Object.entries(pids).forEach(([name, info]) => {
      try {
        process.kill(info.pid, 'SIGTERM');
        console.log(`Stopped ${name} (PID ${info.pid})`);
      } catch (e) {
        console.log(`Failed to stop ${name}: ${e.message}`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error(`PID_STOP_ERROR:${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node pid_stop_once.js <pidFilePath>');
  process.exit(1);
}

stopPids(args[0]);
