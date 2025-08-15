#!/usr/bin/env node
/**
 * Enhanced Patch Validation Pipeline
 * Comprehensive validation system with TypeScript, ESLint, runtime, and performance checks
 * Provides detailed validation reports and error categorization
 */

const { exec } = require("child_process");
const { execShell } = require("./utils/runShell");
const fs = require("fs/promises");
const path = require("path");
const { EventEmitter } = require("events");

class EnhancedPatchValidator extends EventEmitter {
  constructor(options = {}) {
    super();

    this.validationTimeout = options.timeout || 120000; // 2 minutes
    this.maxWarnings = options.maxWarnings || 0;
    this.performanceThreshold = options.performanceThreshold || 5000; // 5 seconds

    // Validation configuration
    this.validations = {
      typescript: {
        enabled: true,
        command: "npx tsc --noEmit",
        timeout: 30000,
      },
      eslint: {
        enabled: true,
        command: "npx eslint . --ext .ts,.tsx --max-warnings=0",
        timeout: 30000,
      },
      runtime: {
        enabled: true,
        command: "bash scripts/validate-runtime.sh",
        timeout: 60000,
      },
      performance: {
        enabled: false,
        command: "bash scripts/validate-performance.sh",
        timeout: 60000,
      },
      roles: {
        enabled: true,
        command: "bash scripts/validate-roles.sh",
        timeout: 30000,
      },
      components: {
        enabled: true,
        command: "bash scripts/validate-components.sh",
        timeout: 30000,
      },
    };

    // Error categorization
    this.errorCategories = {
      critical: ["compilation_error", "syntax_error", "type_error"],
      warning: ["lint_warning", "style_violation", "unused_variable"],
      performance: ["slow_execution", "memory_leak", "cpu_usage"],
      runtime: ["runtime_error", "file_not_found", "permission_error"],
    };
  }

  /**
   * Run complete validation pipeline
   * @param {Object} patchData - Patch data to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation results
   */
  async validatePatch(patchData, options = {}) {
    const startTime = Date.now();
    const results = {
      patchId: patchData.id,
      timestamp: new Date().toISOString(),
      duration: 0,
      overall: "PASS",
      validations: {},
      errors: [],
      warnings: [],
      recommendations: [],
    };

    try {
      console.log(
        `🧪 [VALIDATOR] Starting validation for patch: ${patchData.id}`,
      );

      // Run each validation step
      for (const [validationName, config] of Object.entries(this.validations)) {
        if (
          config.enabled &&
          (!options.skipValidations ||
            !options.skipValidations.includes(validationName))
        ) {
          console.log(`🔍 [VALIDATOR] Running ${validationName} validation...`);

          const validationResult = await this.runValidation(
            validationName,
            config,
            patchData,
          );
          results.validations[validationName] = validationResult;

          // Collect errors and warnings
          if (validationResult.errors) {
            results.errors.push(...validationResult.errors);
          }
          if (validationResult.warnings) {
            results.warnings.push(...validationResult.warnings);
          }
        }
      }

      // Determine overall result
      results.overall = this.determineOverallResult(results);
      results.duration = Date.now() - startTime;

      // Generate recommendations
      results.recommendations = this.generateRecommendations(results);

      console.log(
        `✅ [VALIDATOR] Validation completed for ${patchData.id}: ${results.overall}`,
      );

      // Emit validation event
      this.emit("validationComplete", {
        patchId: patchData.id,
        result: results,
      });

      return results;
    } catch (_error) {
      console.error(
        `❌ [VALIDATOR] Validation failed for ${patchData.id}:`,
        error.message,
      );

      results.overall = "FAIL";
      results.duration = Date.now() - startTime;
      results.errors.push({
        category: "validation_error",
        message: error.message,
        severity: "critical",
      });

      return results;
    }
  }

  /**
   * Run individual validation step
   * @param {string} validationName - Name of validation
   * @param {Object} config - Validation configuration
   * @param {Object} patchData - Patch data
   * @returns {Object} Validation result
   */
  async runValidation(validationName, config, patchData) {
    const result = {
      name: validationName,
      status: "PASS",
      duration: 0,
      output: "",
      errors: [],
      warnings: [],
    };

    const startTime = Date.now();

    try {
      const { stdout, stderr } = await this.executeCommand(
        config.command,
        config.timeout,
      );

      result.duration = Date.now() - startTime;
      result.output = stdout;

      // Check for warnings in stderr
      if (stderr) {
        const warnings = this.parseWarnings(stderr, validationName);
        result.warnings = warnings;

        if (warnings.length > this.maxWarnings) {
          result.status = "FAIL";
          result.errors.push({
            category: "too_many_warnings",
            message: `Too many warnings: ${warnings.length} (max: ${this.maxWarnings})`,
            severity: "warning",
          });
        }
      }

      // Validate output based on validation type
      const outputValidation = this.validateOutput(
        validationName,
        stdout,
        stderr,
      );
      if (!outputValidation.valid) {
        result.status = "FAIL";
        result.errors.push(...outputValidation.errors);
      }
    } catch (_error) {
      result.duration = Date.now() - startTime;
      result.status = "FAIL";
      result.errors.push({
        category: "execution_error",
        message: error.message,
        severity: "critical",
      });
    }

    return result;
  }

  /**
   * Execute command with timeout
   * @param {string} command - Command to execute
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} Command result
   */
  executeCommand(command, timeout) {
    return new Promise((resolve, reject) => {
      const process = exec(command, {
        cwd: "/Users/sawyer/gitSync/gpt-cursor-runner",
        timeout: timeout || this.validationTimeout,
        shell: "/bin/bash",
      });

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data;
      });

      process.stderr.on("data", (data) => {
        stderr += data;
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      process.on("error", (error) => {
        reject(new Error(`Command execution error: ${error.message}`));
      });

      process.on("timeout", () => {
        process.kill();
        reject(new Error("Command execution timeout"));
      });
    });
  }

  /**
   * Parse warnings from command output
   * @param {string} output - Command output
   * @param {string} validationName - Validation name
   * @returns {Array} Parsed warnings
   */
  parseWarnings(output, validationName) {
    const warnings = [];
    const lines = output.split("\n");

    for (const line of lines) {
      if (line.includes("warning") || line.includes("Warning")) {
        warnings.push({
          category: "lint_warning",
          message: line.trim(),
          severity: "warning",
          validation: validationName,
        });
      }
    }

    return warnings;
  }

  /**
   * Validate command output based on validation type
   * @param {string} validationName - Validation name
   * @param {string} stdout - Standard output
   * @param {string} stderr - Standard error
   * @returns {Object} Validation result
   */
  validateOutput(validationName, stdout, stderr) {
    const result = { valid: true, errors: [] };

    switch (validationName) {
      case "typescript":
        if (stderr && stderr.includes("error TS")) {
          result.valid = false;
          result.errors.push({
            category: "typescript_error",
            message: "TypeScript compilation errors found",
            severity: "critical",
            details: stderr,
          });
        }
        break;

      case "eslint":
        if (stderr && stderr.includes("error")) {
          result.valid = false;
          result.errors.push({
            category: "eslint_error",
            message: "ESLint errors found",
            severity: "critical",
            details: stderr,
          });
        }
        break;

      case "runtime":
        if (stdout && stdout.includes("FAIL")) {
          result.valid = false;
          result.errors.push({
            category: "runtime_error",
            message: "Runtime validation failed",
            severity: "critical",
            details: stdout,
          });
        }
        break;

      case "performance":
        if (stdout) {
          const performanceMatch = stdout.match(/(\d+)ms/);
          if (performanceMatch) {
            const duration = parseInt(performanceMatch[1]);
            if (duration > this.performanceThreshold) {
              result.valid = false;
              result.errors.push({
                category: "performance_error",
                message: `Performance threshold exceeded: ${duration}ms > ${this.performanceThreshold}ms`,
                severity: "warning",
                details: stdout,
              });
            }
          }
        }
        break;

      case "roles":
        if (stdout && stdout.includes("FAIL")) {
          result.valid = false;
          result.errors.push({
            category: "role_error",
            message: "Role validation failed",
            severity: "critical",
            details: stdout,
          });
        }
        break;

      case "components":
        if (stdout && stdout.includes("FAIL")) {
          result.valid = false;
          result.errors.push({
            category: "component_error",
            message: "Component validation failed",
            severity: "critical",
            details: stdout,
          });
        }
        break;
    }

    return result;
  }

  /**
   * Determine overall validation result
   * @param {Object} results - Validation results
   * @returns {string} Overall result (PASS/FAIL)
   */
  determineOverallResult(results) {
    // Check for critical errors
    const criticalErrors = results.errors.filter((error) =>
      this.errorCategories.critical.includes(error.category),
    );

    if (criticalErrors.length > 0) {
      return "FAIL";
    }

    // Check validation status
    for (const validation of Object.values(results.validations)) {
      if (validation.status === "FAIL") {
        return "FAIL";
      }
    }

    return "PASS";
  }

  /**
   * Generate recommendations based on validation results
   * @param {Object} results - Validation results
   * @returns {Array} Recommendations
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Performance recommendations
    const performanceErrors = results.errors.filter(
      (error) => error.category === "performance_error",
    );
    if (performanceErrors.length > 0) {
      recommendations.push({
        type: "performance",
        message: "Consider optimizing code for better performance",
        priority: "medium",
      });
    }

    // Warning recommendations
    if (results.warnings.length > 0) {
      recommendations.push({
        type: "code_quality",
        message: `Address ${results.warnings.length} warnings to improve code quality`,
        priority: "low",
      });
    }

    // Validation duration recommendations
    if (results.duration > 60000) {
      // More than 1 minute
      recommendations.push({
        type: "efficiency",
        message:
          "Validation is taking longer than expected, consider optimizing validation pipeline",
        priority: "medium",
      });
    }

    return recommendations;
  }

  /**
   * Generate detailed validation report
   * @param {Object} results - Validation results
   * @returns {string} Markdown report
   */
  generateReport(results) {
    const report = `# Patch Validation Report

**Patch ID**: ${results.patchId}
**Status**: ${results.overall}
**Timestamp**: ${results.timestamp}
**Duration**: ${results.duration}ms

## Validation Results

${Object.entries(results.validations)
  .map(
    ([name, validation]) => `
### ${name.toUpperCase()}
- **Status**: ${validation.status}
- **Duration**: ${validation.duration}ms
- **Errors**: ${validation.errors.length}
- **Warnings**: ${validation.warnings.length}
`,
  )
  .join("")}

## Errors (${results.errors.length})

${results.errors
  .map(
    (error) => `
- **${error.category}** (${error.severity}): ${error.message}
`,
  )
  .join("")}

## Warnings (${results.warnings.length})

${results.warnings
  .map(
    (warning) => `
- **${warning.category}**: ${warning.message}
`,
  )
  .join("")}

## Recommendations (${results.recommendations.length})

${results.recommendations
  .map(
    (rec) => `
- **${rec.type}** (${rec.priority}): ${rec.message}
`,
  )
  .join("")}

## Summary

${results.overall === "PASS" ? "✅ All validations passed" : "❌ Validation failed"}

---
*Generated by Enhanced Patch Validator*
`;

    return report;
  }

  /**
   * Save validation report to file
   * @param {Object} results - Validation results
   * @param {string} outputPath - Output file path
   */
  async saveReport(results, outputPath) {
    const report = this.generateReport(results);
    await fs.writeFile(outputPath, report);
    console.log(`📄 [VALIDATOR] Report saved to: ${outputPath}`);
  }

  /**
   * Get validation statistics
   * @returns {Object} Statistics
   */
  getStatistics() {
    return {
      totalValidations: Object.keys(this.validations).length,
      enabledValidations: Object.values(this.validations).filter(
        (v) => v.enabled,
      ).length,
      errorCategories: Object.keys(this.errorCategories),
      performanceThreshold: this.performanceThreshold,
    };
  }
}

// Export for use in other modules
module.exports = EnhancedPatchValidator;

// CLI interface
if (require.main === module) {
  const validator = new EnhancedPatchValidator();

  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log(
      "Usage: node enhanced-patch-validator.js <patch-file> [output-report]",
    );
    process.exit(1);
  }

  const [patchFile, outputReport] = args;

  fs.readFile(patchFile, "utf8")
    .then((content) => {
      const patchData = JSON.parse(content);
      return validator.validatePatch(patchData);
    })
    .then((results) => {
      console.log(JSON.stringify(results, null, 2));

      if (outputReport) {
        return validator.saveReport(results, outputReport);
      }
    })
    .catch((error) => {
      console.error("Validation failed:", error.message);
      process.exit(1);
    });
}
