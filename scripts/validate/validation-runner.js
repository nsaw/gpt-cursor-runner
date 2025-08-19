#!/usr/bin/env node

const CommandValidator = require('./command-validator');
const { exec } = require('child_process');
const { execShell } = require('../utils/runShell');
const fs = require('fs').promises;
const path = require('path');

class ValidationRunner {
  constructor() {
    this.validator = new CommandValidator();
    this.validationResults = {
      commandValidation: null,
      runtimeValidation: null,
      complianceCheck: null,
      overallStatus: 'PENDING',
    };
  }

  async runFullValidation() {
    console.log('🚀 Starting comprehensive validation suite...\n');

    try {
      // Phase 1: Command Pattern Validation
      console.log('📋 Phase 1: Command Pattern Validation');
      this.validationResults.commandValidation =
        await this.validator.validateDirectory('./scripts');

      // Phase 2: Runtime Validation
      console.log('\n🔧 Phase 2: Runtime Validation');
      this.validationResults.runtimeValidation =
        await this.runRuntimeValidation();

      // Phase 3: Compliance Check
      console.log('\n✅ Phase 3: Compliance Check');
      this.validationResults.complianceCheck = await this.runComplianceCheck();

      // Determine overall status
      this.validationResults.overallStatus = this.determineOverallStatus();

      // Generate report
      await this.generateValidationReport();

      return this.validationResults;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      this.validationResults.overallStatus = 'FAILED';
      throw error;
    }
  }

  async runRuntimeValidation() {
    const checks = [
      {
        name: 'Ghost Runner Health',
        command: 'curl -s -m 5 http://localhost:5051/health',
      },
      {
        name: 'Patch Executor Status',
        command: 'ps aux | grep "patch-executor" | grep -v grep',
      },
      {
        name: 'Daemon Processes',
        command: 'ps aux | grep "consolidated-daemon" | grep -v grep',
      },
      {
        name: 'Monitoring Scripts',
        command: 'ps aux | grep "real-dual_monitor" | grep -v grep',
      },
    ];

    const results = { passed: 0, failed: 0, details: [] };

    for (const check of checks) {
      try {
        const result = await this.executeCheck(check);
        results.details.push(result);

        if (result.status === 'PASS') {
          results.passed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          name: check.name,
          status: 'ERROR',
          error: error.message,
        });
      }
    }

    console.log(
      `✅ Runtime checks passed: ${results.passed}/${results.passed + results.failed}`,
    );
    return results;
  }

  async executeCheck(check) {
    return execShell(check.command, { timeout: 10000 })
      .then(({ stdout }) => ({
        name: check.name,
        status: 'PASS',
        output: stdout.trim(),
      }))
      .catch((error) => ({
        name: check.name,
        status: 'FAIL',
        error: error.message,
        output: '',
      }));
  }

  async runComplianceCheck() {
    const complianceRules = [
      {
        name: 'Non-blocking patterns enforced',
        check: () => this.checkNonBlockingPatterns(),
      },
      {
        name: 'Validation gates active',
        check: () => this.checkValidationGates(),
      },
      {
        name: 'Monitoring systems active',
        check: () => this.checkMonitoringSystems(),
      },
      {
        name: 'Error handling implemented',
        check: () => this.checkErrorHandling(),
      },
    ];

    const results = { passed: 0, failed: 0, details: [] };

    for (const rule of complianceRules) {
      try {
        const result = await rule.check();
        results.details.push({
          name: rule.name,
          status: result ? 'PASS' : 'FAIL',
          details: result,
        });

        if (result) {
          results.passed++;
        } else {
          results.failed++;
        }
      } catch (error) {
        results.failed++;
        results.details.push({
          name: rule.name,
          status: 'ERROR',
          error: error.message,
        });
      }
    }

    console.log(
      `✅ Compliance checks passed: ${results.passed}/${results.passed + results.failed}`,
    );
    return results;
  }

  async checkNonBlockingPatterns() {
    // Check if critical files use non-blocking patterns
    const criticalFiles = [
      './scripts/monitor/real-dual_monitor.js',
      './scripts/patch-executor.js',
      './scripts/consolidated-daemon.js',
      './scripts/utils/expoGuard.js',
    ];

    for (const file of criticalFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        if (content.includes('execSync')) {
          return false;
        }
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  async checkValidationGates() {
    // Check if validation gates are properly configured
    const configFiles = [
      './scripts/validate/command-validator.js',
      './scripts/validate/validation-runner.js',
    ];

    for (const file of configFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  async checkMonitoringSystems() {
    // Check if monitoring systems are active
    return new Promise((resolve) => {
      exec('ps aux | grep "monitor" | grep -v grep', (error, stdout) => {
        resolve(stdout.trim().length > 0);
      });
    });
  }

  async checkErrorHandling() {
    // Check if error handling patterns are implemented
    const errorPatterns = [
      /try\s*\{/,
      /catch\s*\(/,
      /\.catch\s*\(/,
      /process\.exit\s*\(/,
    ];

    try {
      const content = await fs.readFile('./scripts/patch-executor.js', 'utf8');
      return errorPatterns.some((pattern) => pattern.test(content));
    } catch (error) {
      return false;
    }
  }

  determineOverallStatus() {
    const commandValid = this.validationResults.commandValidation?.failed === 0;
    const runtimeValid = this.validationResults.runtimeValidation?.failed === 0;
    const complianceValid =
      this.validationResults.complianceCheck?.failed === 0;

    if (commandValid && runtimeValid && complianceValid) {
      return 'PASS';
    } else if (this.validationResults.commandValidation?.failed > 0) {
      return 'FAIL';
    } else {
      return 'WARNING';
    }
  }

  async generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      overallStatus: this.validationResults.overallStatus,
      summary: {
        commandValidation: this.validationResults.commandValidation,
        runtimeValidation: this.validationResults.runtimeValidation,
        complianceCheck: this.validationResults.complianceCheck,
      },
      recommendations: this.generateRecommendations(),
    };

    const reportPath = './logs/validation-report.json';
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log(`\n📄 Validation report saved to: ${reportPath}`);
    console.log(`\n🎯 Overall Status: ${this.validationResults.overallStatus}`);

    if (this.validationResults.overallStatus === 'FAIL') {
      console.log(
        '❌ Critical issues detected. Please fix blocking patterns before proceeding.',
      );
      process.exit(1);
    } else if (this.validationResults.overallStatus === 'WARNING') {
      console.log('⚠️  Warnings detected. Review recommendations.');
    } else {
      console.log('✅ All validation checks passed!');
    }
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.validationResults.commandValidation?.failed > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Fix blocking patterns in scripts',
        files: this.validationResults.commandValidation.details
          .filter((d) => d.status === 'FAIL')
          .map((d) => d.file),
      });
    }

    if (this.validationResults.runtimeValidation?.failed > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Restart failed services',
        services: this.validationResults.runtimeValidation.details
          .filter((d) => d.status === 'FAIL')
          .map((d) => d.name),
      });
    }

    return recommendations;
  }
}

// CLI interface
if (require.main === module) {
  const runner = new ValidationRunner();
  runner.runFullValidation().catch(console.error);
}

module.exports = ValidationRunner;