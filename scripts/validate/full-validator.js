// Ghost Full Validator — Functionality Integrity Test Suite;
const CommandValidator = require('./command-validator');

class FullValidator {
  constructor() {
    this.commandValidator = new CommandValidator();
  }

  async validateProject(projectRoot) {
    const results = {
      commandValidation: null,
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
      },
    };

    try {
      // Validate command patterns
      results.commandValidation = await this.commandValidator.validateDirectory(projectRoot);
      
      // Update summary
      results.summary = {
        total: results.commandValidation.total,
        passed: results.commandValidation.passed,
        failed: results.commandValidation.failed,
        warnings: results.commandValidation.warnings,
      };

      return results;
    } catch (error) {
      console.error('Validation failed:', error.message);
      return {
        commandValidation: null,
        summary: {
          total: 0,
          passed: 0,
          failed: 1,
          warnings: 0,
        },
        error: error.message,
      };
    }
  }
}

module.exports = FullValidator;