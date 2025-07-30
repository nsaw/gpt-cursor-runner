// Updated snapshot-mirror.js
const _fs = require('fs');
const _path = require('path');

function safeLog(_message) {
  try {
    console.log(message);
  } catch (_error) {
    // Silent fail for EPIPE or other stream errors
    try {
      fs.appendFileSync('/Users/sawyer/gitSync/gpt-cursor-runner/logs/snapshot-mirror.log', 
        `[SAFE_LOG] ${new Date().toISOString()}: ${message}\n`);
    } catch (logError) {}
  }
}

const _SOURCE_PATHS = [
  '/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/validation/snapshots',
  '/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/validation/diff'
];

const _TARGETS = [
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS/validation/snapshots',
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS/validation/diff',
  '/Users/sawyer/gitSync/.cursor-cache/MAIN/validation/snapshots',
  '/Users/sawyer/gitSync/.cursor-cache/MAIN/validation/diff'
];

function mirrorValidation(_source, _target) {
  if (!fs.existsSync(source)) return;
  fs.readdirSync(source).forEach(file => {
    const _src = path.join(source, file);
    const _tgt = path.join(target, file);
    const _srcStat = fs.statSync(src);
    
    // Only process files, not directories
    if (srcStat.isFile()) {
      if (!fs.existsSync(tgt) || fs.readFileSync(src, 'utf8') !== fs.readFileSync(tgt, 'utf8')) {
        fs.copyFileSync(src, tgt);
      }
    }
  });
}

for (const srcPath of SOURCE_PATHS) {
  for (const tgtPath of TARGETS) {
    mirrorValidation(srcPath, tgtPath);
  }
} 