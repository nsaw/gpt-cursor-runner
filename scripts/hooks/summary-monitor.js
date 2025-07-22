// Summary Monitor — with file existence check and debounce
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const debounce = require('lodash.debounce');

const summariesDir = path.join(__dirname, '../../summaries');

const watcher = chokidar.watch(`${summariesDir}/*.md`, {
  ignoreInitial: true,
  awaitWriteFinish: true
});

function validateSummary(filePath) {
  if (!fs.existsSync(filePath)) return;
  console.log(`[📄 SUMMARY DETECTED] ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  if (!content.includes('✅') && !content.includes('❌')) {
    console.warn('[⚠️ SUMMARY MISSING STATUS]', filePath);
  }
}

watcher.on('add', debounce(validateSummary, 250));
watcher.on('change', debounce(validateSummary, 250)); 