// Ghost Shell Self-Audit Daemon
import { exec } from 'child_process';
import http from 'http';
import fs from 'fs';

function checkMonitor() {
  return new Promise(res => {
    http.get('http://localhost:8787/monitor', r => res(r.statusCode === 200)).on('error', () => res(false));
  });
}

function checkSummaryWrite() {
  const file = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/.last-md-write.log';
  if (!fs.existsSync(file)) return false;
  const mtime = fs.statSync(file).mtimeMs;
  const age = Date.now() - mtime;
  return age < 120000; // under 2 minutes
}

export function startSelfCheckLoop() {
  console.log('[SelfCheck] Starting ghost shell health monitor...');
  setInterval(async () => {
    const monitorOK = await checkMonitor();
    const summaryOK = checkSummaryWrite();
    if (!monitorOK || !summaryOK) {
      console.warn('[SelfCheck] Subsystem failure detected — restarting shell');
      exec('node scripts/restart-ghost-shell.js');
    } else {
      console.log('[SelfCheck] ✅ All systems healthy');
    }
  }, 60000);
} 