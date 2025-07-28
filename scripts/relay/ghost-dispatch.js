// GHOST Relay Dispatch Fix
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const targetPath = path.resolve(__dirname, '../../.cursor-cache/CYOPS/patches');
const logFile = path.resolve(__dirname, '../../.cursor-cache/CYOPS/.logs/ghost-relay.log');

function writePatchWithRetry(filename, content, attempt = 1) {
  const fullPath = path.join(targetPath, filename);
  try {
    fs.writeFileSync(fullPath, content);
    if (!fs.existsSync(fullPath)) throw new Error('Write failed');
    fs.appendFileSync(logFile, `[✅ PATCH WRITE] ${filename} (attempt ${attempt})\n`);
    console.log(chalk.green(`[ghost] Patch written: ${filename}`));
  } catch (e) {
    fs.appendFileSync(logFile, `[❌ PATCH FAILED] ${filename} attempt ${attempt}: ${e.message}\n`);
    if (attempt < 3) {
      setTimeout(() => writePatchWithRetry(filename, content, attempt + 1), 1000 * attempt);
    } else {
      console.error(chalk.red(`[ghost] FAILED TO WRITE PATCH after 3 attempts: ${filename}`));
    }
  }
}

module.exports = { writePatchWithRetry }; 