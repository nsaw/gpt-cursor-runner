const fs = require('fs/promises');
const writeLog = require('../utils/log');
const redis = require('../utils/redis');
const rateLimit = new Map();

module.exports = async function processPatch(filePath) {
  // Check rate limit
  const now = Date.now();
  const lastRun = rateLimit.get('patch:cooldown') || 0;
  const cooldownMs = 10000; // 10 seconds
  
  if (now - lastRun < cooldownMs) {
    console.log('[RATE] Skipped — cooldown active');
    return;
  }
  
  // Set rate limit
  rateLimit.set('patch:cooldown', now);
  
  // Check for existing lock
  try {
    await fs.access('.patch-lock');
    console.log('[SKIP] Lock held - another patch is running');
    return;
  } catch {
    // Lock file doesn't exist, continue
  }
  
  // Check Redis cache for duplicate patch
  const id = filePath.split('/').pop();
  try {
    if (await redis.get(`patch:${id}`)) {
      console.log('[CACHE] Skipped duplicate');
      return;
    }
  } catch (error) {
    console.log('[CACHE] Redis not available, continuing without cache');
  }
  
  try {
    // Create lock file
    await fs.writeFile('.patch-lock', 'locked');
    console.log('[LOCK] Patch lock acquired');
    
    // Import and run the patch runner
    const runner = require('./runner');
    await runner(filePath);
    
    // Cache patch execution in Redis
    try {
      await redis.set(`patch:${id}`, 1, 'EX', 3600);
    } catch (error) {
      console.log('[CACHE] Failed to cache patch, continuing');
    }
    
    // Log successful patch execution
    await writeLog('logs/audit.log', `[${new Date().toISOString()}] SUCCESS: Ran patch: ${filePath}`);
    
    console.log('[LOCK] Patch completed successfully');
    
  } catch (error) {
    console.error('[ASYNC ERROR] Patch processing failed:', error.message);
    
    // Log failed patch execution
    await writeLog('logs/audit.log', `[${new Date().toISOString()}] ERROR: Failed patch: ${filePath} - ${error.message}`);
    
    throw error;
  } finally {
    // Always remove lock file
    try {
      await fs.unlink('.patch-lock');
      console.log('[LOCK] Patch lock released');
    } catch {
      // Lock file may not exist, ignore error
    }
  }
}; 