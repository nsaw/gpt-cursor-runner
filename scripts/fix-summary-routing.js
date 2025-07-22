module.exports = function enforceSummaryPaths(filePath) {
  const path = require('path');
  const isBraun = process.env.AGENT === 'BRAUN';
  const root = isBraun ? '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries' : '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';
  return path.join(root, path.basename(filePath));
} 