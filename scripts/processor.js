const fs = require('fs/promises');
const writeLog = require('../utils/log');

module.exports = async function processPatch(filePath) {
  await fs.writeFile('.patch-lock', 'locked');
  try {
    const runner = require('./runner');
    await runner(filePath);
    await writeLog('logs/audit.log', `[${new Date().toISOString()}] Ran patch: ${filePath}`);
  } catch (e) {
    console.error('[ASYNC ERROR]', e);
    await writeLog('logs/audit.log', `[${new Date().toISOString()}] Error in patch: ${filePath} - ${e.message}`);
  } finally {
    await fs.unlink('.patch-lock');
  }
} 