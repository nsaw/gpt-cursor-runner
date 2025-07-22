/* ⬅️ PATCHED: Now targets /Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries */
const fs = require('fs');
const path = require('path');
const roots = [
  '/Users/sawyer/gitSync/.cursor-cache/MAIN',
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS'
];

function updateIndex(root) {
  const patches = fs.readdirSync(`${root}/patches`).filter(f => f.endsWith('.json'));
  const completed = fs.readdirSync(`${root}/.completed`).filter(f => f.endsWith('.json'));
  const archive = fs.readdirSync(`${root}/.archive`).filter(f => f.endsWith('.json'));
  const failed = fs.readdirSync(`${root}/.failed`).filter(f => f.endsWith('.json'));
  
  let index = `# Patch Index\n\n## Pending\n`;
  patches.forEach(p => index += `- [ ] ${p}\n`);
  index += `\n## Completed\n`;
  completed.forEach(p => index += `- ✅ ${p}\n`);
  index += `\n## Failed\n`;
  failed.forEach(p => index += `- ❌ ${p}\n`);
  
  fs.writeFileSync(`${root}/INDEX.md`, index);
  fs.writeFileSync(`${root}/README.md`, `# GHOST ROOT — ${path.basename(root)}\n\nMaintained by doc-daemon.js`);
}

function moveStalePatches(root) {
  const patchDir = `${root}/patches`;
  const files = fs.readdirSync(patchDir);
  const now = Date.now();
  
  files.forEach(file => {
    const full = `${patchDir}/${file}`;
    if (!file.endsWith('.json')) return;
    const { birthtimeMs } = fs.statSync(full);
    const age = (now - birthtimeMs) / (1000 * 60 * 60 * 24);
    if (age > 2) {
      fs.renameSync(full, `${root}/.archive/${file}`);
    }
  });
}

function runLoop() {
  roots.forEach(root => {
    if (!fs.existsSync(root)) return;
    moveStalePatches(root);
    updateIndex(root);
  });
  setTimeout(runLoop, 30000);
}

runLoop(); 