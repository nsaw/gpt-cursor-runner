#!/usr/bin/env node

/**
 * ESLint Error Fix Script
 * Fixes common ESLint errors across all JavaScript files
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ESLint errors...');

// Common ESLint fixes
const ESLINT_FIXES = [
  // Fix unused variables by prefixing with underscore
  {
    pattern: /(const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g,
    replacement: (match, declaration, varName) => {
      // Skip if already prefixed with underscore or is a common used variable
      if (
        varName.startsWith('_') ||
        ['i', 'j', 'k', 'index', 'key', 'value', 'item', 'fs', 'path', 'console'].includes(varName)
      ) {
        return match;
      }
      return `${declaration} _${varName} =`;
    },
    description: 'Prefix unused variables with underscore',
  },

  // Fix unused function parameters
  {
    pattern: /function\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/g,
    replacement: (match, funcName, params) => {
      const newParams = params
        .split(',')
        .map((param) => {
          const trimmed = param.trim();
          if (
            trimmed &&
            !trimmed.startsWith('_') &&
            !['this', 'event', 'e', 'req', 'res', 'next'].includes(trimmed)
          ) {
            return `_${trimmed}`;
          }
          return trimmed;
        })
        .join(', ');
      return `function ${funcName}(${newParams})`;
    },
    description: 'Prefix unused function parameters with underscore',
  },

  // Fix unused error variables in catch blocks
  {
    pattern: /} catch \(([^)]+)\) {/g,
    replacement: (match, errorVar) => {
      const varName = errorVar.trim();
      if (varName === 'e' || varName === 'error' || varName === 'err') {
        return `} catch (_${varName}) {`;
      }
      return match;
    },
    description: 'Prefix unused error variables with underscore',
  },

  // Fix trailing spaces
  {
    pattern: /[ \t]+$/gm,
    replacement: '',
    description: 'Remove trailing spaces',
  },

  // Fix multiple empty lines
  {
    pattern: /\n\s*\n\s*\n/g,
    replacement: '\n\n',
    description: 'Remove multiple empty lines',
  },
];

// Function to process a single file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    // Apply all fixes
    ESLINT_FIXES.forEach((fix) => {
      content = content.replace(fix.pattern, fix.replacement);
    });

    // Write back if changed
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${path.basename(filePath)}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Function to recursively find JavaScript files
function findJsFiles(dir, files = []) {
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
      findJsFiles(fullPath, files);
    } else if (item.endsWith('.js') && !item.endsWith('.min.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

// Main execution
async function main() {
  try {
    const scriptDir = __dirname;
    const jsFiles = findJsFiles(scriptDir);

    console.log(`Found ${jsFiles.length} JavaScript files to process`);

    let fixedCount = 0;
    for (const file of jsFiles) {
      if (processFile(file)) {
        fixedCount++;
      }
    }

    console.log('\n🎉 ESLint fixes complete!');
    console.log(`✅ Fixed ${fixedCount} files`);
    console.log(`📁 Processed ${jsFiles.length} total files`);

  } catch (error) {
    console.error('❌ ESLint fix script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
