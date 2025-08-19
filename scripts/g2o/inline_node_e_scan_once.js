#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function scanInlineNodeE(rootPath, excludePath = null) {
  const violations = [];

  function scanDirectory(dirPath) {
    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        // Skip excluded path
        if (excludePath && fullPath.startsWith(excludePath)) {
          continue;
        }

        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else if (stat.isFile() && (item.endsWith('.js') || item.endsWith('.sh') || item.endsWith('.json'))) {
          scanFile(fullPath);
        }
      }
    } catch (error) {
      console.error(`SCAN_ERROR:${dirPath}:${error.message}`);
    }
  }

  function scanFile(filePath) {
    try {
      // Skip the scanner file itself
      if (path.basename(filePath) === 'inline_node_e_scan_once.js') {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;

        // Skip comments
        if (line.trim().startsWith('//')) {
          continue;
        }

        // Look for actual inline node -e patterns (not just mentions)
        if (line.includes('node -e ') || line.includes('node -e"') || line.includes('node -e\'')) {
          // Additional check to ensure it's an actual command, not just a comment or string
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('node -e') ||
            trimmedLine.includes(' && node -e') ||
            trimmedLine.includes(' | node -e') ||
            trimmedLine.includes('; node -e')) {
            violations.push({
              file: filePath,
              line: lineNum,
              content: line.trim(),
              type: 'inline_node_e'
            });
          }
        }
      }
    } catch (error) {
      console.error(`FILE_SCAN_ERROR:${filePath}:${error.message}`);
    }
  }

  scanDirectory(rootPath);
  return violations;
}

function main() {
  const args = process.argv.slice(2);
  let rootPath = null;
  let jsonOutPath = null;
  let excludePath = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root' && i + 1 < args.length) {
      rootPath = args[i + 1];
      i++;
    } else if (args[i] === '--json-out' && i + 1 < args.length) {
      jsonOutPath = args[i + 1];
      i++;
    } else if (args[i] === '--exclude' && i + 1 < args.length) {
      excludePath = args[i + 1];
      i++;
    }
  }

  if (!rootPath) {
    console.error('Usage: node inline_node_e_scan_once.js --root <path> --json-out <path> [--exclude <path>]');
    return 1;
  }

  if (!fs.existsSync(rootPath)) {
    console.error(`ROOT_PATH_NOT_FOUND:${rootPath}`);
    return 1;
  }

  const violations = scanInlineNodeE(rootPath, excludePath);

  const result = {
    scan_time: new Date().toISOString(),
    root_path: rootPath,
    exclude_path: excludePath,
    total_violations: violations.length,
    violations
  };

  if (jsonOutPath) {
    try {
      // Ensure directory exists
      const dir = path.dirname(jsonOutPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(jsonOutPath, JSON.stringify(result, null, 2));
      console.log(`SCAN_COMPLETE:${violations.length} violations written to ${jsonOutPath}`);
    } catch (error) {
      console.error(`JSON_WRITE_ERROR:${jsonOutPath}:${error.message}`);
      return 1;
    }
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  return 0;
}

const exitCode = main();
process.exit(exitCode);
