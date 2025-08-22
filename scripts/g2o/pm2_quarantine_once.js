/* eslint-disable */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const ALLOWLIST = ["dashboard", "g2o-executor", "ghost-python", "p0-queue-shape-assessor"];
const QUARANTINE = [
  "alert-engine-daemon", "autonomous-decision-daemon", "dashboard-uplink", "dual-monitor",
  "enhanced-doc-daemon", "flask-dashboard", "ghost-bridge", "ghost-relay", "ghost-runner",
  "ghost-viewer", "metrics-aggregator-daemon", "patch-executor", "summary-monitor",
  "telemetry-api", "telemetry-orchestrator"
];

(() => {
  console.log("PM2_QUARANTINE: Stopping noisy cluster services...");
  
  // Get current PM2 list
  const listResult = spawnSync('pm2', ['list'], { 
    cwd: ROOT, 
    stdio: 'pipe', 
    encoding: 'utf8' 
  });
  
  if (listResult.status !== 0) {
    console.error("Failed to get PM2 list:", listResult.stderr);
    process.exit(1);
  }
  
  // Parse the text output to find running services
  const output = listResult.stdout;
  const lines = output.split('\n');
  
  // Stop quarantine services
  let stoppedCount = 0;
  for (const service of QUARANTINE) {
    // Check if service is running by looking for it in the PM2 list
    const serviceLine = lines.find(line => line.includes(service) && line.includes('online'));
    if (serviceLine) {
      console.log(`Stopping ${service}...`);
      const stopResult = spawnSync('pm2', ['stop', service], { 
        cwd: ROOT, 
        stdio: 'pipe', 
        encoding: 'utf8' 
      });
      if (stopResult.status === 0) {
        stoppedCount++;
      } else {
        console.warn(`Failed to stop ${service}:`, stopResult.stderr);
      }
    }
  }
  
  console.log(`PM2_QUARANTINE_COMPLETE: Stopped ${stoppedCount} services`);
  console.log("Allowlist services remain online:", ALLOWLIST.join(', '));
  process.exit(0);
})();
