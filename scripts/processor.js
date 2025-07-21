const fs = require('fs/promises');
const writeLog = require('../utils/log');
const redis = require('../utils/redis');

module.exports = async function processPatch(filePath) {
  await fs.writeFile('.patch-lock', 'locked');
  try {
    const id = filePath.split('/').pop();
    if (await redis.get(`patch:${id}`)) {
      console.log('[CACHE] Skipped duplicate');
      return;
    }
    
    const runner = require('./runner');
    await runner(filePath);
    await redis.set(`patch:${id}`, 1, 'EX', 3600);
    await writeLog('logs/audit.log', `[${new Date().toISOString()}] Ran patch: ${filePath}`);
  } catch (e) {
    console.error('[ASYNC ERROR]', e);
    await writeLog('logs/audit.log', `[${new Date().toISOString()}] Error in patch: ${filePath} - ${e.message}`);
  } finally {
    await fs.unlink('.patch-lock');
  }
} 