const { exec } = require("child_process");
const fs = require("fs");

function safeLog(message) {
  try {
    console.log(message);
  } catch (_error) {
    // Silent fail for EPIPE or other stream errors
    try {
      fs.appendFileSync(
        "/Users/sawyer/gitSync/gpt-cursor-runner/logs/cloudflare-tunnel.log",
        `[SAFE_LOG] ${new Date().toISOString()}: ${message}\n`,
      );
    } catch (logError) {}
  }
}

safeLog("🌐 Restarting Cloudflare tunnel...");

exec(
  "pkill -f cloudflared && nohup cloudflared tunnel run ghost-thoughtmarks > logs/tunnel-restart.log 2>&1 & disown",
  (err) => {
    if (err) {
      safeLog(`❌ Tunnel restart failed: ${err.message}`);
    } else {
      safeLog("✅ Tunnel restart triggered");
    }
  },
);
