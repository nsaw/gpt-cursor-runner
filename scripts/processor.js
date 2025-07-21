const fs = require('fs/promises');
module.exports = async function processPatch(filePath) {
  await fs.writeFile('.patch-lock', 'locked');
  try {
    const runner = require('./runner');
    await runner(filePath);
  } catch (e) {
    console.error('[ASYNC ERROR]', e);
  } finally {
    await fs.unlink('.patch-lock');
  }
} 