#!/usr/bin/env node

const { execSync } = require('child_process');

function restartPm2Services(onlyServices = null) {
  try {
    console.log('PM2_RESTART_STARTING');
        
    if (onlyServices) {
      const services = onlyServices.split(',');
      for (const service of services) {
        console.log(`RESTARTING_SERVICE:${service}`);
        execSync(`pm2 restart ${service} --update-env`, { stdio: 'inherit' });
      }
    } else {
      console.log('RESTARTING_ALL_SERVICES');
      execSync('pm2 restart all --update-env', { stdio: 'inherit' });
    }
        
    console.log('PM2_RESTART_COMPLETE');
    process.exit(0);
  } catch (error) {
    console.error(`PM2_RESTART_ERROR:${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let onlyServices = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--only' && i + 1 < args.length) {
    onlyServices = args[i + 1];
    i++;
  }
}

restartPm2Services(onlyServices);
