const fs = require('fs').promises;
const path = require('path');

class CommandValidator {
  constructor() {
    this.blockingPatterns = [
      /execSync\s*\(/,
      /\.execSync\s*\(/,
      /require\s*\(\s*['"]child_process['"]\s*\)/,
      /const\s+\{\s*execSync\s*\}\s*=\s*require\s*\(\s*['"]child_process['"]\s*\)/,
    ];

    this.nonBlockingPatterns = [
      /const\s+\{\s*exec\s*\}\s*=\s*require\s*\(\s*['"]child_process['"]\s*\)/,
      /exec\s*\(\s*[^,]+,\s*\([^)]*\)\s*=>\s*\{/,
      /new Promise\s*\(\s*\(resolve,\s*reject\)\s*=>\s*\{/,
    ];

    this.validationResults = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: [],
    };
  }

  async validateFile(filePath) {
    try {
      const _content = await fs.readFile(filePath, 'utf8');
      const _fileName = path.basename(filePath);

      const _result = {
        file: _fileName,
        path: filePath,
        blockingIssues: [],
        nonBlockingPatterns: [],
        status: 'PASS',
      };

      // Check for blocking patterns
      this.blockingPatterns.forEach((pattern, _index) => {
        const _matches = _content.match(pattern);
        if (_matches) {
          _result.blockingIssues.push({
            pattern: pattern.toString(),
            matches: _matches.length,
            lines: this.findLineNumbers(_content, pattern),
          });
        }
      });

      // Check for non-blocking patterns
      this.nonBlockingPatterns.forEach((pattern) => {
        const _matches = _content.match(pattern);
        if (_matches) {
          _result.nonBlockingPatterns.push({
            pattern: pattern.toString(),
            matches: _matches.length,
          });
        }
      });

      // Determine status
      if (_result.blockingIssues.length > 0) {
        _result.status = 'FAIL';
        this.validationResults.failed++;
      } else if (_result.nonBlockingPatterns.length > 0) {
        _result.status = 'PASS';
        this.validationResults.passed++;
      } else {
        _result.status = 'WARNING';
        this.validationResults.warnings++;
      }

      this.validationResults.details.push(_result);
      return _result;
    } catch (_error) {
      console.error(`Error validating ${filePath}:`, _error.message);
      return {
        file: path.basename(filePath),
        status: 'ERROR',
        error: _error.message,
      };
    }
  }

  findLineNumbers(_content, pattern) {
    const _lines = _content.split('\n');
    const _lineNumbers = [];

    _lines.forEach((line, _index) => {
      if (pattern.test(line)) {
        _lineNumbers.push(_index + 1);
      }
    });

    return _lineNumbers;
  }

  async validateDirectory(dirPath) {
    const _files = await this.getJavaScriptFiles(dirPath);

    console.log(
      `🔍 Validating ${_files.length} JavaScript files in ${dirPath}...`,
    );

    for (const file of _files) {
      await this.validateFile(file);
    }

    return this.getValidationSummary();
  }

  async getJavaScriptFiles(dirPath) {
    const _files = [];
    const _entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of _entries) {
      const _fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        const _subFiles = await this.getJavaScriptFiles(_fullPath);
        _files.push(..._subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        _files.push(_fullPath);
      }
    }

    return _files;
  }

  getValidationSummary() {
    return {
      total: this.validationResults.passed + this.validationResults.failed + this.validationResults.warnings,
      passed: this.validationResults.passed,
      failed: this.validationResults.failed,
      warnings: this.validationResults.warnings,
      details: this.validationResults.details,
    };
  }
}

module.exports = CommandValidator;