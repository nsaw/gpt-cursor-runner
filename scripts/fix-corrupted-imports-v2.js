#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

class ImportFixer {
  constructor() {
    this.fixedFiles = [];
    this.errors = [];
  }

  async fixFile(filePath) {
    try {
      console.log(`🔧 Fixing: ${filePath}`);
      
      const content = await fs.readFile(filePath, 'utf8');
      let fixed = content;

      // Fix corrupted import statements
      fixed = fixed.replace(/import\s*\{\s*_\{\s*_([^,]+),\s*_\{\s*([^}]+)\s*\}\s*\}\s*\}\s*from\s*'([^']+)';/g, 
        'import $1, { $2 } from \'$3\';');
      
      fixed = fixed.replace(/import\s*\{\s*_\{\s*_([^,]+),\s*_([^}]+)\s*\}\s*\}\s*from\s*'([^']+)';/g, 
        'import $1, { $2 } from \'$3\';');
      
      fixed = fixed.replace(/import\s*\{\s*_([^,]+),\s*_([^}]+)\s*\}\s*from\s*'([^']+)';/g, 
        'import { $1, $2 } from \'$3\';');
      
      fixed = fixed.replace(/import\s*_\{\s*_([^}]+)\s*\}\s*from\s*'([^']+)';/g, 
        'import $1 from \'$2\';');

      // Fix corrupted function calls
      fixed = fixed.replace(/useEffect\(_\(\)\s*=>/g, 'useEffect(() =>');
      fixed = fixed.replace(/useState\(_\(\)\s*=>/g, 'useState(() =>');
      fixed = fixed.replace(/const\s+_interval/g, 'const interval');

      if (fixed !== content) {
        await fs.writeFile(filePath, fixed);
        this.fixedFiles.push(filePath);
        console.log(`✅ Fixed: ${filePath}`);
        return true;
      } else {
        console.log(`✅ No changes needed: ${filePath}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error fixing ${filePath}:`, error);
      this.errors.push(`Error fixing ${filePath}: ${error.message}`);
      return false;
    }
  }

  async walkDirectory(dir) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.walkDirectory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          try {
            const content = await fs.readFile(fullPath, 'utf8');
            if (/import\s*\{\s*_\{|useEffect\(_\(\)|useState\(_\(\)/.test(content)) {
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files that can't be read
            console.log(`⚠️ Skipping unreadable file: ${fullPath}`);
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error scanning ${dir}:`, error);
    }
    
    return files;
  }

  async run() {
    console.log('🔧 Starting import fix process...');
    
    const searchDirs = [
      '/Users/sawyer/gitSync/gpt-cursor-runner/components',
      '/Users/sawyer/gitSync/gpt-cursor-runner/src',
      '/Users/sawyer/gitSync/gpt-cursor-runner/server'
    ];
    
    let allFiles = [];
    for (const dir of searchDirs) {
      try {
        const files = await this.walkDirectory(dir);
        allFiles.push(...files);
      } catch (error) {
        console.error(`❌ Error scanning ${dir}:`, error);
      }
    }
    
    console.log(`📋 Found ${allFiles.length} corrupted files`);
    
    for (const file of allFiles) {
      await this.fixFile(file);
    }
    
    console.log('\n📊 FIX RESULTS:');
    console.log(`✅ Files fixed: ${this.fixedFiles.length}`);
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
  const fixer = new ImportFixer();
  
  try {
    const success = await fixer.run();
    if (success) {
      console.log('\n✅ IMPORT FIX COMPLETED SUCCESSFULLY');
    } else {
      console.log('\n❌ IMPORT FIX FAILED - Check errors');
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

module.exports = ImportFixer;
