#!/usr/bin/env node

const _fs = require("fs");
const { _execSync } = require("child_process");

console.log("🔧 Final TypeScript error fixes...");

// Function to fix console replacement issues
function fixConsoleIssues(_content) {
  // Fix consolerror back to console
  content = content.replace(/consolerror/g, "console");

  return content;
}

// Function to fix logEvent argument issues
function fixLogEventArguments(_content) {
  // Add missing severity arguments to logEvent calls
  content = content.replace(
    /this\.logEvent\s*\(\s*['"](system_startup|system_shutdown|system_maintenance|orchestrator_start|orchestrator_stop|dashboard_integration|heartbeat|snapshot_start|snapshot_complete|loop_complete|validation_complete|relay_complete)['"],\s*['"][^'"]+['"]\s*\)/g,
    (_match, _eventType) => {
      return match.replace(")", ", 'info')");
    },
  );

  // Remove third argument from logEvent calls that expect only 2
  content = content.replace(
    /this\.logEvent\s*\(\s*['"][^'"]+['"],\s*['"][^'"]+['"],\s*['"](info|error|warn|debug)['"]\s*\)/g,
    (_match) => {
      return match.replace(/,\s*['"](info|error|warn|debug)['"]/, "");
    },
  );

  // Fix logEvent calls with object arguments
  content = content.replace(
    /this\.logEvent\s*\(\s*['"][^'"]+['"],\s*['"][^'"]+['"],\s*\{([^}]+)\}\s*\)/g,
    (_match) => {
      return match.replace(/,\s*\{[^}]+\}/, "");
    },
  );

  return content;
}

// Function to fix import path extensions
function fixImportExtensions(_content) {
  // Remove .ts extensions from import statements
  content = content.replace(
    /import\s+.*from\s+['"]([^'"]+)\.ts['"]/g,
    (_match) => {
      return match.replace(".ts", "");
    },
  );

  return content;
}

// Function to fix type mismatches
function fixTypeMismatches(_content) {
  // Fix 'unknown' type assignments
  content = content.replace(
    /health:\s*['"]unknown['"]/g,
    'health: "unhealthy"',
  );
  content = content.replace(
    /overall:\s*['"]unknown['"]/g,
    'overall: "unhealthy"',
  );

  return content;
}

// Function to fix error variable issues
function fixErrorVariables(_content) {
  // Fix catch blocks where _error is used but error is referenced
  content = content.replace(
    /catch\s*\(\s*_error\s*\)\s*\{([^}]*error[^}]*)\}/g,
    (_match) => {
      return match.replace("_error", "error");
    },
  );

  // Fix catch blocks where _err is used but err is referenced
  content = content.replace(
    /catch\s*\(\s*_err\s*\)\s*\{([^}]*err[^}]*)\}/g,
    (_match) => {
      return match.replace("_err", "err");
    },
  );

  return content;
}

// Function to fix undefined variable usage
function fixUndefinedVariableUsage(_content) {
  // Fix apiReq possibly undefined issues by using non-null assertion
  content = content.replace(/apiReq\?\.([a-zA-Z]+)\s*=/g, "apiReq!.$1 =");

  return content;
}

// Function to fix React/JSX issues
function fixReactIssues(_content) {
  // Add React import { _{ _if missing and JSX is used
  if (content.includes("JSX.Element") && !content.includes("import React")) {
    content = `import React } } from 'react';\n${content}`;
  }

  // Fix JSX namespace
  content = content.replace(/JSX\.Element/g, "React.JSX.Element");

  return content;
}

// Function to fix missing error variables in catch blocks
function fixMissingErrorVariables(_content) {
  // Find catch blocks that reference 'err' but don't declare it
  content = content.replace(
    /catch\s*\(\s*\)\s*\{([^}]*err[^}]*)\}/g,
    (_match) => {
      return match.replace("catch ()", "catch (err)");
    },
  );

  content = content.replace(
    /catch\s*\(\s*\)\s*\{([^}]*error[^}]*)\}/g,
    (_match) => {
      return match.replace("catch ()", "catch (error)");
    },
  );

  return content;
}

// Function to fix error type issues
function fixErrorTypeIssues(_content) {
  // Fix error.message access on unknown type
  content = content.replace(
    /error\.message/g,
    "error instanceof Error ? error.message : String(error)",
  );

  return content;
}

// Main function to process specific files with known issues
function processSpecificFiles() {
  const _filesToFix = [
    "src-nextgen/ghost/config/centralizedEnvironmentConfig.ts",
    "src-nextgen/ghost/dashboard/ghostDashboardUI.tsx",
    "src-nextgen/ghost/middleware/authCheck.ts",
    "src-nextgen/ghost/relay/ghostGptRelayCore.ts",
    "src-nextgen/ghost/shell/diffMonitor.ts",
    "src-nextgen/ghost/shell/executor.ts",
    "src-nextgen/ghost/shell/phase5CompletionValidator.ts",
    "src-nextgen/ghost/telemetry/ghostAlertEngine.ts",
    "src-nextgen/ghost/telemetry/ghostHeartbeatVisualizer.ts",
    "src-nextgen/ghost/telemetry/ghostLoopAuditor.ts",
    "src-nextgen/ghost/telemetry/ghostMetricsAggregator.ts",
    "src-nextgen/ghost/telemetry/ghostRelayTelemetryCore.ts",
    "src-nextgen/ghost/telemetry/ghostSnapshotDaemon.ts",
    "src-nextgen/ghost/telemetry/ghostTelemetryApi.ts",
    "src-nextgen/ghost/telemetry/ghostTelemetryDashboard.ts",
    "src-nextgen/ghost/telemetry/ghostTelemetryOrchestrator.ts",
    "src-nextgen/lib/slotRouter.tsx",
    "src-nextgen/navigation/HomeScreen.tsx",
  ];

  const _fixedFiles = 0;

  for (const filePath of filesToFix) {
    try {
      if (fs.existsSync(filePath)) {
        const _content = fs.readFileSync(filePath, "utf8");
        const _originalContent = content;

        // Apply all fixes
        content = fixConsoleIssues(content);
        content = fixLogEventArguments(content);
        content = fixImportExtensions(content);
        content = fixTypeMismatches(content);
        content = fixErrorVariables(content);
        content = fixUndefinedVariableUsage(content);
        content = fixReactIssues(content);
        content = fixMissingErrorVariables(content);
        content = fixErrorTypeIssues(content);

        // Write back if content changed
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, "utf8");
          fixedFiles++;
          console.log(`✅ Fixed: ${filePath}`);
        }
      }
    } catch (_error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`🎉 Fixed ${fixedFiles} files`);
  return fixedFiles;
}

// Run the fixes
const _fixedCount = processSpecificFiles();

// Run TypeScript check to see remaining errors
console.log("\n🔍 Running TypeScript check...");
try {
  execSync("npx tsc --noEmit", { stdio: "inherit" });
  console.log("✅ TypeScript compilation successful!");
} catch (_error) {
  console.log("⚠️ Some TypeScript errors may remain. Check the output above.");
}

console.log(`\n📊 Summary: Fixed ${fixedCount} files`);
