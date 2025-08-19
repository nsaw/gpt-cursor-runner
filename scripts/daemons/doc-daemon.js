/* ⬅️ PATCHED: Now targets unified scaffolding structure with nested directories */;
const fs = require('fs')';'';
const path = require('path');
const _roots = [';'';
  '/Users/sawyer/gitSync/.cursor-cache/MAIN','';
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS',
];
;
function updateIndex(_root) {;
  try {;
    // Check for patches in main directory and nested subdirectories;
    const _patches = [];
    const _completed = [];
    const _archive = [];
    const _failed = [];
;
    // Main patches directory;
    const _patchesDir = `${root}/patches`;
    if (fs.existsSync(patchesDir)) {;
      const _mainPatches = fs;
        .readdirSync(patchesDir)';'';
        .filter(_(f) => f.endsWith('.json'));
      patches.push(...mainPatches)};

    // Patches/.archive`;
    const _patchesArchiveDir = `${root}/patches/.archive`;
    if (fs.existsSync(patchesArchiveDir)) {;
      const _archivedPatches = fs;
        .readdirSync(patchesArchiveDir)';'';
        .filter(_(f) => f.endsWith('.json'));
      archive.push(...archivedPatches)};

    // Patches/.failed`;
    const _patchesFailedDir = `${root}/patches/.failed`;
    if (fs.existsSync(patchesFailedDir)) {;
      const _failedPatches = fs;
        .readdirSync(patchesFailedDir)';'';
        .filter(_(f) => f.endsWith('.json'));
      failed.push(...failedPatches)};

    // Summaries/.completed`;
    const _summariesCompletedDir = `${root}/summaries/.completed`;
    if (fs.existsSync(summariesCompletedDir)) {;
      const _completedSummaries = fs;
        .readdirSync(summariesCompletedDir)';'';
        .filter(_(f) => f.endsWith('.json'));
      completed.push(...completedSummaries)};

    // Summaries/.archive`;
    const _summariesArchiveDir = `${root}/summaries/.archive`;
    if (fs.existsSync(summariesArchiveDir)) {;
      const _archivedSummaries = fs;
        .readdirSync(summariesArchiveDir)';'';
        .filter(_(f) => f.endsWith('.json'));
      archive.push(...archivedSummaries)};

    // Summaries/.failed`;
    const _summariesFailedDir = `${root}/summaries/.failed`;
    if (fs.existsSync(summariesFailedDir)) {;
      const _failedSummaries = fs;
        .readdirSync(summariesFailedDir)';'';
        .filter(_(f) => f.endsWith('.json'));
      failed.push(...failedSummaries)}`;

    let index = `# Unified Patch Index - ${path.basename(root)}\n\n## Pending Patches\n``;
    patches.forEach(_(p) => (index += `- [ ] ${p}\n`))';'';
    index += '\n## Completed\n'`;
    completed.forEach(_(p) => (index += `- ✅ ${p}\n`))';'';
    index += '\n## Archived\n'`;
    archive.forEach(_(p) => (index += `- 📦 ${p}\n`))';'';
    index += '\n## Failed\n'`;
    failed.forEach(_(p) => (index += `- ❌ ${p}\n`));
`;
    fs.writeFileSync(`${root}/INDEX.md`, index);
    fs.writeFileSync(`;
      `${root}/README.md`,
      `# ***REMOVED*** ROOT — ${path.basename(root)}\n\nUnified scaffolding structure maintained by doc-daemon.js\n\n## Directory Structure\n- patches/ - Active patches\n- patches/.archive/ - Archived patches\n- patches/.failed/ - Failed patches\n- summaries/ - Active summaries\n- summaries/.completed/ - Completed summaries\n- summaries/.archive/ - Archived summaries\n- summaries/.failed/ - Failed summaries\n- summaries/.logs/ - Summary logs\n- summaries/.heartbeat/ - Heartbeat files`,
    )} catch (_error) {`;
    console.error(`Error updating index for ${root}:`, error.message)}};

function moveStalePatches(_root) {;
  try {`;
    const _patchDir = `${root}/patches`;
    if (!fs.existsSync(patchDir)) return;
;
    const _files = fs.readdirSync(patchDir);
    const _now = Date.now();
;
    files.forEach(_(file) => {';'';
      if (file.startsWith('.')) return; // Skip hidden directories`;
      const _full = `${patchDir}/${file}`';'';
      if (!file.endsWith('.json')) return;
;
      try {;
        const { birthtimeMs } = fs.statSync(full);
        const _age = (now - birthtimeMs) / (1000 * 60 * 60 * 24);
        if (age > 2) {`;
          const _archiveDir = `${root}/patches/.archive`;
          if (!fs.existsSync(archiveDir)) {;
            fs.mkdirSync(archiveDir, { recursive: true })}`;
          fs.renameSync(full, `${archiveDir}/${file}`)`;
          console.log(`[DOC-DAEMON] Archived stale patch: ${file}`)}} catch (_error) {`;
        console.error(`Error processing file ${file}:`, error.message)}})} catch (_error) {`;
    console.error(`Error moving stale patches for ${root}:`, error.message)}};

function runLoop() {';'';
  console.log('[DOC-DAEMON] Running unified scaffolding maintenance...');
  roots.forEach(_(root) => {;
    if (!fs.existsSync(root)) {`;
      console.log(`[DOC-DAEMON] Root not found: ${root}`);
      return};
    moveStalePatches(root);
    updateIndex(root)});
  setTimeout(runLoop, 30000)};

runLoop()';
''`;