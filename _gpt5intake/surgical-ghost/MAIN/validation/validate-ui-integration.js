const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

class UIValidationIntegration {
  constructor() {
    this.validationDir = "/Users/sawyer/gitSync/.cursor-cache/MAIN/validation";
    this.logDir = "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/MAIN";
    this.screenshotDir =
      "/Users/sawyer/gitSync/.cursor-cache/MAIN/validation/screenshots";
    this.results = {
      detox: { status: "pending", message: "" },
      screenshots: { status: "pending", message: "" },
      visualRegression: { status: "pending", message: "" },
      overall: { status: "pending", message: "" },
    };
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
    const logFile = path.join(this.logDir, "ui-validation-integration.log");

    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    fs.appendFileSync(logFile, logMessage);
    console.log(`[${level.toUpperCase()}] ${message}`);
  }

  async validateDetoxSetup() {
    this.log("🔍 Validating Detox setup...");

    try {
      // Check if Detox is installed
      const detoxVersion = execSync("npx detox --version", {
        encoding: "utf8",
      }).trim();
      this.log(`✅ Detox version: ${detoxVersion}`);

      // Check if Detox config exists
      if (!fs.existsSync(".detoxrc.js")) {
        throw new Error("Detox configuration file (.detoxrc.js) not found");
      }
      this.log("✅ Detox configuration found");

      // Check if e2e directory exists
      if (!fs.existsSync("e2e")) {
        throw new Error("E2E test directory not found");
      }
      this.log("✅ E2E test directory found");

      this.results.detox = {
        status: "passed",
        message: "Detox setup validated successfully",
      };
      return true;
    } catch (error) {
      this.log(`❌ Detox validation failed: ${error.message}`, "error");
      this.results.detox = { status: "failed", message: error.message };
      return false;
    }
  }

  async runUIInteractionTests() {
    this.log("🧪 Running UI interaction tests...");

    try {
      // Build the app first
      this.log("🔨 Building app for testing...");
      execSync("npm run test:ui:build", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 300000, // 5 minutes
      });
      this.log("✅ App build completed");

      // Run UI interaction tests
      this.log("🎯 Running UI interaction tests...");
      execSync("npm run test:ui:interactions", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 600000, // 10 minutes
      });
      this.log("✅ UI interaction tests completed");

      this.results.detox = {
        status: "passed",
        message: "UI interaction tests passed",
      };
      return true;
    } catch (error) {
      this.log(`❌ UI interaction tests failed: ${error.message}`, "error");
      this.results.detox = { status: "failed", message: error.message };
      return false;
    }
  }

  async captureScreenshots() {
    this.log("📸 Capturing screenshots...");

    try {
      execSync("npm run test:screenshots:capture", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 300000, // 5 minutes
      });

      // Check if screenshots were created
      const currentDir = path.join(this.screenshotDir, "current");
      if (fs.existsSync(currentDir)) {
        const screenshots = fs
          .readdirSync(currentDir)
          .filter((file) => file.endsWith(".png"));
        this.log(`✅ Captured ${screenshots.length} screenshots`);
        this.results.screenshots = {
          status: "passed",
          message: `Captured ${screenshots.length} screenshots`,
        };
        return true;
      } else {
        throw new Error("Screenshot directory not created");
      }
    } catch (error) {
      this.log(`❌ Screenshot capture failed: ${error.message}`, "error");
      this.results.screenshots = { status: "failed", message: error.message };
      return false;
    }
  }

  async runVisualRegressionTests() {
    this.log("🔍 Running visual regression tests...");

    try {
      execSync("npm run test:visual:regression", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 300000, // 5 minutes
      });

      // Check results file
      const resultsFile = path.join(
        this.logDir,
        "visual-regression-results.json",
      );
      if (fs.existsSync(resultsFile)) {
        const results = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
        const failedTests = results.filter((r) => r.status === "failed");

        if (failedTests.length === 0) {
          this.log("✅ Visual regression tests passed");
          this.results.visualRegression = {
            status: "passed",
            message: "All visual regression tests passed",
          };
          return true;
        } else {
          this.log(
            `⚠️ ${failedTests.length} visual regression tests failed`,
            "warn",
          );
          this.results.visualRegression = {
            status: "failed",
            message: `${failedTests.length} visual regression tests failed`,
          };
          return false;
        }
      } else {
        throw new Error("Visual regression results file not found");
      }
    } catch (error) {
      this.log(`❌ Visual regression tests failed: ${error.message}`, "error");
      this.results.visualRegression = {
        status: "failed",
        message: error.message,
      };
      return false;
    }
  }

  async createBaseline() {
    this.log("📸 Creating baseline screenshots...");

    try {
      execSync("npm run test:screenshots:baseline", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 300000, // 5 minutes
      });

      this.log("✅ Baseline screenshots created");
      return true;
    } catch (error) {
      this.log(`❌ Baseline creation failed: ${error.message}`, "error");
      return false;
    }
  }

  async cleanup() {
    this.log("🧹 Cleaning up test artifacts...");

    try {
      execSync("npm run test:screenshots:cleanup", {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 60000, // 1 minute
      });

      this.log("✅ Cleanup completed");
      return true;
    } catch (error) {
      this.log(`⚠️ Cleanup failed: ${error.message}`, "warn");
      return false;
    }
  }

  generateValidationReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      results: this.results,
      summary: this.generateSummary(),
    };

    const reportFile = path.join(this.logDir, "ui-validation-report.json");
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    return report;
  }

  generateSummary() {
    const allPassed = Object.values(this.results).every(
      (r) => r.status === "passed",
    );
    const failedCount = Object.values(this.results).filter(
      (r) => r.status === "failed",
    ).length;

    let summary = `\n📊 UI Validation Integration Summary\n`;
    summary += `=====================================\n`;
    summary += `Overall Status: ${allPassed ? "✅ PASSED" : "❌ FAILED"}\n`;
    summary += `Failed Tests: ${failedCount}\n\n`;

    Object.entries(this.results).forEach(([test, result]) => {
      const status =
        result.status === "passed"
          ? "✅"
          : result.status === "failed"
            ? "❌"
            : "⏳";
      summary += `${status} ${test}: ${result.message}\n`;
    });

    return summary;
  }

  async runFullValidation() {
    this.log("🚀 Starting full UI validation integration...");

    // Ensure validation directories exist
    [this.validationDir, this.logDir, this.screenshotDir].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const steps = [
      { name: "Detox Setup Validation", fn: () => this.validateDetoxSetup() },
      { name: "UI Interaction Tests", fn: () => this.runUIInteractionTests() },
      { name: "Screenshot Capture", fn: () => this.captureScreenshots() },
      {
        name: "Visual Regression Tests",
        fn: () => this.runVisualRegressionTests(),
      },
    ];

    for (const step of steps) {
      this.log(`\n📋 Step: ${step.name}`);
      const success = await step.fn();

      if (!success) {
        this.log(`❌ Step failed: ${step.name}`, "error");
        // Continue with other steps but mark overall as failed
      }
    }

    // Determine overall status
    const allPassed = Object.values(this.results).every(
      (r) => r.status === "passed",
    );
    this.results.overall = {
      status: allPassed ? "passed" : "failed",
      message: allPassed
        ? "All UI validation tests passed"
        : "Some UI validation tests failed",
    };

    // Generate and log report
    const report = this.generateValidationReport();
    this.log(report.summary);

    // Cleanup
    await this.cleanup();

    return {
      success: allPassed,
      report,
      results: this.results,
    };
  }

  async runValidationGate() {
    this.log("🚪 Running UI validation gate...");

    // This is a simplified validation gate for patch integration
    const validationSteps = [
      { name: "Detox Setup", fn: () => this.validateDetoxSetup() },
      { name: "Screenshot Capture", fn: () => this.captureScreenshots() },
      { name: "Visual Regression", fn: () => this.runVisualRegressionTests() },
    ];

    for (const step of validationSteps) {
      const success = await step.fn();
      if (!success) {
        this.log(`❌ Validation gate failed at: ${step.name}`, "error");
        return false;
      }
    }

    this.log("✅ UI validation gate passed");
    return true;
  }
}

// CLI interface
if (require.main === module) {
  const validator = new UIValidationIntegration();
  const command = process.argv[2];

  switch (command) {
    case "full":
      validator
        .runFullValidation()
        .then((result) => {
          process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
          console.error("❌ Full validation failed:", error);
          process.exit(1);
        });
      break;

    case "gate":
      validator
        .runValidationGate()
        .then((success) => {
          process.exit(success ? 0 : 1);
        })
        .catch((error) => {
          console.error("❌ Validation gate failed:", error);
          process.exit(1);
        });
      break;

    case "detox":
      validator
        .validateDetoxSetup()
        .then((success) => {
          process.exit(success ? 0 : 1);
        })
        .catch((error) => {
          console.error("❌ Detox validation failed:", error);
          process.exit(1);
        });
      break;

    case "screenshots":
      validator
        .captureScreenshots()
        .then((success) => {
          process.exit(success ? 0 : 1);
        })
        .catch((error) => {
          console.error("❌ Screenshot capture failed:", error);
          process.exit(1);
        });
      break;

    case "regression":
      validator
        .runVisualRegressionTests()
        .then((success) => {
          process.exit(success ? 0 : 1);
        })
        .catch((error) => {
          console.error("❌ Visual regression failed:", error);
          process.exit(1);
        });
      break;

    case "baseline":
      validator
        .createBaseline()
        .then((success) => {
          process.exit(success ? 0 : 1);
        })
        .catch((error) => {
          console.error("❌ Baseline creation failed:", error);
          process.exit(1);
        });
      break;

    default:
      console.log(
        "Usage: node validate-ui-integration.js [full|gate|detox|screenshots|regression|baseline]",
      );
      process.exit(1);
  }
}

module.exports = UIValidationIntegration;
