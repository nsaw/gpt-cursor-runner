// Augment doc-runner to parse validation folders
const fs = require('fs');

function safeLog(message) {
  try {
    console.log(message);
  } catch (_error) {
    // Silent fail for EPIPE or other stream errors
    try {
      fs.appendFileSync('/Users/sawyer/gitSync/gpt-cursor-runner/logs/doc-runner.log', 
        `[SAFE_LOG] ${new Date().toISOString()}: ${message}\n`);
    } catch (logError) {}
  }
}

const mainRoot = '/Users/sawyer/gitSync/.cursor-cache/MAIN/validation';
const cyopsRoot = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/validation';

const paths = ['snapshots', 'diff', '.archive', '.completed', '.failed'];
for (const dir of paths) {
  if (!fs.existsSync(`${mainRoot}/${dir}`)) {
    fs.mkdirSync(`${mainRoot}/${dir}`, { recursive: true });
  }
  if (!fs.existsSync(`${cyopsRoot}/${dir}`)) {
    fs.mkdirSync(`${cyopsRoot}/${dir}`, { recursive: true });
  }
}
safeLog('[DOC-RUNNER] Validation path check complete'); 