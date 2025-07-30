const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

function safeLog(message) {
  try {
    console.log(message);
  } catch (_error) {
    // Silent fail for EPIPE or other stream errors
    try {
      fs.appendFileSync('/Users/sawyer/gitSync/gpt-cursor-runner/logs/cloudflare-watchdog.log', 
        `[SAFE_LOG] ${new Date().toISOString()}: ${message}\n`);
    } catch (logError) {}
  }
}

const logPath = path.join(__dirname, '../../logs/cloudflare-watchdog.log');

function log(message) {
  const time = new Date().toISOString();
  const entry = `[${time}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, entry);
  } catch (_error) {
    safeLog(`[WATCHDOG_LOG_ERROR] ${error.message}`);
  }
  safeLog(entry.trim());
}

function checkTunnel() {
  exec('curl -s https://ghost.thoughtmarks.app/monitor', (err, stdout) => {
    const healthy = stdout.includes('Monitor') || stdout.includes('<html');
    const status = healthy ? '✅ Tunnel healthy' : '❌ Tunnel DOWN — restarting';
    log(status);
    
    if (!healthy) {
      safeLog('🔄 Restarting Cloudflare tunnel...');
      restartTunnel();
    }
  });
}

function restartTunnel() {
  safeLog('🛑 Stopping existing cloudflared processes...');
  exec('pkill -f cloudflared || true', (err) => {
    if (err) {
      safeLog(`⚠️ Error stopping cloudflared: ${err.message}`);
    }
    
    safeLog('🚀 Starting new cloudflared tunnel...');
    exec('nohup cloudflared tunnel run ghost-thoughtmarks &> ~/.cloudflared/ghost.log & disown', (err) => {
      if (err) {
        safeLog(`❌ Error starting cloudflared: ${err.message}`);
        log('❌ Tunnel restart failed');
      } else {
        safeLog('✅ Cloudflared tunnel restarted successfully');
        log('✅ Tunnel restart triggered');
      }
    });
  });
}

safeLog('🌐 Cloudflare tunnel watchdog started - monitoring every 30 seconds');

// Initial check
checkTunnel();

// Set up periodic monitoring
setInterval(checkTunnel, 30000); 