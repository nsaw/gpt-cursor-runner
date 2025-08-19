#!/usr/bin/env node
const fs = require('fs');

function printSampleDiffs(reportPath, count = 5) {
  try {
    if (!fs.existsSync(reportPath)) {
      console.log(`No migrate-nb-report.json at ${reportPath}`);
      process.exit(0);
    }
    
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    const files = (report.files || []).slice(0, Number(count));
    
    for (const f of files) {
      console.log(f);
    }
  } catch (error) {
    console.error(`Error reading report: ${error.message}`);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node print_sample_diffs_once.js <reportPath> [count]');
  process.exit(1);
}

printSampleDiffs(args[0], args[1]);
