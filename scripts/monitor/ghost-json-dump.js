// ghost-json-dump.js
// CLI dump to ghost-status.json for public viewer

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

try {
  // Capture the agent-formatted output from real-dual_monitor.js
  const output = execSync('node scripts/monitor/real-dual_monitor.js agent', { 
    encoding: 'utf8',
    cwd: path.join(__dirname, '../..') // Ensure we're in the project root
  });
  
  // Create the server directory if it doesn't exist
  const serverDir = path.join(__dirname, '../../server');
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }
  
  // Write the output to ghost-status.json
  const jsonPath = path.join(serverDir, 'ghost-status.json');
  const jsonData = {
    timestamp: new Date().toISOString(),
    status: 'live',
    output: output.trim(),
    source: 'real-dual_monitor.js',
    version: 'patch-v3.5.17(P13.04.08)_ghost-status-json-unifier'
  };
  
  fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  console.log('✅ ghost-status.json updated with live status');
  console.log(`📁 Written to: ${jsonPath}`);
  console.log(`📊 Output length: ${output.length} characters`);
} catch (_err) {
  console.error('❌ Failed to write ghost-status.json:', err.message);
  process.exit(1);
} 