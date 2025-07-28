const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class CommandValidator {
  constructor() {
    this.blockingPatterns = [
      /execSync\s*\(/,
      /\.execSync\s*\(/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /const\s+\{\s*execSync\s*\}\s*=\s*require\s*\(\s*['"]child_process['"]\s*\)/
    ];
    
    this.nonBlockingPatterns = [
      /const\s+\{\s*exec\s*\}\s*=\s*require\s*\(\s*['"]child_process['"]\s*\)/,
      /exec\s*\(\s*[^,]+,\s*\([^)]*\)\s*=>\s*\{/,
      /new Promise\s*\(\s*\(resolve,\s*reject\)\s*=>\s*\{/
    ];
    
    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  async validateFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      const result = {
        file: fileName,
        path: filePath,
        blockingIssues: [],
        nonBlockingPatterns: [],
        status: 'PASS'
      };

      // Check for blocking patterns
      this.blockingPatterns.forEach((pattern, index) => {
        const matches = content.match(pattern);
        if (matches) {
          result.blockingIssues.push({
            pattern: pattern.toString(),
            matches: matches.length,
            lines: this.findLineNumbers(content, pattern)
          });
        }
      });

      // Check for non-blocking patterns
      this.nonBlockingPatterns.forEach((pattern) => {
        const matches = content.match(pattern);
        if (matches) {
          result.nonBlockingPatterns.push({
            pattern: pattern.toString(),
            matches: matches.length
          });
        }
      });

      // Determine status
      if (result.blockingIssues.length > 0) {
        result.status = 'FAIL';
        this.validationResults.failed++;
      } else if (result.nonBlockingPatterns.length > 0) {
        result.status = 'PASS';
        this.validationResults.passed++;
      } else {
        result.status = 'WARNING';
        this.validationResults.warnings++;
      }

      this.validationResults.details.push(result);
      return result;
    } catch (error) {
      console.error(`Error validating ${filePath}:`, error.message);
      return { file: path.basename(filePath), status: 'ERROR', error: error.message };
    }
  }

  findLineNumbers(content, pattern) {
    const lines = content.split('\n');
    const lineNumbers = [];
    
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        lineNumbers.push(index + 1);
      }
    });
    
    return lineNumbers;
  }

  async validateDirectory(dirPath) {
    const files = await this.getJavaScriptFiles(dirPath);
    
    console.log(`🔍 Validating ${files.length} JavaScript files in ${dirPath}...`);
    
    for (const file of files) {
      await this.validateFile(file);
    }
    
    return this.getValidationSummary();
  }

  async getJavaScriptFiles(dirPath) {
    const files = [];
    
    async function scanDirectory(currentPath) {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.js')) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        console.error(`Error scanning directory ${currentPath}:`, error.message);
      }
    }
    
    await scanDirectory(dirPath);
    return files;
  }

  getValidationSummary() {
    const summary = {
      total: this.validationResults.passed + this.validationResults.failed + this.validationResults.warnings,
      passed: this.validationResults.passed,
      failed: this.validationResults.failed,
      warnings: this.validationResults.warnings,
      details: this.validationResults.details
    };

    console.log('\n📊 Validation Summary:');
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⚠️  Warnings: ${summary.warnings}`);
    console.log(`📁 Total Files: ${summary.total}`);

    if (summary.failed > 0) {
      console.log('\n❌ Files with blocking patterns:');
      summary.details
        .filter(detail => detail.status === 'FAIL')
        .forEach(detail => {
          console.log(`  - ${detail.file}`);
          detail.blockingIssues.forEach(issue => {
            console.log(`    Lines: ${issue.lines.join(', ')}`);
          });
        });
    }

    return summary;
  }

  async generateFixSuggestions(filePath) {
    const content = await fs.readFile(filePath, 'utf8');
    const suggestions = [];

    // Suggest fixes for execSync patterns
    if (content.includes('execSync')) {
      suggestions.push({
        type: 'execSync_replacement',
        description: 'Replace execSync with non-blocking exec pattern',
        example: `
// Before:
const { execSync } = require('child_process');
execSync(command, { stdio: 'inherit' });

// After:
const { exec } = require('child_process');
function executeCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, { stdio: 'inherit' }, (error, stdout, _stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}
await executeCommand(command);
        `
      });
    }

    return suggestions;
  }
}

module.exports = CommandValidator; 