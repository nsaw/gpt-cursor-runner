// Fly repair utility
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.resolve(__dirname, '../../.cursor-cache/CYOPS/.logs/fly-repair.log');
const log = msg => {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] ${msg}\n`);
  } catch (e) {
    console.error(`[LOG ERROR] ${e.message}`);
  }
};

try {
  log('[INIT] Starting Fly tunnel repair...');
  execSync('flyctl apps restart ghost', { stdio: 'inherit' });
  log('[SUCCESS] Fly tunnel rebind successful');
} catch (e) {
  log(`[ERROR] Fly tunnel repair failed: ${e.message}`);
  process.exit(1);
} 