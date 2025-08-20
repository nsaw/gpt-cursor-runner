/* eslint-disable */
const fs = require('fs'); const path = require('path');
const ROOTS = ['/Users/sawyer/gitSync/gpt-cursor-runner/scripts/g2o'];
let count = 0;
const walk = (p) => {
  if (!fs.existsSync(p)) return;
  const st = fs.statSync(p);
  if (st.isDirectory()) return fs.readdirSync(p).forEach(n=>walk(path.join(p,n)));
  
  // Skip the assert file itself and detection files
  const basename = path.basename(p);
  if (basename === 'assert_no_inline_node_e_once.js' || 
      basename === 'inline_node_e_scan_once.js' ||
      basename === 'inline_node_e_guard.js' ||
      basename === 'forbid_inline_node_e_lint_once.js') {
    return;
  }
  
  const txt = fs.readFileSync(p,'utf8');
  const lines = txt.split(/\r?\n/);
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    // Skip comments and documentation
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    // Skip strings that mention node -e
    if (trimmed.includes('`node -e`') || trimmed.includes("'node -e'") || trimmed.includes('"node -e"')) return;
    // Look for actual inline node -e commands using a different pattern
    if (trimmed.includes('node') && trimmed.includes('-e') && !trimmed.includes('//')) {
      // More specific check to avoid false positives
      const parts = trimmed.split(/\s+/);
      for (let j = 0; j < parts.length - 1; j++) {
        if (parts[j] === 'node' && parts[j + 1] === '-e') {
          count++;
          console.log(`[assert] Found inline eval at ${p}:${i+1}: ${trimmed}`);
          break;
        }
      }
    }
  });
};
ROOTS.forEach(walk);
if (count>0) { console.error(`[assert-no-inline-node-e] FAIL: ${count} occurrences remain.`); process.exit(1); }
console.log('[assert-no-inline-node-e] PASS: 0 occurrences.');
