/* eslint-disable */
const fs = require('fs'); const path = require('path');
const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const dirs = [
  '.expo', '.expo-shared', '.metro-cache', 'node_modules/.cache',
  'android/build', 'ios/build', 'tmp', '.tmp'
].map(d => path.join(ROOT, d));
let removed = 0;
for (const d of dirs) {
  try { fs.rmSync(d, { recursive: true, force: true }); removed++; } catch {}
}
console.log(`[clean-caches:fallback] removed ${removed} cache dirs (best-effort)`);
