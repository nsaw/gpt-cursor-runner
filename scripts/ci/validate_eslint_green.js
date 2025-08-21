#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

try {
  const reportPath = path.join(
    process.env.HOME || process.cwd(),
    '.cache',
    'eslint-report.now.json',
  );
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  let errorCount = 0;
  let warningCount = 0;

  report.forEach((x) => {
    errorCount += x.errorCount || 0;
    warningCount += x.warningCount || 0;
  });

  if (errorCount > 0 || warningCount > 20) {
    console.error('GREEN-GUARD FAIL', {
      errors: errorCount,
      warnings: warningCount,
    });
    process.exit(1);
  }

  console.log('GREEN-GUARD PASS', {
    errors: errorCount,
    warnings: warningCount,
  });
} catch (err) {
  console.error('GREEN-GUARD ERROR', err.message);
  process.exit(1);
}
