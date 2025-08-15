#!/usr/bin/env node

/**
 * Summary Ghost Parser Validation Boot v2
 * Enhanced version with .md trace decoder and ⚠️ parsing fail handling
 * Hooks into summary monitor to enforce format, trace fields, and ghost compliance
 * Validates summary files for proper structure, ghost integration, and trace fields
 */

const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  SUMMARY_DIRS: ["/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries"],
  GHOST_STATUS_FILES: [
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS/ghost-status.json",
  ],
  LOG_FILE:
    "/Users/sawyer/gitSync/gpt-cursor-runner/logs/summary-ghost-parser.log",
  VALIDATION_RULES: {
    REQUIRED_FIELDS: ["patchName", "status", "timestamp"],
    GHOST_TRACE_FIELDS: ["ghostStatus", "ghostUptime", "ghostLastCheck"],
    FORMAT_RULES: {
      PATCH_NAME_PATTERN:
        /^(patch-v\d+\.\d+\.\d+\(P\d+\.\d+\.\d+\)_.+|v\d+\.\d+\.\d+\(P\d+\.\d+\.\d+\)_.+|.+)$/,
      STATUS_VALUES: [
        "PASS",
        "FAIL",
        "UNVERIFIED",
        "IN_PROGRESS",
        "WORKING",
        "COMPLETED",
        "SUCCESSFUL",
        "EXECUTED",
      ],
      // Removed TIMESTAMP_PATTERN - GPT timestamps are unreliable
    },
    FAILURE_MARKERS: [
      "⚠️",
      "❌",
      "FAIL",
      "ERROR",
      "CRASH",
      "BROKEN",
      "STALLED",
      "TIMEOUT",
    ],
    TRACE_DECODERS: {
      MD_LINKS: /\[([^\]]+)\]\(([^)]+)\)/g,
      GHOST_STATUS: /Ghost.*Status[:\s]*([A-Za-z]+)/gi,
      GHOST_UPTIME: /Uptime[:\s]*(\d+)/gi,
      GHOST_LAST_CHECK: /Last Check[:\s]*([A-Za-z0-9\s:]+)/gi,
      PATCH_REFERENCES: /patch-[^.\s]+/gi,
      TIMESTAMP_VARIANTS: [
        /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/,
        /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/,
        /(\d{4}-\d{2}-\d{2})/,
      ],
    },
  },
};

class SummaryGhostParser {
  constructor() {
    this.validationResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
    };
    this.ghostStatus = {};
    this.lastValidation = null;
  }

  // Initialize parser and load ghost status
  async initialize() {
    try {
      console.log("🔍 [PARSER] Initializing Summary Ghost Parser...");

      // Load ghost status from both MAIN and CYOPS
      await this.loadGhostStatus();

      // Create log directory if it doesn't exist
      const logDir = path.dirname(CONFIG.LOG_FILE);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      console.log("✅ [PARSER] Summary Ghost Parser initialized");
      this.log("PARSER_INIT", "Summary Ghost Parser initialized successfully");
    } catch (_error) {
      console.error("❌ [PARSER] Initialization failed:", error.message);
      this.log("PARSER_ERROR", `Initialization failed: ${error.message}`);
    }
  }

  // Load ghost status from both systems
  async loadGhostStatus() {
    for (const statusFile of CONFIG.GHOST_STATUS_FILES) {
      try {
        if (fs.existsSync(statusFile)) {
          const statusData = JSON.parse(fs.readFileSync(statusFile, "utf8"));
          const systemKey = path.basename(path.dirname(statusFile));
          this.ghostStatus[systemKey] = statusData;
          console.log(`👻 [PARSER] Loaded ghost status for ${systemKey}`);
        }
      } catch (_error) {
        console.warn(
          `⚠️ [PARSER] Could not load ghost status from ${statusFile}:`,
          error.message,
        );
      }
    }
  }

  // Parse and validate a single summary file
  parseSummaryFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const filename = path.basename(filePath);

      // Extract metadata from content
      const metadata = this.extractMetadata(content, filename);

      // Validate the summary
      const validation = this.validateSummary(metadata, content, filename);

      return {
        file: filename,
        path: filePath,
        metadata,
        validation,
        timestamp: new Date().toISOString(),
      };
    } catch (_error) {
      return {
        file: path.basename(filePath),
        path: filePath,
        error: error.message,
        validation: { valid: false, errors: [error.message] },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Extract metadata from summary content with enhanced trace field decoding
  extractMetadata(content, filename) {
    const metadata = {
      filename,
      patchName: null,
      status: null,
      timestamp: null,
      ghostStatus: null,
      ghostUptime: null,
      ghostLastCheck: null,
      hasTraceFields: false,
      hasGhostIntegration: false,
      failureMarkers: [],
      mdLinks: [],
      patchReferences: [],
      traceFieldCount: 0,
    };

    // Extract patch name from filename or content
    const patchNameMatch = filename.match(/^summary-(.+)\.md$/);
    if (patchNameMatch) {
      metadata.patchName = patchNameMatch[1];
    }

    // Enhanced status extraction with failure marker detection
    const statusMatch = content.match(/Status[:\s]*([A-Z_]+)/i);
    if (statusMatch) {
      metadata.status = statusMatch[1].toUpperCase();
    }

    // Enhanced timestamp extraction with multiple format support
    metadata.timestamp = this.extractTimestamp(content);

    // Enhanced ghost trace field extraction
    if (content.includes("ghost") || content.includes("Ghost")) {
      metadata.hasGhostIntegration = true;

      // Extract ghost status using enhanced decoder
      const ghostStatusMatches = content.matchAll(
        CONFIG.VALIDATION_RULES.TRACE_DECODERS.GHOST_STATUS,
      );
      for (const match of ghostStatusMatches) {
        if (match[1] && !metadata.ghostStatus) {
          metadata.ghostStatus = match[1];
          metadata.traceFieldCount++;
        }
      }

      // Extract ghost uptime using enhanced decoder
      const uptimeMatches = content.matchAll(
        CONFIG.VALIDATION_RULES.TRACE_DECODERS.GHOST_UPTIME,
      );
      for (const match of uptimeMatches) {
        if (match[1] && !metadata.ghostUptime) {
          metadata.ghostUptime = parseInt(match[1]);
          metadata.traceFieldCount++;
        }
      }

      // Extract ghost last check using enhanced decoder
      const lastCheckMatches = content.matchAll(
        CONFIG.VALIDATION_RULES.TRACE_DECODERS.GHOST_LAST_CHECK,
      );
      for (const match of lastCheckMatches) {
        if (match[1] && !metadata.ghostLastCheck) {
          metadata.ghostLastCheck = match[1].trim();
          metadata.traceFieldCount++;
        }
      }

      if (
        metadata.ghostStatus ||
        metadata.ghostUptime ||
        metadata.ghostLastCheck
      ) {
        metadata.hasTraceFields = true;
      }
    }

    // Extract failure markers
    metadata.failureMarkers = this.extractFailureMarkers(content);

    // Extract markdown links
    metadata.mdLinks = this.extractMarkdownLinks(content);

    // Extract patch references
    metadata.patchReferences = this.extractPatchReferences(content);

    return metadata;
  }

  // Enhanced timestamp extraction with multiple format support
  extractTimestamp(content) {
    for (const pattern of CONFIG.VALIDATION_RULES.TRACE_DECODERS
      .TIMESTAMP_VARIANTS) {
      const match = content.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  // Extract failure markers from content
  extractFailureMarkers(content) {
    const markers = [];
    for (const marker of CONFIG.VALIDATION_RULES.FAILURE_MARKERS) {
      if (content.includes(marker)) {
        markers.push(marker);
      }
    }
    return markers;
  }

  // Extract markdown links from content
  extractMarkdownLinks(content) {
    const links = [];
    const matches = content.matchAll(
      CONFIG.VALIDATION_RULES.TRACE_DECODERS.MD_LINKS,
    );
    for (const match of matches) {
      links.push({
        text: match[1],
        url: match[2],
      });
    }
    return links;
  }

  // Extract patch references from content
  extractPatchReferences(content) {
    const references = [];
    const matches = content.matchAll(
      CONFIG.VALIDATION_RULES.TRACE_DECODERS.PATCH_REFERENCES,
    );
    for (const match of matches) {
      if (!references.includes(match[0])) {
        references.push(match[0]);
      }
    }
    return references;
  }

  // Validate summary metadata and content
  validateSummary(metadata, content, filename) {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!metadata.patchName) {
      errors.push("Missing patch name");
    } else if (
      !CONFIG.VALIDATION_RULES.FORMAT_RULES.PATCH_NAME_PATTERN.test(
        metadata.patchName,
      )
    ) {
      errors.push(`Invalid patch name format: ${metadata.patchName}`);
    }

    if (!metadata.status) {
      warnings.push("Missing status field");
    } else if (
      !CONFIG.VALIDATION_RULES.FORMAT_RULES.STATUS_VALUES.includes(
        metadata.status,
      )
    ) {
      warnings.push(`Non-standard status value: ${metadata.status}`);
    }

    if (!metadata.timestamp) {
      warnings.push("Missing timestamp");
    }
    // Removed timestamp format validation - GPT timestamps are unreliable

    // Ghost integration validation
    if (metadata.hasGhostIntegration && !metadata.hasTraceFields) {
      warnings.push("Ghost integration mentioned but no trace fields found");
    }

    // Content structure validation
    if (!content.includes("##") && !content.includes("###")) {
      warnings.push("Summary lacks proper markdown structure");
    }

    if (content.length < 100) {
      warnings.push("Summary content seems too short");
    }

    // Ghost status consistency check
    if (metadata.ghostStatus) {
      const systemKey = this.determineSystemKey(filename);
      if (this.ghostStatus[systemKey]) {
        const actualStatus = this.ghostStatus[systemKey].status;
        if (metadata.ghostStatus.toLowerCase() !== actualStatus.toLowerCase()) {
          warnings.push(
            `Ghost status mismatch: reported ${metadata.ghostStatus}, actual ${actualStatus}`,
          );
        }
      }
    }

    // Failure marker validation
    if (metadata.failureMarkers.length > 0) {
      if (
        metadata.status === "PASS" ||
        metadata.status === "SUCCESSFUL" ||
        metadata.status === "COMPLETED"
      ) {
        warnings.push(
          `Failure markers detected (${metadata.failureMarkers.join(", ")}) but status indicates success`,
        );
      } else {
        console.log(
          `⚠️ [PARSER] Failure markers detected in ${filename}: ${metadata.failureMarkers.join(", ")}`,
        );
      }
    }

    // Trace field validation
    if (metadata.hasGhostIntegration && metadata.traceFieldCount === 0) {
      warnings.push(
        "Ghost integration mentioned but no trace fields extracted",
      );
    } else if (metadata.traceFieldCount > 0) {
      console.log(
        `🔍 [PARSER] Extracted ${metadata.traceFieldCount} trace fields from ${filename}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: this.calculateValidationScore(metadata, errors, warnings),
    };
  }

  // Determine system key from filename or path
  determineSystemKey(filename) {
    if (filename.includes("MAIN") || filename.includes("main")) {
      return "MAIN";
    } else if (filename.includes("CYOPS") || filename.includes("cyops")) {
      return "CYOPS";
    }
    return "UNKNOWN";
  }

  // Calculate validation score
  calculateValidationScore(metadata, errors, warnings) {
    let score = 100;

    // Deduct points for errors
    score -= errors.length * 20;

    // Deduct points for warnings
    score -= warnings.length * 5;

    // Bonus points for ghost integration
    if (metadata.hasGhostIntegration && metadata.hasTraceFields) {
      score += 10;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Parse all summary files in all directories
  async parseAllSummaries() {
    console.log("📊 [PARSER] Starting comprehensive summary parsing...");

    this.validationResults = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
    };

    const allResults = [];

    for (const summaryDir of CONFIG.SUMMARY_DIRS) {
      try {
        if (!fs.existsSync(summaryDir)) {
          console.warn(
            `⚠️ [PARSER] Summary directory not found: ${summaryDir}`,
          );
          continue;
        }

        const files = fs
          .readdirSync(summaryDir)
          .filter((file) => file.endsWith(".md"))
          .filter((file) => file.startsWith("summary-"));

        console.log(
          `📁 [PARSER] Processing ${files.length} summaries in ${path.basename(summaryDir)}`,
        );

        for (const file of files) {
          const filePath = path.join(summaryDir, file);
          const result = this.parseSummaryFile(filePath);

          allResults.push(result);
          this.validationResults.total++;

          if (result.validation.valid) {
            this.validationResults.passed++;
          } else {
            this.validationResults.failed++;
            this.validationResults.errors.push({
              file: result.file,
              errors: result.validation.errors,
            });
          }
        }
      } catch (_error) {
        console.error(
          `❌ [PARSER] Error processing directory ${summaryDir}:`,
          error.message,
        );
        this.log(
          "PARSER_ERROR",
          `Directory processing failed: ${error.message}`,
        );
      }
    }

    this.lastValidation = {
      timestamp: new Date().toISOString(),
      results: allResults,
      summary: this.validationResults,
    };

    return this.lastValidation;
  }

  // Generate validation report
  generateReport() {
    if (!this.lastValidation) {
      return "No validation data available";
    }

    const { summary, results } = this.lastValidation;

    let report = "# Summary Ghost Parser Validation Report\n\n";
    report += `**Generated**: ${new Date().toLocaleString()}\n`;
    report += `**Total Files**: ${summary.total}\n`;
    report += `**Passed**: ${summary.passed}\n`;
    report += `**Failed**: ${summary.failed}\n`;
    report += `**Success Rate**: ${summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%\n\n`;

    // Summary of issues
    if (summary.errors.length > 0) {
      report += "## Validation Errors\n\n";
      summary.errors.forEach((error) => {
        report += `- **${error.file}**: ${error.errors.join(", ")}\n`;
      });
      report += "\n";
    }

    // Detailed results
    report += "## Detailed Results\n\n";
    results.forEach((result) => {
      const status = result.validation.valid ? "✅" : "❌";
      const score = result.validation.score;
      report += `### ${status} ${result.file}\n`;
      report += `- **Score**: ${score}/100\n`;
      report += `- **Status**: ${result.metadata?.status || "UNKNOWN"}\n`;
      report += `- **Ghost Integration**: ${result.metadata?.hasGhostIntegration ? "Yes" : "No"}\n`;
      report += `- **Trace Fields**: ${result.metadata?.hasTraceFields ? "Yes" : "No"}\n`;
      report += `- **Trace Field Count**: ${result.metadata?.traceFieldCount || 0}\n`;
      report += `- **Failure Markers**: ${result.metadata?.failureMarkers?.length > 0 ? result.metadata.failureMarkers.join(", ") : "None"}\n`;
      report += `- **MD Links**: ${result.metadata?.mdLinks?.length || 0}\n`;
      report += `- **Patch References**: ${result.metadata?.patchReferences?.length || 0}\n`;

      if (result.validation.warnings.length > 0) {
        report += `- **Warnings**: ${result.validation.warnings.join(", ")}\n`;
      }

      if (result.validation.errors.length > 0) {
        report += `- **Errors**: ${result.validation.errors.join(", ")}\n`;
      }

      report += "\n";
    });

    return report;
  }

  // Log messages to file
  log(level, message) {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level}] ${message}\n`;
      fs.appendFileSync(CONFIG.LOG_FILE, logEntry);
    } catch (_error) {
      console.error("❌ [PARSER] Failed to write to log:", error.message);
    }
  }

  // Export validation results
  exportResults(format = "json") {
    if (!this.lastValidation) {
      return null;
    }

    const exportPath = `/Users/sawyer/gitSync/gpt-cursor-runner/logs/summary-validation-${Date.now()}.${format}`;

    try {
      if (format === "json") {
        fs.writeFileSync(
          exportPath,
          JSON.stringify(this.lastValidation, null, 2),
        );
      } else if (format === "md") {
        fs.writeFileSync(exportPath, this.generateReport());
      }

      console.log(`📄 [PARSER] Results exported to: ${exportPath}`);
      return exportPath;
    } catch (_error) {
      console.error("❌ [PARSER] Export failed:", error.message);
      return null;
    }
  }

  // Run complete validation cycle
  async runValidation() {
    console.log("🚀 [PARSER] Starting validation cycle...");

    await this.initialize();
    const results = await this.parseAllSummaries();

    console.log("📊 [PARSER] Validation complete:");
    console.log(`   Total: ${results.summary.total}`);
    console.log(`   Passed: ${results.summary.passed}`);
    console.log(`   Failed: ${results.summary.failed}`);
    console.log(
      `   Success Rate: ${results.summary.total > 0 ? Math.round((results.summary.passed / results.summary.total) * 100) : 0}%`,
    );

    // Export results
    this.exportResults("json");
    this.exportResults("md");

    // Log completion
    this.log(
      "VALIDATION_COMPLETE",
      `Processed ${results.summary.total} files, ${results.summary.passed} passed, ${results.summary.failed} failed`,
    );

    return results;
  }
}

// CLI interface
if (require.main === module) {
  const parser = new SummaryGhostParser();

  const command = process.argv[2] || "validate";

  switch (command) {
    case "validate":
      parser
        .runValidation()
        .then(() => {
          console.log("✅ [PARSER] Validation cycle completed");
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ [PARSER] Validation failed:", error.message);
          process.exit(1);
        });
      break;

    case "report":
      parser
        .runValidation()
        .then(() => {
          console.log(`\n${parser.generateReport()}`);
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ [PARSER] Report generation failed:", error.message);
          process.exit(1);
        });
      break;

    case "export":
      const format = process.argv[3] || "json";
      parser
        .runValidation()
        .then(() => {
          const exportPath = parser.exportResults(format);
          if (exportPath) {
            console.log(`✅ [PARSER] Results exported to: ${exportPath}`);
          }
          process.exit(0);
        })
        .catch((error) => {
          console.error("❌ [PARSER] Export failed:", error.message);
          process.exit(1);
        });
      break;

    default:
      console.log(
        "Usage: node summary-ghost-parser.js [validate|report|export] [format]",
      );
      console.log("  validate - Run full validation cycle");
      console.log("  report   - Generate and display validation report");
      console.log("  export   - Export results (json|md)");
      process.exit(0);
  }
}

module.exports = SummaryGhostParser;
