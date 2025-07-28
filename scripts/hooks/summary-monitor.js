// Rewrite of summary-monitor with debounce + validation
const fs = require('fs');
const path = require('path');
const debounce = require('lodash.debounce');
const chalk = require('chalk');
const { GHOST_STATUS_PATH } = require('../constants/paths');

const summariesDir = path.resolve(__dirname, '../../.cursor-cache/CYOPS/summaries');
const debounceDelay = 250;

const onFileChange = debounce((filename) => {
  const filePath = path.join(summariesDir, filename);
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  const status = content.includes('✅') ? 'PASS' : content.includes('❌') ? 'FAIL' : 'UNKNOWN';
  console.log(chalk.blue(`[SUMMARY] ${filename} → ${status}`));
}, debounceDelay);

fs.watch(summariesDir, (event, filename) => {
  if (filename && filename.endsWith('.md')) {
    onFileChange(filename);
  }
}); 