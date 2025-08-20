#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Starting TypeScript error fixes...');

// Function to recursively find all TypeScript files
function findTsFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !item.startsWith('.') &&
      item !== 'node_modules' &&
      item !== 'dist'
    ) {
      findTsFiles(fullPath, files);
    } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Function to fix catch block error variables
function fixCatchBlockErrors(content) {
  // Fix catch blocks where _err is used but err is referenced
  content = content.replace(
    /catch\s*\(\s*_err\s*\)\s*\{([^}]*err[^}]*)\}/g,
    (match, body) => {
      return match.replace('_err', 'err');
    },
  );

  // Fix catch blocks where _error is used but error is referenced
  content = content.replace(
    /catch\s*\(\s*_error\s*\)\s*\{([^}]*error[^}]*)\}/g,
    (match, body) => {
      return match.replace('_error', 'error');
    },
  );

  return content;
}

// Function to fix unused error variables by adding underscore prefix
function fixUnusedErrorVariables(content) {
  // Find catch blocks where error variable is not used in the body
  content = content.replace(
    /catch\s*\(\s*error\s*\)\s*\{([^}]*)\}/g,
    (match, body) => {
      // If error is not referenced in the body, prefix with underscore
      if (!body.includes('error') && !body.includes('Error')) {
        return match.replace('catch (error)', 'catch (_error)');
      }
      return match;
    },
  );

  return content;
}

// Function to fix import path extensions
function fixImportExtensions(content) {
  // Remove .ts extensions from import statements
  content = content.replace(
    /import\s+.*from\s+['"]([^'"]+)\.ts['"]/g,
    (match, importPath) => {
      return match.replace('.ts', '');
    },
  );

  return content;
}

// Function to fix type mismatches
function fixTypeMismatches(content) {
  // Fix 'unknown' type assignments to health status
  content = content.replace(
    /health:\s*['"]unknown['"]/g,
    'health: \'unhealthy\'',
  );
  content = content.replace(
    /overall:\s*['"]unknown['"]/g,
    'overall: \'unhealthy\'',
  );

  return content;
}

// Function to fix logEvent argument count issues
function fixLogEventArguments(content) {
  // Fix logEvent calls with wrong number of arguments
  content = content.replace(
    /this\.logEvent\s*\(\s*['"][^'"]+['"],\s*['"][^'"]+['"],\s*['"][^'"]+['"],\s*([^)]+)\)/g,
    (match, extraArgs) => {
      // Remove the third argument (level) if it's a string
      return match.replace(/,\s*['"](info|error|warn|debug)['"]/, '');
    },
  );

  return content;
}

// Function to fix variable usage before assignment
function fixVariableUsageBeforeAssignment(content) {
  // Fix apiReq usage before assignment
  content = content.replace(
    /let\s+apiReq[^]*;\s*([^}]*apiReq[^}]*)\}/g,
    (match, body) => {
      return match.replace(/let\s+apiReq/, 'let apiReq: any');
    },
  );

  return content;
}

// Main function to process all TypeScript files
function processTsFiles() {
  const tsFiles = findTsFiles('./src-nextgen');
  console.log(`📁 Found ${tsFiles.length} TypeScript files to process`);

  let fixedFiles = 0;

  for (const filePath of tsFiles) {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      const originalContent = content;

      // Apply all fixes
      content = fixCatchBlockErrors(content);
      content = fixUnusedErrorVariables(content);
      content = fixImportExtensions(content);
      content = fixTypeMismatches(content);
      content = fixLogEventArguments(content);
      content = fixVariableUsageBeforeAssignment(content);

      // Write back if content changed
      if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        fixedFiles++;
        console.log(`✅ Fixed: ${filePath}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${filePath}:`, error.message);
    }
  }

  console.log(`🎉 Fixed ${fixedFiles} files`);
  return fixedFiles;
}

// Run the fixes
const fixedCount = processTsFiles();

// Run TypeScript check to see remaining errors
console.log('\n🔍 Running TypeScript check...');
try {
  execSync('npx tsc --noEmit', { stdio: 'inherit' });
  console.log('✅ TypeScript compilation successful!');
} catch (error) {
  console.log('⚠️ Some TypeScript errors may remain. Check the output above.');
}

console.log(`\n📊 Summary: Fixed ${fixedCount} files`);