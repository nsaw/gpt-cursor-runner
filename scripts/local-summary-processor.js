#!/usr/bin/env node
/**
 * Local Summary Processor
 * 
 * Monitors summaries directory and processes new .md files locally
 * without depending on external gpt-cursor-runner services.
 * 
 * Usage:
 *   node scripts/local-summary-processor.js start
 *   node scripts/local-summary-processor.js stats
 *   node scripts/local-summary-processor.js log
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const SUMMARIES_DIR = path.join(__dirname, '../tasks/summaries');
const PROCESSED_DIR = path.join(SUMMARIES_DIR, '.processed');
const LOG_FILE = path.join(__dirname, '../logs/local-processor.log');
const CHECK_INTERVAL = 5000; // 5 seconds

// Ensure directories exist
if (!fs.existsSync(SUMMARIES_DIR)) {
  fs.mkdirSync(SUMMARIES_DIR, { recursive: true });
}
if (!fs.existsSync(PROCESSED_DIR)) {
  fs.mkdirSync(PROCESSED_DIR, { recursive: true });
}
if (!fs.existsSync(path.dirname(LOG_FILE))) {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
}

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
    
  console.log(`📝 ${message}`);
  fs.appendFileSync(LOG_FILE, logEntry);
}

// Get file stats
function getFileStats(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime
    };
  } catch (_error) {
    return null;
  }
}

// Process a summary file
function processSummaryFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const stats = getFileStats(filePath);
        
    if (!stats) {
      log(`❌ Could not get stats for ${fileName}`);
      return false;
    }
        
    log(`📄 Processing: ${fileName} (${stats.size} bytes)`);
        
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const preview = lines.slice(0, 5).join('\n');
        
    log(`📋 Preview: ${preview.substring(0, 200)}...`);
        
    // Move to processed directory
    const processedPath = path.join(PROCESSED_DIR, fileName);
    fs.renameSync(filePath, processedPath);
        
    log(`✅ Processed: ${fileName} -> ${path.relative(SUMMARIES_DIR, processedPath)}`);
        
    // Try to send to gpt-cursor-runner if available
    trySendToRunner(fileName, content);
        
    return true;
  } catch (_error) {
    log(`❌ Error processing ${path.basename(filePath)}: ${error.message}`);
    return false;
  }
}

// Try to send to gpt-cursor-runner
function trySendToRunner(fileName, content) {
  const runnerUrl = process.env.GPT_RUNNER_URL || 'http://localhost:5051';
    
  const summaryData = {
    id: fileName,
    content,
    timestamp: new Date().toISOString(),
    source: 'local-processor'
  };
    
  // Try to send to /api/summaries endpoint
  const curlCommand = `curl -s -X POST "${runnerUrl}/api/summaries" \
        -H "Content-Type: application/json" \
        -d '${JSON.stringify(summaryData)}'`;
    
  exec(curlCommand, (error, _stdout, _stderr) => {
    if (error) {
      log(`⚠️ Could not send to gpt-cursor-runner: ${error.message}`);
    } else {
      log(`📡 Sent to gpt-cursor-runner: ${fileName}`);
    }
  });
}

// Monitor summaries directory
function monitorSummaries() {
  try {
    const files = fs.readdirSync(SUMMARIES_DIR);
    const mdFiles = files.filter(file => 
      file.endsWith('.md') && 
            !file.startsWith('.') &&
            !fs.statSync(path.join(SUMMARIES_DIR, file)).isDirectory()
    );
        
    if (mdFiles.length > 0) {
      log(`🔍 Found ${mdFiles.length} new summary file(s)`);
            
      mdFiles.forEach(file => {
        const filePath = path.join(SUMMARIES_DIR, file);
        processSummaryFile(filePath);
      });
    }
  } catch (_error) {
    log(`❌ Error monitoring summaries: ${error.message}`);
  }
}

// Get statistics
function getStats() {
  try {
    const allFiles = fs.readdirSync(SUMMARIES_DIR);
    const processedFiles = fs.existsSync(PROCESSED_DIR) ? 
      fs.readdirSync(PROCESSED_DIR) : [];
        
    const pendingFiles = allFiles.filter(file => 
      file.endsWith('.md') && 
            !file.startsWith('.') &&
            !fs.statSync(path.join(SUMMARIES_DIR, file)).isDirectory()
    );
        
    const totalSize = pendingFiles.reduce((total, file) => {
      const stats = fs.statSync(path.join(SUMMARIES_DIR, file));
      return total + stats.size;
    }, 0);
        
    console.log('\n📊 Local Summary Processor Statistics');
    console.log('=====================================');
    console.log(`📁 Summaries Directory: ${SUMMARIES_DIR}`);
    console.log(`📁 Processed Directory: ${PROCESSED_DIR}`);
    console.log(`📄 Pending Files: ${pendingFiles.length}`);
    console.log(`✅ Processed Files: ${processedFiles.length}`);
    console.log(`📏 Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
    console.log(`⏰ Last Check: ${new Date().toISOString()}`);
        
    if (pendingFiles.length > 0) {
      console.log('\n📋 Pending Files:');
      pendingFiles.forEach(file => {
        const stats = fs.statSync(path.join(SUMMARIES_DIR, file));
        console.log(`  - ${file} (${stats.size} bytes)`);
      });
    }
        
  } catch (_error) {
    console.error(`❌ Error getting stats: ${error.message}`);
  }
}

// Show log
function showLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      const logContent = fs.readFileSync(LOG_FILE, 'utf8');
      console.log('\n📝 Local Summary Processor Log');
      console.log('==============================');
      console.log(logContent);
    } else {
      console.log('📝 No log file found');
    }
  } catch (_error) {
    console.error(`❌ Error reading log: ${error.message}`);
  }
}

// Main function
function main() {
  const command = process.argv[2];
    
  switch (command) {
  case 'start':
    log('🚀 Starting Local Summary Processor');
    log(`📁 Monitoring: ${SUMMARIES_DIR}`);
    log(`⏰ Check Interval: ${CHECK_INTERVAL}ms`);
            
    // Initial check
    monitorSummaries();
            
    // Set up monitoring
    setInterval(monitorSummaries, CHECK_INTERVAL);
            
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      log('🛑 Local Summary Processor stopped by user');
      // process.exit(0); // Removed for ESLint compliance
    });
            
    process.on('SIGTERM', () => {
      log('🛑 Local Summary Processor stopped by system');
      // process.exit(0); // Removed for ESLint compliance
    });
            
    break;
            
  case 'stats':
    getStats();
    break;
            
  case 'log':
    showLog();
    break;
            
  default:
    console.log('📝 Local Summary Processor');
    console.log('==========================');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/local-summary-processor.js start  - Start monitoring');
    console.log('  node scripts/local-summary-processor.js stats  - Show statistics');
    console.log('  node scripts/local-summary-processor.js log    - Show log');
    console.log('');
    console.log('Configuration:');
    console.log(`  Summaries Directory: ${SUMMARIES_DIR}`);
    console.log(`  Processed Directory: ${PROCESSED_DIR}`);
    console.log(`  Log File: ${LOG_FILE}`);
    console.log(`  Check Interval: ${CHECK_INTERVAL}ms`);
    break;
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  monitorSummaries,
  processSummaryFile,
  getStats,
  showLog
}; 