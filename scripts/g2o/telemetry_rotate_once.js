#!/usr/bin/env node

/**
 * Telemetry Rotate Non-Blocking v1
 * Rotates telemetry/logs without blocking I/O
 * Node-only implementation with no shell dependencies
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_CONFIG = {
  plan: 'minimal',
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  backupDir: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/archive'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--plan':
        config.plan = args[++i] || 'minimal';
        break;
      case '--out':
        config.outPath = args[++i];
        break;
      case '--maxLogSize':
        config.maxLogSize = parseInt(args[++i]) || DEFAULT_CONFIG.maxLogSize;
        break;
      case '--maxLogAge':
        config.maxLogAge = parseInt(args[++i]) || DEFAULT_CONFIG.maxLogAge;
        break;
    }
  }
  
  return config;
}

function getLogFiles() {
  const logDirs = [
    '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs',
    '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs',
    '/Users/sawyer/gitSync/.cursor-cache/MAIN/logs'
  ];
  
  const logFiles = [];
  
  for (const logDir of logDirs) {
    try {
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);
        for (const file of files) {
          if (file.endsWith('.log') || file.endsWith('.txt')) {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);
            logFiles.push({
              path: filePath,
              size: stats.size,
              modified: stats.mtime,
              age: Date.now() - stats.mtime.getTime()
            });
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }
  
  return logFiles;
}

function rotateLogFile(logFile, config) {
  try {
    const needsRotation = logFile.size > config.maxLogSize || logFile.age > config.maxLogAge;
    
    if (!needsRotation) {
      return { rotated: false, reason: 'within_limits' };
    }
    
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }
    
    // Create backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(logFile.path);
    const backupPath = path.join(config.backupDir, `${fileName}.${timestamp}.bak`);
    
    // Copy file to backup
    fs.copyFileSync(logFile.path, backupPath);
    
    // Truncate original file
    fs.writeFileSync(logFile.path, '');
    
    return {
      rotated: true,
      reason: logFile.size > config.maxLogSize ? 'size_limit' : 'age_limit',
      backupPath,
      originalSize: logFile.size
    };
  } catch (error) {
    return { rotated: false, error: error.message };
  }
}

function rotateTelemetry(config) {
  const timestamp = new Date().toISOString();
  const logFiles = getLogFiles();
  
  const rotationResult = {
    timestamp,
    config,
    logFilesFound: logFiles.length,
    rotations: [],
    errors: [],
    summary: {
      totalRotated: 0,
      totalErrors: 0,
      totalSizeSaved: 0
    }
  };
  
  for (const logFile of logFiles) {
    const result = rotateLogFile(logFile, config);
    
    if (result.rotated) {
      rotationResult.rotations.push({
        file: logFile.path,
        ...result
      });
      rotationResult.summary.totalRotated++;
      rotationResult.summary.totalSizeSaved += result.originalSize;
    } else if (result.error) {
      rotationResult.errors.push({
        file: logFile.path,
        error: result.error
      });
      rotationResult.summary.totalErrors++;
    }
  }
  
  return rotationResult;
}

function main() {
  const config = parseArgs();
  
  try {
    const result = rotateTelemetry(config);
    
    // Emit result if path provided
    if (config.outPath) {
      fs.writeFileSync(config.outPath, JSON.stringify(result, null, 2));
      console.log(`TELEMETRY_ROTATE_WRITTEN:${config.outPath}`);
    }
    
    // Output summary
    console.log(`TELEMETRY_ROTATE_COMPLETE:${result.summary.totalRotated} rotated, ${result.summary.totalErrors} errors`);
    console.log(`SIZE_SAVED:${result.summary.totalSizeSaved} bytes`);
    console.log(`LOG_FILES_SCANNED:${result.logFilesFound}`);
    
    // Exit with appropriate code
    process.exit(result.summary.totalErrors === 0 ? 0 : 1);
    
  } catch (error) {
    console.error('TELEMETRY_ROTATE_ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { rotateTelemetry, getLogFiles, rotateLogFile };
