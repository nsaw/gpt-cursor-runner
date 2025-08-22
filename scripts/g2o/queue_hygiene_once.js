#!/usr/bin/env node

/**
 * Queue Hygiene Once
 * Cleans stale and corrupt queue entries
 * Node-only implementation with no shell dependencies
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_CONFIG = {
  mode: 'dry-run',
  olderThanMin: 90,
  max: 25,
  queueDir: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--mode':
        config.mode = args[++i] || 'dry-run';
        break;
      case '--olderThanMin':
        config.olderThanMin = parseInt(args[++i]) || DEFAULT_CONFIG.olderThanMin;
        break;
      case '--max':
        config.max = parseInt(args[++i]) || DEFAULT_CONFIG.max;
        break;
      case '--out':
        config.outPath = args[++i];
        break;
    }
  }
  
  return config;
}

function getQueueFiles(config) {
  try {
    const files = fs.readdirSync(config.queueDir);
    const queueFiles = [];
    
    for (const file of files) {
      if (file.endsWith('.json') && file.startsWith('patch-')) {
        const filePath = path.join(config.queueDir, file);
        const stats = fs.statSync(filePath);
        const ageMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
        
        queueFiles.push({
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime,
          ageMinutes: ageMinutes,
          isStale: ageMinutes > config.olderThanMin,
          isCorrupt: stats.size < 50 // Very small files likely corrupt
        });
      }
    }
    
    return queueFiles;
  } catch (error) {
    return [];
  }
}

function validateJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return { valid: true, error: null };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

function performQueueHygiene(config) {
  const timestamp = new Date().toISOString();
  const queueFiles = getQueueFiles(config);
  
  const hygieneResult = {
    timestamp,
    config,
    queueFilesFound: queueFiles.length,
    staleFiles: queueFiles.filter(f => f.isStale),
    corruptFiles: [],
    actions: [],
    summary: {
      totalProcessed: 0,
      totalRemoved: 0,
      totalErrors: 0
    }
  };
  
  // Validate JSON files
  for (const file of queueFiles) {
    const validation = validateJsonFile(file.path);
    if (!validation.valid) {
      file.isCorrupt = true;
      hygieneResult.corruptFiles.push({
        name: file.name,
        error: validation.error
      });
    }
  }
  
  // Identify files to remove
  const filesToRemove = queueFiles.filter(f => f.isStale || f.isCorrupt).slice(0, config.max);
  
  hygieneResult.actions = filesToRemove.map(file => ({
    name: file.name,
    reason: file.isStale ? 'stale' : 'corrupt',
    ageMinutes: file.ageMinutes,
    size: file.size
  }));
  
  hygieneResult.summary.totalProcessed = queueFiles.length;
  hygieneResult.summary.totalRemoved = filesToRemove.length;
  
  // Apply actions if not dry-run
  if (config.mode === 'apply') {
    for (const file of filesToRemove) {
      try {
        fs.unlinkSync(file.path);
        hygieneResult.summary.totalRemoved++;
      } catch (error) {
        hygieneResult.summary.totalErrors++;
      }
    }
  }
  
  return hygieneResult;
}

function main() {
  const config = parseArgs();
  
  try {
    const result = performQueueHygiene(config);
    
    // Emit result if path provided
    if (config.outPath) {
      fs.writeFileSync(config.outPath, JSON.stringify(result, null, 2));
      console.log(`QUEUE_HYGIENE_WRITTEN:${config.outPath}`);
    }
    
    // Output summary
    console.log(`QUEUE_HYGIENE_${config.mode.toUpperCase()}:${result.summary.totalProcessed} processed, ${result.summary.totalRemoved} removed, ${result.summary.totalErrors} errors`);
    console.log(`STALE_FILES:${result.staleFiles.length}`);
    console.log(`CORRUPT_FILES:${result.corruptFiles.length}`);
    console.log(`ACTIONS_PLANNED:${result.actions.length}`);
    
    // Exit with appropriate code
    process.exit(result.summary.totalErrors === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('QUEUE_HYGIENE_ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { performQueueHygiene, getQueueFiles, validateJsonFile };
