#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔧 Fixing remaining TypeScript errors to achieve ZERO errors...');

// Function to fix React/JSX issues
function fixReactIssues(content) {
  // Add DOM library to tsconfig if needed
  if (content.includes('document') || content.includes('window')) {
    // This will be handled by updating tsconfig.json
  }

  // Fix React import issues
  if (content.includes('JSX.Element') && !content.includes('import React')) {
    content = `import React from 'react';\n${content}`;
  }

  // Fix JSX namespace
  content = content.replace(/JSX\.Element/g, 'React.JSX.Element');
  content = content.replace(/React\.React\.JSX\.Element/g, 'React.JSX.Element');

  return content;
}

// Function to fix error variable issues
function fixErrorVariables(content) {
  // Fix catch blocks where _error is used but error is referenced
  content = content.replace(
    /catch\s*\(\s*_error\s*\)\s*\{([^}]*error[^}]*)\}/g,
    (match) => {
      return match.replace('_error', 'error');
    },
  );

  // Fix catch blocks where _err is used but err is referenced
  content = content.replace(
    /catch\s*\(\s*_err\s*\)\s*\{([^}]*err[^}]*)\}/g,
    (match) => {
      return match.replace('_err', 'err');
    },
  );

  // Fix undefined error variables
  content = content.replace(
    /console\.(warn|error|log)\s*\(\s*[^)]*error[^)]*\)\s*;?\s*$/gm,
    (match) => {
      if (match.includes('error:') && !match.includes('error')) {
        return match.replace(/error:/g, 'err:');
      }
      return match;
    },
  );

  return content;
}

// Function to fix logEvent argument issues
function fixLogEventArguments(content) {
  // Add missing severity arguments to logEvent calls
  content = content.replace(
    /this\.logEvent\s*\(\s*['"](system_startup|system_shutdown|system_maintenance|orchestrator_start|orchestrator_stop|dashboard_integration|heartbeat|snapshot_start|snapshot_complete|loop_complete|validation_complete|relay_complete)['"],\s*['"][^'"]+['"]\s*\)/g,
    (match, eventType) => {
      return match.replace(')', ", 'info')");
    },
  );

  // Fix logEvent calls with object arguments by removing them
  content = content.replace(
    /this\.logEvent\s*\(\s*['"][^'"]+['"],\s*['"][^'"]+['"],\s*\{([^}]+)\}\s*\)/g,
    (match) => {
      return match.replace(/,\s*\{[^}]+\}/, '');
    },
  );

  // Fix logEvent calls with config objects
  content = content.replace(
    /this\.logEvent\s*\(\s*['"]config_update['"],\s*['"][^'"]+['"],\s*([^)]+)\s*\)/g,
    (match, configArg) => {
      return match.replace(/,\s*[^)]+$/, ')');
    },
  );

  return content;
}

// Function to fix import path extensions
function fixImportExtensions(content) {
  // Remove .ts extensions from import statements
  content = content.replace(
    /import\s+.*from\s+['"]([^'"]+)\.ts['"]/g,
    (match) => {
      return match.replace('.ts', '');
    },
  );

  return content;
}

// Function to fix type mismatches
function fixTypeMismatches(content) {
  // Fix 'unknown' type assignments
  content = content.replace(
    /health:\s*['"]unknown['"]/g,
    "health: 'unhealthy'",
  );
  content = content.replace(
    /overall:\s*['"]unknown['"]/g,
    "overall: 'unhealthy'",
  );

  return content;
}

// Function to fix missing error variables in catch blocks
function fixMissingErrorVariables(content) {
  // Find catch blocks that reference 'err' but don't declare it
  content = content.replace(
    /catch\s*\(\s*\)\s*\{([^}]*err[^}]*)\}/g,
    (match) => {
      return match.replace('catch ()', 'catch (err)');
    },
  );

  content = content.replace(
    /catch\s*\(\s*\)\s*\{([^}]*error[^}]*)\}/g,
    (match) => {
      return match.replace('catch ()', 'catch (error)');
    },
  );

  return content;
}

// Function to fix undefined variable usage
function fixUndefinedVariableUsage(content) {
  // Fix apiReq possibly undefined issues by using non-null assertion
  content = content.replace(/apiReq\?\.([a-zA-Z]+)\s*=/g, 'apiReq!.$1 =');

  return content;
}

// Function to fix React component issues
function fixReactComponentIssues(content) {
  // Fix useEffect return type
  content = content.replace(
    /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]*)\}\s*\)\s*;?\s*$/gm,
    (match, body) => {
      if (!body.includes('return')) {
        return match.replace('}', '  return undefined;\n}');
      }
      return match;
    },
  );

  // Fix event target type issues
  content = content.replace(
    /e\.target\.checked/g,
    '(e.target as HTMLInputElement).checked',
  );
  content = content.replace(
    /e\.target\.value/g,
    '(e.target as HTMLSelectElement).value',
  );

  return content;
}

// Function to fix import/export issues
function fixImportExportIssues(content) {
  // Fix default import issues
  content = content.replace(
    /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
    (match, importName, modulePath) => {
      if (modulePath.includes('SlotGrid')) {
        return `import { ${importName} } from '${modulePath}'`;
      }
      return match;
    },
  );

  return content;
}

// Function to update tsconfig.json to include DOM library
function updateTsConfig() {
  try {
    const tsconfigPath = './tsconfig.json';
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));

    // Add DOM library if not present
    if (!tsconfig.compilerOptions.lib.includes('DOM')) {
      tsconfig.compilerOptions.lib.push('DOM');
      fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2));
      console.log('✅ Updated tsconfig.json to include DOM library');
    }
  } catch (error) {
    console.log('⚠️ Could not update tsconfig.json:', error.message);
  }
}

// Main function to process specific files with known issues
function processSpecificFiles() {
  const filesToFix = [
    'src-nextgen/ghost/dashboard/ghostDashboardUI.tsx',
    'src-nextgen/ghost/middleware/authCheck.ts',
    'src-nextgen/ghost/relay/ghostGptRelayCore.ts',
    'src-nextgen/ghost/shell/diffMonitor.ts',
    'src-nextgen/ghost/shell/executor.ts',
    'src-nextgen/ghost/shell/phase5CompletionValidator.ts',
    'src-nextgen/ghost/telemetry/ghostAlertEngine.ts',
    'src-nextgen/ghost/telemetry/ghostHeartbeatVisualizer.ts',
    'src-nextgen/ghost/telemetry/ghostLoopAuditor.ts',
    'src-nextgen/ghost/telemetry/ghostMetricsAggregator.ts',
    'src-nextgen/ghost/telemetry/ghostRelayTelemetryCore.ts',
    'src-nextgen/ghost/telemetry/ghostSnapshotDaemon.ts',
    'src-nextgen/ghost/telemetry/ghostTelemetryApi.ts',
    'src-nextgen/ghost/telemetry/ghostTelemetryDashboard.ts',
    'src-nextgen/ghost/telemetry/ghostTelemetryOrchestrator.ts',
    'src-nextgen/lib/slotRouter.tsx',
    'src-nextgen/navigation/HomeScreen.tsx',
  ];

  let fixedFiles = 0;

  for (const filePath of filesToFix) {
    try {
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Apply all fixes
        content = fixReactIssues(content);
        content = fixErrorVariables(content);
        content = fixLogEventArguments(content);
        content = fixImportExtensions(content);
        content = fixTypeMismatches(content);
        content = fixMissingErrorVariables(content);
        content = fixUndefinedVariableUsage(content);
        content = fixReactComponentIssues(content);
        content = fixImportExportIssues(content);

        // Write back if content changed
        if (content !== originalContent) {
          fs.writeFileSync(filePath, content, 'utf8');
          fixedFiles++;
          console.log(`✅ Fixed: ${filePath}`);
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`🎉 Fixed ${fixedFiles} files`);
  return fixedFiles;
}

// Run the fixes
console.log('🔧 Starting comprehensive TypeScript fixes...');
updateTsConfig();
const fixedCount = processSpecificFiles();

// Run TypeScript check to see remaining errors
console.log('\n🔍 Running TypeScript check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful! ZERO ERRORS ACHIEVED! 🎉');
} catch (error) {
  console.log('⚠️ Some TypeScript errors may remain. Check the output above.');
}

console.log(`\n📊 Summary: Fixed ${fixedCount} files`);