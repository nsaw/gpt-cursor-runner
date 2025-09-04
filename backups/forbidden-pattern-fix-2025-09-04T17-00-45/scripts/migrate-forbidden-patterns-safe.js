#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class ForbiddenPatternMigrator {
  constructor() {
    this.backupDir = `/Users/sawyer/gitSync/gpt-cursor-runner/backups/forbidden-pattern-fix-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
    this.processedFiles = [];
    this.errors = [];
    this.testMode = true; // Start in test mode
  }

  async createBackupDir() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
      console.log(`📁 Backup directory created: ${this.backupDir}`);
    } catch (error) {
      console.error('❌ Failed to create backup directory:', error);
      throw error;
    }
  }

  async backupFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const backupPath = path.join(this.backupDir, path.relative('/Users/sawyer/gitSync/gpt-cursor-runner', filePath));
      await fs.mkdir(path.dirname(backupPath), { recursive: true });
      await fs.writeFile(backupPath, content);
      console.log(`💾 Backed up: ${filePath}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to backup ${filePath}:`, error);
      return false;
    }
  }

  migratePatterns(content) {
    let migrated = content;
    let changes = 0;

    // Pattern 1: { command & } >/dev/null 2>&1 & disown
    const pattern1 = /\{\s*([^}]+)\s*&\s*\}\s*>\s*\/dev\/null\s*2>&1\s*&\s*disown/g;
    const matches1 = migrated.match(pattern1);
    if (matches1) {
      migrated = migrated.replace(pattern1, (match, command) => {
        changes++;
        return `./scripts/nb-safe-detach.sh cmd-${changes} 30s bash -lc '${command.trim()}'`;
      });
    }

    // Pattern 2: timeout 30s command & disown
    const pattern2 = /timeout\s+(\d+[smhd]?)\s+([^&]+)\s*&\s*disown/g;
    const matches2 = migrated.match(pattern2);
    if (matches2) {
      migrated = migrated.replace(pattern2, (match, timeout, command) => {
        changes++;
        return `./scripts/nb-safe-detach.sh cmd-${changes} ${timeout} bash -lc '${command.trim()}'`;
      });
    }

    // Pattern 3: command & disown (standalone)
    const pattern3 = /^([^#\n]+)\s*&\s*disown$/gm;
    const matches3 = migrated.match(pattern3);
    if (matches3) {
      migrated = migrated.replace(pattern3, (match, command) => {
        if (!command.includes('nb-safe-detach') && !command.includes('echo') && !command.includes('#')) {
          changes++;
          return `./scripts/nb-safe-detach.sh cmd-${changes} 30s bash -lc '${command.trim()}'`;
        }
        return match;
      });
    }

    return { migrated, changes };
  }

  async processFile(filePath) {
    try {
      console.log(`🔍 Processing: ${filePath}`);
      
      // Backup first
      const backupSuccess = await this.backupFile(filePath);
      if (!backupSuccess) {
        this.errors.push(`Failed to backup: ${filePath}`);
        return false;
      }

      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      
      // Check if file has forbidden patterns
      const hasForbidden = /disown|{\s*[^}]*&\s*}/.test(content);
      if (!hasForbidden) {
        console.log(`✅ No forbidden patterns found: ${filePath}`);
        return true;
      }

      // Migrate patterns
      const { migrated, changes } = this.migratePatterns(content);
      
      if (changes === 0) {
        console.log(`✅ No changes needed: ${filePath}`);
        return true;
      }

      if (this.testMode) {
        console.log(`🧪 TEST MODE - Would make ${changes} changes to: ${filePath}`);
        console.log(`📝 Sample changes:`);
        const lines = migrated.split('\n');
        const changedLines = lines.filter((line, i) => line !== content.split('\n')[i]);
        changedLines.slice(0, 3).forEach(line => console.log(`   ${line}`));
        if (changedLines.length > 3) {
          console.log(`   ... and ${changedLines.length - 3} more changes`);
        }
        return true;
      }

      // Write migrated content
      await fs.writeFile(filePath, migrated);
      console.log(`✅ Migrated ${changes} patterns in: ${filePath}`);
      
      this.processedFiles.push({ file: filePath, changes });
      return true;

    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error);
      this.errors.push(`Error processing ${filePath}: ${error.message}`);
      return false;
    }
  }

  async findFilesWithForbiddenPatterns() {
    const files = [];
    const searchDirs = [
      '/Users/sawyer/gitSync/gpt-cursor-runner/scripts',
      '/Users/sawyer/gitSync/gpt-cursor-runner/core'
    ];

    for (const dir of searchDirs) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isFile() && (entry.name.endsWith('.sh') || entry.name.endsWith('.js'))) {
            const filePath = path.join(dir, entry.name);
            const content = await fs.readFile(filePath, 'utf8');
            if (/disown|{\s*[^}]*&\s*}/.test(content)) {
              files.push(filePath);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error scanning ${dir}:`, error);
      }
    }

    return files;
  }

  async runTest() {
    console.log('🧪 Running in TEST MODE - no files will be modified');
    await this.createBackupDir();
    
    const files = await this.findFilesWithForbiddenPatterns();
    console.log(`📋 Found ${files.length} files with forbidden patterns`);
    
    // Process first 3 files as test
    const testFiles = files.slice(0, 3);
    console.log(`🔬 Testing on ${testFiles.length} files:`);
    
    for (const file of testFiles) {
      await this.processFile(file);
    }
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`✅ Files processed: ${testFiles.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }
    
    return this.errors.length === 0;
  }

  async runProduction() {
    console.log('🚀 Running in PRODUCTION MODE - files will be modified');
    this.testMode = false;
    
    const files = await this.findFilesWithForbiddenPatterns();
    console.log(`📋 Found ${files.length} files with forbidden patterns`);
    
    for (const file of files) {
      await this.processFile(file);
    }
    
    console.log('\n📊 PRODUCTION RESULTS:');
    console.log(`✅ Files processed: ${this.processedFiles.length}`);
    console.log(`❌ Errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.errors.forEach(error => console.log(`   ${error}`));
    }
    
    return this.errors.length === 0;
  }
}

// Main execution
async function main() {
  const migrator = new ForbiddenPatternMigrator();
  
  const args = process.argv.slice(2);
  const mode = args[0] || 'test';
  
  try {
    if (mode === 'test') {
      const success = await migrator.runTest();
      if (success) {
        console.log('\n✅ TEST PASSED - Ready for production migration');
        console.log('💡 Run with "production" argument to apply changes');
      } else {
        console.log('\n❌ TEST FAILED - Fix errors before production migration');
        process.exit(1);
      }
    } else if (mode === 'production') {
      const success = await migrator.runProduction();
      if (success) {
        console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY');
      } else {
        console.log('\n❌ MIGRATION FAILED - Check errors and restore from backup if needed');
        process.exit(1);
      }
    } else {
      console.log('Usage: node migrate-forbidden-patterns-safe.js [test|production]');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = ForbiddenPatternMigrator;
