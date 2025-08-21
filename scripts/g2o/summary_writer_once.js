#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-unused-vars */
const fs = require('fs');
const path = require('path');

function writeSummary(patchId, content) {
  try {
    const summaryPath = path.join(
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
      `summary-${patchId}.md`,
    );
    fs.writeFileSync(summaryPath, content);
    console.log('SUMMARY_WRITTEN');
    return true;
  } catch (error) {
    console.error('FAILED:', error.message);
    return false;
  }
}

function main() {
  const patchId = process.argv[2];
  const content = process.argv[3] || '# Summary\n\nNo content provided.';

  if (!patchId) {
    console.error('NO_PATCH_ID');
    return 1;
  }

  const success = writeSummary(patchId, content);
  return success ? 0 : 1;
}

if (require.main === module) {
  process.exit(main());
}
