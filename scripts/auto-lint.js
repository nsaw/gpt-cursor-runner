#!/usr/bin/env node

/**
 * Auto-lint script for GPT-Cursor Runner
 * Automatically lints files after patches or changes
 * Can be triggered by patch watchdog or run independently
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

class AutoLinter {
  constructor() {
    this.operationUuid = require('crypto').randomUUID();
    this.startTime = Date.now();
    this.projectRoot = path.resolve(__dirname, '..');
    this.logFile = path.join(this.projectRoot, 'logs', 'auto-lint.log');
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${this.operationUuid}] ${message}`;
    console.log(logMessage);
        
    // Ensure logs directory exists
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
        
    // Append to log file
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async runLint(targetFiles = null) {
    try {
      this.log('🔍 Starting auto-lint operation');
            
      // Determine what to lint
      let lintCommand = 'npm run lint';
      if (targetFiles && targetFiles.length > 0) {
        this.log(`📁 Linting specific files: ${targetFiles.join(', ')}`);
        lintCommand = `eslint ${targetFiles.join(' ')}`;
      } else {
        this.log('📁 Linting all files');
      }
            
      // Run linting
      this.log('🚀 Executing lint command');
      const { stdout, stderr } = await execAsync(lintCommand, {
        cwd: this.projectRoot,
        timeout: 30000 // 30 second timeout
      });
            
      if (stderr && stderr.trim()) {
        this.log(`⚠️  Lint warnings: ${stderr.trim()}`);
      }
            
      if (stdout && stdout.trim()) {
        this.log(`📋 Lint output: ${stdout.trim()}`);
      }
            
      this.log('✅ Auto-lint completed successfully');
            
      return {
        success: true,
        output: stdout,
        warnings: stderr,
        duration: Date.now() - this.startTime
      };
            
    } catch (error) {
      this.log(`❌ Auto-lint failed: ${error.message}`);
            
      // Try to run with --fix flag
      try {
        this.log('🔧 Attempting auto-fix');
        const fixCommand = targetFiles && targetFiles.length > 0 
          ? `eslint ${targetFiles.join(' ')} --fix`
          : 'npm run lint:fix';
                
        const { stdout, stderr } = await execAsync(fixCommand, {
          cwd: this.projectRoot,
          timeout: 30000
        });
                
        this.log('✅ Auto-fix completed');
                
        return {
          success: true,
          fixed: true,
          output: stdout,
          warnings: stderr,
          duration: Date.now() - this.startTime
        };
                
      } catch (fixError) {
        this.log(`❌ Auto-fix also failed: ${fixError.message}`);
                
        return {
          success: false,
          error: error.message,
          fixError: fixError.message,
          duration: Date.now() - this.startTime
        };
      }
    }
  }

  async runMarkdownLint() {
    try {
      this.log('📝 Running markdown-specific lint');
            
      const { stdout, stderr } = await execAsync('npm run lint:md', {
        cwd: this.projectRoot,
        timeout: 15000
      });
            
      if (stderr && stderr.trim()) {
        this.log(`⚠️  Markdown lint warnings: ${stderr.trim()}`);
      }
            
      this.log('✅ Markdown lint completed');
            
      return {
        success: true,
        output: stdout,
        warnings: stderr,
        duration: Date.now() - this.startTime
      };
            
    } catch (error) {
      this.log(`❌ Markdown lint failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        duration: Date.now() - this.startTime
      };
    }
  }

  async getLintStats() {
    try {
      const { stdout } = await execAsync('npm run lint -- --format=json', {
        cwd: this.projectRoot,
        timeout: 10000
      });
            
      const results = JSON.parse(stdout);
      const stats = {
        totalFiles: results.length,
        totalErrors: 0,
        totalWarnings: 0,
        filesWithIssues: 0
      };
            
      results.forEach(file => {
        if (file.errorCount > 0 || file.warningCount > 0) {
          stats.filesWithIssues++;
          stats.totalErrors += file.errorCount;
          stats.totalWarnings += file.warningCount;
        }
      });
            
      return stats;
            
    } catch (error) {
      this.log(`❌ Failed to get lint stats: ${error.message}`);
      return null;
    }
  }
}

// CLI interface
async function main() {
  const linter = new AutoLinter();
    
  const args = process.argv.slice(2);
  const command = args[0];
    
  switch (command) {
  case 'lint':
    const targetFiles = args.slice(1);
    await linter.runLint(targetFiles.length > 0 ? targetFiles : null);
    break;
            
  case 'lint:md':
    await linter.runMarkdownLint();
    break;
            
  case 'stats':
    const stats = await linter.getLintStats();
    if (stats) {
      console.log('📊 Lint Statistics:');
      console.log(`   Total Files: ${stats.totalFiles}`);
      console.log(`   Files with Issues: ${stats.filesWithIssues}`);
      console.log(`   Total Errors: ${stats.totalErrors}`);
      console.log(`   Total Warnings: ${stats.totalWarnings}`);
    }
    break;
            
  default:
    console.log('Usage: node scripts/auto-lint.js <command> [files...]');
    console.log('Commands:');
    console.log('  lint [files...]  - Lint all files or specific files');
    console.log('  lint:md          - Lint markdown files only');
    console.log('  stats            - Show lint statistics');
    break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Auto-lint failed:', error);
    process.exit(1);
  });
}

module.exports = AutoLinter; 