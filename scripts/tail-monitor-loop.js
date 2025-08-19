const fs = require('fs');
const { exec } = require('child_process');

function safeLog(message) {
  try {
    console.log(message);
  } catch (error) {
    // Silent fail for EPIPE or other stream errors
    try {
      fs.appendFileSync(
        '/Users/sawyer/gitSync/gpt-cursor-runner/logs/tail-monitor.log',
        `[SAFE_LOG] ${new Date().toISOString()}: ${message}\n`,
      );
    } catch (logError) {}
  }
}

safeLog('📡 Starting tail monitor loop...');

// Start summary trace autofill in background
exec(
  'nohup node scripts/hooks/summary-trace-autofill.js &> logs/summary-trace.log & disown',
  (err) => {
    if (err) {
      safeLog(`❌ Failed to start summary trace autofill: ${err.message}`);
    } else {
      safeLog('✅ Summary trace autofill started');
    }
  },
);

// Start patch executor loop in background
exec(
  'nohup node scripts/patch-executor-loop.js &> logs/patch-executor-loop.log & disown',
  (err) => {
    if (err) {
      safeLog(`❌ Failed to start patch executor loop: ${err.message}`);
    } else {
      safeLog('✅ Patch executor loop started');
    }
  },
);

safeLog('✅ Tail monitor loop initialization complete');