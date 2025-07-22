const { execSync } = require('child_process');
const fs = require('fs');
const logFile = 'logs/expo-detect.log';

function detectExpoProcesses() {
  try {
    const output = execSync("ps aux | grep -i 'expo' | grep -v grep", { encoding: 'utf8' });
    if (output && output.includes('expo')) {
      const timestamp = new Date().toISOString();
      const message = `⚠️ [${timestamp}] Expo processes detected!\n${output}\n`;
      fs.appendFileSync(logFile, message);
      console.warn('\x1b[33m', '⚠️ WARNING: Expo is running. This may break Cursor orchestration.', '\x1b[0m');
      console.warn('\x1b[31m', '🛑 BLOCKING: Expo detected in active workspace. Please terminate `expo start` and retry.', '\x1b[0m');
      process.exit(130);
    }
  } catch (err) {
    // no expo processes found, continue silently
  }
}

module.exports = { detectExpoProcesses }; 