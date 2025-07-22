// Hardened Orchestrator (backported MAIN fix) — With Restart Dampening + Ghost Relay
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const registryFile = path.join(__dirname, '../registry/process-registry.json');
const diagFile = path.join(__dirname, '../registry/orchestrator.diagnostic.json');

// Ghost relay integration - Unified paths
const PATCH_DIR = path.resolve(__dirname, '../../.cursor-cache/CYOPS/patches');
const LOG = path.resolve(__dirname, '../../.cursor-cache/CYOPS/.logs/ghost-relay.log');

// Live status endpoint
const statusPath = path.resolve(__dirname, '../../.cursor-cache/CYOPS/ghost/status.json');

const MAX_RESTARTS = 3;
const WINDOW_MS = 15000;
const processes = [
  { name: 'ghost-bridge', cmd: 'node scripts/hooks/ghost-bridge.js' },
  { name: 'patch-executor', cmd: 'node scripts/patch-executor.js' },
  { name: 'summary-monitor', cmd: 'node scripts/hooks/summary-monitor.js' },
  { name: 'realtime-monitor', cmd: 'node scripts/validate/realtime-monitor.js' },
  { name: 'heartbeat-loop', cmd: 'node scripts/watchdog/heartbeat-loop.js' }
];

const restarts = {}; // Tracks restart timestamps

function launchProcess(p) {
  if (!restarts[p.name]) restarts[p.name] = [];

  // Clean old timestamps
  restarts[p.name] = restarts[p.name].filter(ts => Date.now() - ts < WINDOW_MS);

  if (restarts[p.name].length >= MAX_RESTARTS) {
    console.log(`[⚠️  BLOCKED] ${p.name} exceeded ${MAX_RESTARTS} restarts in ${WINDOW_MS / 1000}s`);
    return;
  }

  console.log(`[⏳ LAUNCHING] ${p.name}`);
  const child = exec(p.cmd, { detached: true });
  updateRegistry(p.name, true);

  child.on('exit', () => {
    updateRegistry(p.name, false);
    restarts[p.name].push(Date.now());
    updateDiag(p.name);
    setTimeout(() => launchProcess(p), 1000);
  });
}

function updateRegistry(name, alive) {
  const reg = fs.existsSync(registryFile) ? JSON.parse(fs.readFileSync(registryFile)) : {};
  reg[name] = { alive, timestamp: new Date().toISOString() };
  fs.writeFileSync(registryFile, JSON.stringify(reg, null, 2));
  
  // Update live status endpoint
  writeStatus(reg);
}

function updateDiag(name) {
  const diag = fs.existsSync(diagFile) ? JSON.parse(fs.readFileSync(diagFile)) : {};
  diag[name] = restarts[name];
  fs.writeFileSync(diagFile, JSON.stringify(diag, null, 2));
}

// Live status endpoint writer
function writeStatus(daemonRegistry) {
  try {
    const state = {
      updatedAt: new Date().toISOString(),
      daemons: daemonRegistry,
      host: require('os').hostname(),
      uptime: process.uptime(),
      summaryHeartbeat: fs.existsSync(path.resolve(__dirname, '../../.cursor-cache/CYOPS/.heartbeat/.last-md-write.log'))
    };
    
    // Ensure directory exists
    fs.mkdirSync(path.dirname(statusPath), { recursive: true });
    fs.writeFileSync(statusPath, JSON.stringify(state, null, 2));
  } catch (e) {
    console.error(`[STATUS WRITE ERROR] ${e.message}`);
  }
}

function ghostRelay(filename, content, attempt = 1) {
  const fullPath = path.join(PATCH_DIR, filename);
  try {
    fs.writeFileSync(fullPath, content);
    if (!fs.existsSync(fullPath)) throw new Error('write failed');
    fs.appendFileSync(LOG, `[✅ ghost-relay] ${filename} written at attempt ${attempt}\n`);
  } catch (e) {
    fs.appendFileSync(LOG, `[❌ ghost-relay fail] ${filename} attempt ${attempt}: ${e.message}\n`);
    if (attempt < 3) {
      setTimeout(() => ghostRelay(filename, content, attempt + 1), attempt * 1500);
    }
  }
}

function main() {
  processes.forEach(p => launchProcess(p));
  console.log('[Orchestrator] Resilience patch applied. Processes under supervision.');
  
  // Launch viewer tunnel
  try {
    require('../tunnel/launch-viewer-tunnel');
    console.log('[Tunnel] Viewer tunnel launch initiated');
  } catch (e) {
    console.error(`[TUNNEL ERROR] ${e.message}`);
  }
  
  // Periodic status updates every 15 seconds
  setInterval(() => {
    try {
      const reg = fs.existsSync(registryFile) ? JSON.parse(fs.readFileSync(registryFile)) : {};
      writeStatus(reg);
    } catch (e) {
      console.error(`[STATUS UPDATE ERROR] ${e.message}`);
    }
  }, 15000);
}

main();

module.exports = { ghostRelay }; 