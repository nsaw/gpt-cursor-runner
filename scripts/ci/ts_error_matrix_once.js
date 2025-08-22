/* eslint-disable */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const TSC_OUTPUT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/tsc-pre.txt";
const ERROR_MATRIX = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/ts-error-matrix.json";

(() => {
  console.log("TS_ERROR_MATRIX: Running TypeScript compilation and building error matrix...");
  
  // Run TypeScript compilation
  const tscResult = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
    cwd: ROOT,
    stdio: 'pipe',
    encoding: 'utf8'
  });
  
  const output = (tscResult.stdout || '') + (tscResult.stderr || '');
  
  // Write TSC output
  fs.mkdirSync(path.dirname(TSC_OUTPUT), { recursive: true });
  fs.writeFileSync(TSC_OUTPUT, output);
  
  // Parse errors and build matrix
  const errorLines = output.split('\n').filter(line => 
    line.includes('.ts') && (line.includes('error TS') || line.includes('error:'))
  );
  
  const fileErrors = {};
  const errorTypes = {};
  
  for (const line of errorLines) {
    // Extract file path and error info
    const fileMatch = line.match(/([^:]+\.(?:ts|tsx)):/);
    const errorMatch = line.match(/error (TS\d+):/);
    
    if (fileMatch && errorMatch) {
      const file = fileMatch[1];
      const errorType = errorMatch[1];
      
      if (!fileErrors[file]) {
        fileErrors[file] = { errors: 0, warnings: 0, errorTypes: {} };
      }
      
      fileErrors[file].errors++;
      fileErrors[file].errorTypes[errorType] = (fileErrors[file].errorTypes[errorType] || 0) + 1;
      
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    }
  }
  
  // Build file ranking
  const fileRank = Object.entries(fileErrors)
    .map(([file, stats]) => ({
      file,
      errors: stats.errors,
      warnings: stats.warnings,
      total: stats.errors + stats.warnings,
      errorTypes: stats.errorTypes
    }))
    .sort((a, b) => b.total - a.total);
  
  // Build matrix
  const matrix = {
    timestamp: new Date().toISOString(),
    total_errors: Object.values(fileErrors).reduce((sum, stats) => sum + stats.errors, 0),
    total_warnings: Object.values(fileErrors).reduce((sum, stats) => sum + stats.warnings, 0),
    files_with_errors: Object.keys(fileErrors).length,
    error_types: errorTypes,
    fileRank: fileRank,
    fileErrors: fileErrors
  };
  
  // Write matrix
  fs.mkdirSync(path.dirname(ERROR_MATRIX), { recursive: true });
  fs.writeFileSync(ERROR_MATRIX, JSON.stringify(matrix, null, 2));
  
  console.log(`TS_ERROR_MATRIX_COMPLETE: ${matrix.total_errors} errors, ${matrix.total_warnings} warnings, ${matrix.files_with_errors} files`);
  process.exit(0);
})();
