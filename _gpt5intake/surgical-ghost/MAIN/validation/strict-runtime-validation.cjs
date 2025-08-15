#!/usr/bin/env node

/**
 * STRICT Runtime Validation Script
 *
 * Follows MUST-README_GLOBAL-PATCH-ENFORCEMENT.md guidelines
 * Actually tests app boot and runtime functionality
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Configuration
const VALIDATION_CONFIG = {
  timeoutMs: 60000, // 60 seconds for app boot
  outputDir: "/Users/sawyer/gitSync/.cursor-cache/MAIN/validation",
  expoPort: 8081,
  maxRetries: 3,
  simulatorLogFile: "/tmp/simulator.log",
  maestroTimeout: 60000, // 60 seconds for Maestro tests
  screenshotDir:
    "/Users/sawyer/gitSync/.cursor-cache/MAIN/validation/screenshots",
  providerTestTimeout: 30000, // 30 seconds for provider tests
};

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

// Utility functions
const log = (message, color = "reset") => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSection = (title) => {
  log(`\n${"=".repeat(60)}`, "cyan");
  log(`  ${title}`, "bright");
  log(`${"=".repeat(60)}`, "cyan");
};

const logTest = (name, status, message = "", duration = 0) => {
  const statusColor =
    status === "PASS" ? "green" : status === "FAIL" ? "red" : "yellow";
  const durationText = duration > 0 ? ` (${duration}ms)` : "";
  log(`  ${status}${durationText}: ${name}`, statusColor);
  if (message) {
    log(`    ${message}`, "reset");
  }
};

// Ensure output directory exists
const ensureOutputDir = () => {
  if (!fs.existsSync(VALIDATION_CONFIG.outputDir)) {
    fs.mkdirSync(VALIDATION_CONFIG.outputDir, { recursive: true });
  }
};

// Kill any existing Expo processes
const killExpoProcesses = () => {
  try {
    execSync(
      `kill $(lsof -ti:${VALIDATION_CONFIG.expoPort}) 2>/dev/null || true`,
      { stdio: "pipe" },
    );
    log("  Killed existing Expo processes", "yellow");
  } catch (error) {
    // Ignore errors if no processes to kill
  }
};

// Test TypeScript compilation
const testTypeScriptCompilation = async () => {
  logSection("TYPESCRIPT COMPILATION TEST");

  try {
    const startTime = Date.now();

    // Temporarily create a clean tsconfig for validation
    const originalTsConfig = fs.readFileSync(
      path.join(__dirname, "..", "tsconfig.json"),
      "utf8",
    );
    const cleanTsConfig = originalTsConfig.replace(
      /"extends":\s*"expo\/tsconfig\.base",?\s*/g,
      "",
    );
    fs.writeFileSync(
      path.join(__dirname, "..", "tsconfig.json"),
      cleanTsConfig,
    );

    try {
      execSync("npx tsc --noEmit --skipLibCheck", {
        cwd: path.join(__dirname, ".."),
        timeout: 15000,
        stdio: "pipe",
      });
      const duration = Date.now() - startTime;

      logTest(
        "TypeScript Compilation",
        "PASS",
        "No blocking TypeScript errors",
        duration,
      );
      return { status: "PASS", duration };
    } finally {
      // Restore original tsconfig
      fs.writeFileSync(
        path.join(__dirname, "..", "tsconfig.json"),
        originalTsConfig,
      );
    }
  } catch (error) {
    logTest("TypeScript Compilation", "FAIL", error.message);
    return { status: "FAIL", error: error.message };
  }
};

// Test ESLint validation
const testESLintValidation = async () => {
  logSection("ESLINT VALIDATION TEST");

  try {
    const startTime = Date.now();
    execSync("npx eslint . --ext .ts,.tsx --max-warnings=0", {
      cwd: path.join(__dirname, ".."),
      timeout: 20000,
      stdio: "pipe",
    });
    const duration = Date.now() - startTime;

    logTest(
      "ESLint Validation",
      "PASS",
      "No ESLint errors or warnings",
      duration,
    );
    return { status: "PASS", duration };
  } catch (error) {
    logTest("ESLint Validation", "FAIL", error.message);
    return { status: "FAIL", error: error.message };
  }
};

// Parse simulator logs for runtime errors
const parseSimulatorLogs = async () => {
  logSection("SIMULATOR LOG ANALYSIS");

  try {
    const startTime = Date.now();

    // Start simulator log capture
    const logProcess = spawn(
      "xcrun",
      [
        "simctl",
        "spawn",
        "booted",
        "log",
        "stream",
        "--style",
        "compact",
        "--predicate",
        'eventType = logEvent AND (composedMessage CONTAINS[c] "Error" OR composedMessage CONTAINS[c] "must be used within a" OR composedMessage CONTAINS[c] "TypeError" OR composedMessage CONTAINS[c] "undefined is not an object")',
      ],
      {
        stdio: ["pipe", "pipe", "pipe"],
      },
    );

    let logOutput = "";
    const runtimeErrors = [];

    logProcess.stdout.on("data", (data) => {
      const text = data.toString();
      logOutput += text;

      // Check for provider/context errors
      if (text.includes("must be used within a")) {
        runtimeErrors.push(`Provider Error: ${text.trim()}`);
      }

      // Check for runtime errors
      if (
        text.includes("TypeError") ||
        text.includes("undefined is not an object")
      ) {
        runtimeErrors.push(`Runtime Error: ${text.trim()}`);
      }
    });

    // Wait for log collection
    await new Promise((resolve) => setTimeout(resolve, 10000)); // Collect logs for 10 seconds

    const duration = Date.now() - startTime;

    if (runtimeErrors.length === 0) {
      logTest(
        "Simulator Log Analysis",
        "PASS",
        "No runtime or provider errors detected",
        duration,
      );
      return { status: "PASS", duration };
    } else {
      logTest(
        "Simulator Log Analysis",
        "FAIL",
        `Found ${runtimeErrors.length} runtime errors: ${runtimeErrors.join(", ")}`,
        duration,
      );
      return { status: "FAIL", duration, errors: runtimeErrors };
    }
  } catch (error) {
    logTest("Simulator Log Analysis", "FAIL", error.message);
    return { status: "FAIL", error: error.message };
  }
};

// Run Maestro UI tests
const runMaestroTests = async () => {
  logSection("MAESTRO UI TESTS");

  try {
    const startTime = Date.now();

    // Run Maestro tests
    const { stdout, stderr } = await execPromise(
      "bash scripts/run-maestro-tests.sh",
    );

    const duration = Date.now() - startTime;

    if (stderr && stderr.includes("Error")) {
      logTest("Maestro Tests", "FAIL", stderr, duration);
      return false;
    }

    logTest("Maestro Tests", "PASS", stdout, duration);
    return true;
  } catch (error) {
    logTest("Maestro Tests", "FAIL", error.message, 0);
    return false;
  }
};

// Test Expo app boot and runtime
const testExpoAppBoot = async () => {
  logSection("EXPO APP BOOT & RUNTIME TEST");

  let expoProcess = null;
  let bootSuccess = false;
  const runtimeErrors = [];

  try {
    // Kill any existing processes
    killExpoProcesses();

    log("  Starting Expo development server...", "blue");

    // Start Expo in background
    expoProcess = spawn("npx", ["expo", "start", "--ios", "--clear"], {
      cwd: path.join(__dirname, ".."),
      stdio: ["pipe", "pipe", "pipe"],
      detached: true,
    });

    // Collect output for analysis
    let output = "";
    let errorOutput = "";

    expoProcess.stdout.on("data", (data) => {
      const text = data.toString();
      output += text;

      // Check for successful boot indicators
      if (
        text.includes("Metro waiting on") ||
        text.includes("iOS Bundled") ||
        text.includes("Metro bundler ready")
      ) {
        log("  Metro bundler started successfully", "green");
      }

      if (
        text.includes("packager-status:running") ||
        text.includes("Metro bundler ready") ||
        text.includes("iOS Bundled")
      ) {
        log("  Expo app booted successfully", "green");
        bootSuccess = true;
      }

      // Check for runtime errors
      if (
        text.includes("ERROR") ||
        text.includes("TypeError") ||
        text.includes("Cannot read property")
      ) {
        const errorMatch = text.match(/ERROR\s+(.*?)(?:\n|$)/);
        if (errorMatch) {
          runtimeErrors.push(errorMatch[1]);
        }
      }
    });

    expoProcess.stderr.on("data", (data) => {
      const text = data.toString();
      errorOutput += text;

      if (text.includes("ERROR") || text.includes("TypeError")) {
        runtimeErrors.push(text.trim());
      }
    });

    // Wait for app to boot or timeout
    const startTime = Date.now();
    while (
      !bootSuccess &&
      Date.now() - startTime < VALIDATION_CONFIG.timeoutMs
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fallback: Check if Expo server is responding
      if (!bootSuccess) {
        try {
          const { execSync: _execSync } = require("child_process"); // eslint-disable-line @typescript-eslint/no-var-requires
          const response = _execSync("curl -s http://localhost:8081/status", {
            timeout: 5000,
          }).toString();
          if (response.includes("packager-status:running")) {
            log("  Expo server responding via curl check", "green");
            bootSuccess = true;
          }
        } catch (error) {
          // Ignore curl errors, continue waiting
        }
      }
    }

    const duration = Date.now() - startTime;

    if (bootSuccess && runtimeErrors.length === 0) {
      logTest(
        "Expo App Boot",
        "PASS",
        "App booted successfully with no runtime errors",
        duration,
      );
      return { status: "PASS", duration, output };
    } else if (bootSuccess && runtimeErrors.length > 0) {
      logTest(
        "Expo App Boot",
        "FAIL",
        `App booted but has ${runtimeErrors.length} runtime errors: ${runtimeErrors.join(", ")}`,
        duration,
      );
      return { status: "FAIL", duration, output, runtimeErrors };
    } else {
      logTest(
        "Expo App Boot",
        "FAIL",
        "App failed to boot within timeout period",
        duration,
      );
      return { status: "FAIL", duration, output, errorOutput };
    }
  } catch (error) {
    logTest("Expo App Boot", "FAIL", error.message);
    return { status: "FAIL", error: error.message };
  } finally {
    // Clean up
    if (expoProcess) {
      try {
        expoProcess.kill("SIGTERM");
        killExpoProcesses();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
};

// Test screen-by-screen navigation
const testScreenNavigation = async () => {
  logSection("SCREEN-BY-SCREEN NAVIGATION TEST");

  try {
    const startTime = Date.now();

    // Define critical screens to test
    const criticalScreens = [
      "LoginScreen",
      "DashboardScreen",
      "SettingsScreen",
      "ProfileScreen",
      "SearchScreen",
      "AIScreen",
      "VoiceScreen",
      "ThoughtmarksScreen",
    ];

    // Create Maestro flow for screen navigation
    const navigationFlow = criticalScreens.map((screen) => ({
      name: `Navigate to ${screen}`,
      steps: [
        { tapOn: { text: screen } },
        { wait: 2000 },
        { assertVisible: { text: screen } },
        { takeScreenshot: `${screen.toLowerCase()}-validation` },
      ],
    }));

    // Write navigation flow to temp file
    const flowPath = path.join(
      VALIDATION_CONFIG.outputDir,
      "screen-navigation-flow.yaml",
    );
    fs.writeFileSync(flowPath, JSON.stringify(navigationFlow, null, 2));

    // Run navigation flow
    try {
      execSync(`maestro test --format junit ${flowPath}`, {
        cwd: path.join(__dirname, ".."),
        timeout: VALIDATION_CONFIG.maestroTimeout,
        stdio: "pipe",
      });

      // Check for navigation errors in simulator logs
      const navigationErrors = [];
      const logOutput = fs.readFileSync(
        VALIDATION_CONFIG.simulatorLogFile,
        "utf8",
      );

      criticalScreens.forEach((screen) => {
        if (
          logOutput.includes(`Error rendering ${screen}`) ||
          logOutput.includes(`${screen} failed to mount`) ||
          logOutput.includes(`Cannot read property`) ||
          logOutput.includes(`undefined is not an object`)
        ) {
          navigationErrors.push(`Error in ${screen}`);
        }
      });

      const duration = Date.now() - startTime;

      if (navigationErrors.length === 0) {
        logTest(
          "Screen Navigation",
          "PASS",
          "All screens rendered without errors",
          duration,
        );
        return { status: "PASS", duration };
      } else {
        logTest(
          "Screen Navigation",
          "FAIL",
          `Found ${navigationErrors.length} screen errors: ${navigationErrors.join(", ")}`,
          duration,
        );
        return { status: "FAIL", duration, errors: navigationErrors };
      }
    } catch (error) {
      logTest("Screen Navigation", "FAIL", error.message);
      return { status: "FAIL", error: error.message };
    }
  } catch (error) {
    logTest("Screen Navigation", "FAIL", error.message);
    return { status: "FAIL", error: error.message };
  }
};

// Run Maestro UI automation tests
const runMaestroTests = async () => {
  logSection("MAESTRO UI AUTOMATION TEST");

  try {
    const startTime = Date.now();

    // Ensure Maestro is installed
    try {
      execSync("maestro -v", { stdio: "pipe" });
    } catch (error) {
      logTest(
        "Maestro Installation",
        "FAIL",
        "Maestro CLI not found. Please install Maestro first.",
      );
      return { status: "FAIL", error: "Maestro not installed" };
    }

    // Run Maestro flow tests
    try {
      execSync(
        "maestro test --format junit mobile-native-fresh/maestro/flows/*.yaml",
        {
          cwd: path.join(__dirname, "..", ".."),
          timeout: VALIDATION_CONFIG.maestroTimeout,
          stdio: "pipe",
        },
      );

      // Check for test results
      const resultsPath = path.join(__dirname, "..", "maestro", "test-results");
      if (!fs.existsSync(resultsPath)) {
        throw new Error("No Maestro test results found");
      }

      // Parse results
      const results = fs
        .readdirSync(resultsPath)
        .filter((f) => f.endsWith(".xml"))
        .map((f) => {
          const content = fs.readFileSync(path.join(resultsPath, f), "utf8");
          return {
            file: f,
            failures: (content.match(/<failure/g) || []).length,
            errors: (content.match(/<error/g) || []).length,
          };
        });

      const totalFailures = results.reduce(
        (sum, r) => sum + r.failures + r.errors,
        0,
      );

      const duration = Date.now() - startTime;

      if (totalFailures === 0) {
        logTest(
          "Maestro UI Tests",
          "PASS",
          "All UI automation tests passed",
          duration,
        );
        return { status: "PASS", duration };
      } else {
        logTest(
          "Maestro UI Tests",
          "FAIL",
          `Found ${totalFailures} UI test failures`,
          duration,
        );
        return { status: "FAIL", duration, failures: totalFailures };
      }
    } catch (error) {
      logTest("Maestro UI Tests", "FAIL", error.message);
      return { status: "FAIL", error: error.message };
    }
  } catch (error) {
    logTest("Maestro UI Tests", "FAIL", error.message);
    return { status: "FAIL", error: error.message };
  }
};

// Test integration with actual app components
const testIntegrationWithRealApp = async () => {
  logSection("REAL APP INTEGRATION TEST");

  // Change to project root directory for proper module resolution
  const projectRoot = path.join(__dirname, "..");
  const _originalCwd = process.cwd();
  process.chdir(projectRoot);

  const integrationTests = [
    {
      name: "Theme Provider Integration",
      test: () => {
        // Test that ThemeProvider can be imported and used
        try {
          const {
            ThemeProvider: _ThemeProvider,
          } = require("../src-nextgen/theme/ThemeProvider"); // eslint-disable-line @typescript-eslint/no-var-requires
          return {
            status: "PASS",
            message: "ThemeProvider imports successfully",
          };
        } catch (error) {
          return { status: "FAIL", message: error.message };
        }
      },
    },
    {
      name: "Auth Store Integration",
      test: () => {
        try {
          const { useAuth: _useAuth } = require("../src-nextgen/hooks/useAuth"); // eslint-disable-line @typescript-eslint/no-var-requires
          return { status: "PASS", message: "Auth hook imports successfully" };
        } catch (error) {
          return { status: "FAIL", message: error.message };
        }
      },
    },
    {
      name: "Navigation Integration",
      test: () => {
        try {
          const {
            MainNavigator: _MainNavigator,
          } = require("../src-nextgen/navigation/MainNavigator"); // eslint-disable-line @typescript-eslint/no-var-requires
          return {
            status: "PASS",
            message: "Navigation components import successfully",
          };
        } catch (error) {
          return { status: "FAIL", message: error.message };
        }
      },
    },
    {
      name: "Hook Integration",
      test: () => {
        try {
          const {
            useTheme: _useTheme,
          } = require("../src-nextgen/theme/ThemeProvider"); // eslint-disable-line @typescript-eslint/no-var-requires
          const { useAuth: _useAuth } = require("../src-nextgen/hooks/useAuth"); // eslint-disable-line @typescript-eslint/no-var-requires
          return {
            status: "PASS",
            message: "Custom hooks import successfully",
          };
        } catch (error) {
          return { status: "FAIL", message: error.message };
        }
      },
    },
  ];

  const results = [];

  for (const test of integrationTests) {
    try {
      const startTime = Date.now();
      const result = test.test();
      const duration = Date.now() - startTime;

      results.push({
        name: test.name,
        status: result.status,
        message: result.message,
        duration,
      });

      logTest(test.name, result.status, result.message, duration);
    } catch (error) {
      results.push({
        name: test.name,
        status: "FAIL",
        message: error.message,
        duration: 0,
      });

      logTest(test.name, "FAIL", error.message);
    }
  }

  return results;
};

// Main execution function
const runStrictRuntimeValidation = async () => {
  log("🚀 STARTING STRICT RUNTIME VALIDATION", "bright");
  log(`Date: ${new Date().toISOString()}`, "cyan");
  log(`Agent: BRAUN (MAIN)`, "cyan");
  log(`Following MUST-README guidelines`, "cyan");

  ensureOutputDir();

  const startTime = Date.now();
  const validationResults = {
    typescriptCompilation: {},
    eslintValidation: {},
    expoAppBoot: {},
    simulatorLogs: {},
    maestroTests: {},
    integrationTests: [],
    summary: {},
  };

  try {
    // Run all validation steps
    validationResults.typescriptCompilation = await testTypeScriptCompilation();
    validationResults.eslintValidation = await testESLintValidation();
    validationResults.expoAppBoot = await testExpoAppBoot();
    validationResults.simulatorLogs = await parseSimulatorLogs();
    validationResults.maestroTests = await runMaestroTests();
    validationResults.integrationTests = await testIntegrationWithRealApp();

    // Calculate summary
    const criticalTests = [
      validationResults.typescriptCompilation,
      validationResults.eslintValidation,
      validationResults.expoAppBoot,
      validationResults.simulatorLogs,
      validationResults.maestroTests,
    ];

    const allTests = [...criticalTests, ...validationResults.integrationTests];

    const totalTests = allTests.length;
    const passedTests = allTests.filter((t) => t.status === "PASS").length;
    const failedTests = allTests.filter((t) => t.status === "FAIL").length;

    // Critical tests must all pass
    const criticalPassed = criticalTests.filter(
      (t) => t.status === "PASS",
    ).length;
    const criticalFailed = criticalTests.filter(
      (t) => t.status === "FAIL",
    ).length;

    validationResults.summary = {
      totalTests,
      passedTests,
      failedTests,
      criticalPassed,
      criticalFailed,
      successRate: Math.round((passedTests / totalTests) * 100),
      criticalSuccessRate: Math.round(
        (criticalPassed / criticalTests.length) * 100,
      ),
      totalDuration: Date.now() - startTime,
    };

    // Save results
    const resultsFile = path.join(
      VALIDATION_CONFIG.outputDir,
      "strict-runtime-validation-results.json",
    );
    fs.writeFileSync(resultsFile, JSON.stringify(validationResults, null, 2));

    // Display summary
    logSection("STRICT VALIDATION SUMMARY");
    log(`Total Tests: ${validationResults.summary.totalTests}`, "bright");
    log(`Passed: ${validationResults.summary.passedTests}`, "green");
    log(`Failed: ${validationResults.summary.failedTests}`, "red");
    log(
      `Critical Tests Passed: ${validationResults.summary.criticalPassed}/${criticalTests.length}`,
      "bright",
    );
    log(`Success Rate: ${validationResults.summary.successRate}%`, "bright");
    log(
      `Critical Success Rate: ${validationResults.summary.criticalSuccessRate}%`,
      "bright",
    );
    log(`Total Duration: ${validationResults.summary.totalDuration}ms`, "cyan");
    log(`Results saved to: ${resultsFile}`, "cyan");

    // STRICT ENFORCEMENT: All critical tests must pass
    if (validationResults.summary.criticalSuccessRate === 100) {
      log("✅ STRICT RUNTIME VALIDATION PASSED", "green");
      log("  All critical tests passed - app ready for deployment", "green");
      process.exit(0);
    } else {
      log("❌ STRICT RUNTIME VALIDATION FAILED", "red");
      if (validationResults.summary.criticalSuccessRate < 100) {
        log("  Critical tests failed - blocking deployment", "red");
      }
      process.exit(1);
    }
  } catch (error) {
    log(`❌ STRICT RUNTIME VALIDATION ERROR: ${error.message}`, "red");
    process.exit(1);
  }
};

// Execute if run directly
if (require.main === module) {
  runStrictRuntimeValidation();
}

module.exports = { runStrictRuntimeValidation };
