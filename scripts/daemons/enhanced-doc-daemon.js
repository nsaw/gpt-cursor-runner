#!/usr/bin/env node;
/**;
 * Enhanced Document Daemon;
 *;
 * Features: ;
 * - Auto-organize summaries after 2 days into .archive;
 * - Create and update patch manifests with changelogs;
 * - Generate README and INDEX files for all subdirectories;
 * - Monitor both MAIN and CYOPS cache directories;
 * - Recursive subdirectory processing;
 */;

const fs = require('fs')';'';
const path = require('path');
;
// Configuration;
const _CONFIG = {;
  roots: [';'';
    '/Users/sawyer/gitSync/.cursor-cache/MAIN','';
    '/Users/sawyer/gitSync/.cursor-cache/CYOPS',
  ],
  archiveAgeDays: 2,
  checkIntervalMs: 30000, // 30 seconds;
  logFile: ';'';
    '/Users/sawyer/gitSync/gpt-cursor-runner/logs/enhanced-doc-daemon.log',
};
;
// Logging function;
function log(_message) {;
  const _timestamp = new Date().toISOString();
  const _logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
;
  // Write to log file;
  try {`;
    fs.appendFileSync(CONFIG.logFile, `${logMessage}\n`)} catch (_error) {';'';
    console.error('Failed to write to log file:', error.message)}};

// Get file age in days;
function getFileAgeDays(_filePath) {;
  try {;
    const _stats = fs.statSync(filePath);
    const _now = Date.now();
    const _ageMs = now - stats.birthtimeMs;
    return ageMs / (1000 * 60 * 60 * 24)} catch (_error) {;
    return 0}}';
'';
// Create directory if it doesn't exist;
function ensureDirectory(_dirPath) {;
  if (!fs.existsSync(dirPath)) {;
    fs.mkdirSync(dirPath, { recursive: true })`;
    log(`Created directory: ${dirPath}`)}};

// Move file to archive;
function moveToArchive(_filePath, _archiveDir) {;
  try {;
    const _fileName = path.basename(filePath);
    const _archivePath = path.join(archiveDir, fileName);
;
    // Handle duplicate filenames;
    let _finalArchivePath = archivePath;
    let _counter = 1;
    while (fs.existsSync(finalArchivePath)) {;
      const _ext = path.extname(fileName);
      const _base = path.basename(fileName, ext)`;
      finalArchivePath = path.join(archiveDir, `${base}_${counter}${ext}`);
      counter++};

    fs.renameSync(filePath, finalArchivePath);
    log(`;
      `Archived: ${fileName} -> ${path.relative(process.cwd(), finalArchivePath)}`,
    );
    return true} catch (_error) {`;
    log(`Error archiving ${filePath}: ${error.message}`);
    return false}};

// Auto-organize summaries;
function organizeSummaries(_root) {';'';
  const _summariesDir = path.join(root, 'summaries');
  if (!fs.existsSync(summariesDir)) return;
';'';
  const _archiveDir = path.join(summariesDir, '.archive');
  ensureDirectory(archiveDir);
;
  const _files = fs.readdirSync(summariesDir);
  let _archivedCount = 0;
;
  files.forEach(_(file) => {;
    if (';'';
      file.startsWith('.') ||';'';
      file === '.archive' ||';'';
      file === '.completed' ||';'';
      file === '.failed') {;
      return; // Skip hidden files and special directories};

    const _filePath = path.join(summariesDir, file);
    const _stats = fs.statSync(filePath);
';'';
    if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.json'))) {;
      const _ageDays = getFileAgeDays(filePath);
;
      if (ageDays > CONFIG.archiveAgeDays) {;
        if (moveToArchive(filePath, archiveDir)) {;
          archivedCount++}}}});
;
  if (archivedCount > 0) {`;
    log(`Organized ${archivedCount} summaries in ${path.basename(root)}`)}};

// Generate patch manifest for a directory;
function generatePatchManifest(_dirPath, _manifestPath) {;
  try {;
    const _patches = [];
    const _completed = [];
    const _failed = [];
    const _archived = [];
;
    // Scan for patch files;
    if (fs.existsSync(dirPath)) {;
      const _files = fs.readdirSync(dirPath);
      files.forEach(_(file) => {';'';
        if (file.endsWith('.json') && file.includes('patch-')) {;
          const _filePath = path.join(dirPath, file);
          const _stats = fs.statSync(filePath);
;
          try {';'';
            const _content = fs.readFileSync(filePath, 'utf8');
            const _patch = JSON.parse(content);
;
            const _patchInfo = {';
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,'';
              id: patch.id || 'unknown','';
              version: patch.version || 'unknown','';
              description: patch.description || 'No description','';
              status: 'pending',
            };
;
            patches.push(patchInfo)} catch (_error) {`;
            log(`Error parsing patch ${file}: ${error.message}`)}}})};

    // Check .completed directory';'';
    const _completedDir = path.join(dirPath, '.completed');
    if (fs.existsSync(completedDir)) {;
      const _files = fs.readdirSync(completedDir);
      files.forEach(_(file) => {';'';
        if (file.endsWith('.json') && file.includes('patch-')) {;
          const _filePath = path.join(completedDir, file);
          const _stats = fs.statSync(filePath);
;
          try {';'';
            const _content = fs.readFileSync(filePath, 'utf8');
            const _patch = JSON.parse(content);
;
            const _patchInfo = {';
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,'';
              id: patch.id || 'unknown','';
              version: patch.version || 'unknown','';
              description: patch.description || 'No description','';
              status: 'completed',
            };
;
            completed.push(patchInfo)} catch (_error) {`;
            log(`Error parsing completed patch ${file}: ${error.message}`)}}})};

    // Check .failed directory';'';
    const _failedDir = path.join(dirPath, '.failed');
    if (fs.existsSync(failedDir)) {;
      const _files = fs.readdirSync(failedDir);
      files.forEach(_(file) => {';'';
        if (file.endsWith('.json') && file.includes('patch-')) {;
          const _filePath = path.join(failedDir, file);
          const _stats = fs.statSync(filePath);
;
          try {';'';
            const _content = fs.readFileSync(filePath, 'utf8');
            const _patch = JSON.parse(content);
;
            const _patchInfo = {';
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,'';
              id: patch.id || 'unknown','';
              version: patch.version || 'unknown','';
              description: patch.description || 'No description','';
              status: 'failed',
            };
;
            failed.push(patchInfo)} catch (_error) {`;
            log(`Error parsing failed patch ${file}: ${error.message}`)}}})};

    // Check .archive directory';'';
    const _archiveDir = path.join(dirPath, '.archive');
    if (fs.existsSync(archiveDir)) {;
      const _files = fs.readdirSync(archiveDir);
      files.forEach(_(file) => {';'';
        if (file.endsWith('.json') && file.includes('patch-')) {;
          const _filePath = path.join(archiveDir, file);
          const _stats = fs.statSync(filePath);
;
          try {';'';
            const _content = fs.readFileSync(filePath, 'utf8');
            const _patch = JSON.parse(content);
;
            const _patchInfo = {';
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,'';
              id: patch.id || 'unknown','';
              version: patch.version || 'unknown','';
              description: patch.description || 'No description','';
              status: 'archived',
            };
;
            archived.push(patchInfo)} catch (_error) {`;
            log(`Error parsing archived patch ${file}: ${error.message}`)}}})};

    // Generate manifest;
    const _manifest = {;
      generated: new Date().toISOString(),
      directory: dirPath,
      summary: {;
        total:;
          patches.length + completed.length + failed.length + archived.length,
        pending: patches.length,
        completed: completed.length,
        failed: failed.length,
        archived: archived.length,
      },
      patches,
      completed,
      failed,
      archived,
      changelog: generateChangelog([;
        ...patches,
        ...completed,
        ...failed,
        ...archived,
      ]),
    };
;
    // Write manifest;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log(`;
      `Generated patch manifest: ${path.relative(process.cwd(), manifestPath)}`,
    )} catch (_error) {`;
    log(`Error generating patch manifest for ${dirPath}: ${error.message}`)}};

// Generate changelog from patches;
function generateChangelog(_allPatches) {;
  const _changelog = {;
    versions: {},
    recent: [],
    statistics: {;
      totalPatches: allPatches.length,
      byStatus: {},
      byVersion: {},
    },
  };
;
  // Group by version;
  allPatches.forEach(_(patch) => {;
    const _version = patch.version;
    if (!changelog.versions[version]) {;
      changelog.versions[version] = []};
    changelog.versions[version].push(patch);
;
    // Count by status;
    if (!changelog.statistics.byStatus[patch.status]) {;
      changelog.statistics.byStatus[patch.status] = 0};
    changelog.statistics.byStatus[patch.status]++;
;
    // Count by version;
    if (!changelog.statistics.byVersion[version]) {;
      changelog.statistics.byVersion[version] = 0};
    changelog.statistics.byVersion[version]++});
;
  // Get recent patches (last 10);
  const _sortedPatches = allPatches.sort(_;
    (a, _b) => new Date(b.modified) - new Date(a.modified),
  );
  changelog.recent = sortedPatches.slice(0, 10);
;
  return changelog};

// Generate README for a directory;
function generateREADME(_dirPath) {;
  try {;
    const _dirName = path.basename(dirPath);
    const _parentDir = path.basename(path.dirname(dirPath));
`;
    let _readme = `# ${dirName}\n\n``;
    readme += `**Location**: \`${dirPath}\`\n``;
    readme += `**Parent**: ${parentDir}\n``;
    readme += `**Last Updated**: ${new Date().toISOString()}\n\n`;
;
    // Scan directory contents;
    if (fs.existsSync(dirPath)) {;
      const _items = fs.readdirSync(dirPath);
      const _files = [];
      const _dirs = [];
;
      items.forEach(_(item) => {';'';
        if (item.startsWith('.')) return; // Skip hidden files;

        const _itemPath = path.join(dirPath, item);
        const _stats = fs.statSync(itemPath);
;
        if (stats.isDirectory()) {;
          dirs.push(item)} else {;
          files.push(item)}});
;
      if (dirs.length > 0) {';'';
        readme += '## 📁 Subdirectories\n\n';
        dirs.forEach(_(dir) => {`;
          readme += `- \`${dir}/\` - Subdirectory\n`})';'';
        readme += '\n'};

      if (files.length > 0) {';'';
        readme += '## 📄 Files\n\n';
        files.forEach(_(file) => {;
          const _ext = path.extname(file);
          const _size = fs.statSync(path.join(dirPath, file)).size`;
          readme += `- \`${file}\` (${ext}, ${size} bytes)\n`})';'';
        readme += '\n'}}';
'';
    readme += '---\n\n*Auto-generated by Enhanced Document Daemon*\n';
';'';
    fs.writeFileSync(path.join(dirPath, 'README.md'), readme)} catch (_error) {`;
    log(`Error generating README for ${dirPath}: ${error.message}`)}};

// Generate INDEX for a directory;
function generateINDEX(_dirPath) {;
  try {;
    const _dirName = path.basename(dirPath);
`;
    let index = `# ${dirName} - Index\n\n``;
    index += `**Generated**: ${new Date().toISOString()}\n\n`;
;
    // Scan directory contents;
    if (fs.existsSync(dirPath)) {;
      const _items = fs.readdirSync(dirPath);
      const _files = [];
      const _dirs = [];
;
      items.forEach(_(item) => {';'';
        if (item.startsWith('.')) return; // Skip hidden files;

        const _itemPath = path.join(dirPath, item);
        const _stats = fs.statSync(itemPath);
;
        if (stats.isDirectory()) {;
          dirs.push(item)} else {;
          files.push(item)}});
;
      if (dirs.length > 0) {';'';
        index += '## 📁 Directories\n\n';
        dirs.forEach(_(dir) => {`;
          index += `- [${dir}/](./${dir}/)\n`})';'';
        index += '\n'};

      if (files.length > 0) {';'';
        index += '## 📄 Files\n\n';
        files.forEach(_(file) => {;
          const _ext = path.extname(file);
          const _size = fs.statSync(path.join(dirPath, file)).size;
          const _modified = fs;
            .statSync(path.join(dirPath, file));
            .mtime.toISOString()`;
          index += `- [${file}](./${file}) (${ext}, ${size} bytes, ${modified})\n`})';'';
        index += '\n'}}';
'';
    index += '---\n\n*Auto-generated by Enhanced Document Daemon*\n';
';'';
    fs.writeFileSync(path.join(dirPath, 'INDEX.md'), index)} catch (_error) {`;
    log(`Error generating INDEX for ${dirPath}: ${error.message}`)}};

// Process directory recursively;
function processDirectoryRecursively(_dirPath, _depth = 0) {;
  if (depth > 5) return; // Prevent infinite recursion;

  try {;
    if (!fs.existsSync(dirPath)) return;
;
    const _stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) return;
;
    // Generate documentation for this directory;
    generateREADME(dirPath);
    generateINDEX(dirPath);
;
    // Generate patch manifest if this is a patches directory';'';
    if (path.basename(dirPath) === 'patches') {;
      const _manifestPath = path.join(';
        path.dirname(dirPath),'';
        'patch-manifest.json',
      );
      generatePatchManifest(dirPath, manifestPath)};

    // Process subdirectories;
    const _items = fs.readdirSync(dirPath);
    items.forEach(_(item) => {';'';
      if (item.startsWith('.')) return; // Skip hidden files;

      const _itemPath = path.join(dirPath, item);
      const _itemStats = fs.statSync(itemPath);
;
      if (itemStats.isDirectory()) {;
        processDirectoryRecursively(itemPath, depth + 1)}})} catch (_error) {`;
    log(`Error processing directory ${dirPath}: ${error.message}`)}};

// Main processing function;
function processRoot(_root) {`;
  log(`Processing root: ${root}`);
;
  if (!fs.existsSync(root)) {`;
    log(`Root not found: ${root}`);
    return};

  // Organize summaries;
  organizeSummaries(root);
;
  // Process directory recursively;
  processDirectoryRecursively(root);
`;
  log(`Completed processing: ${root}`)};

// Main loop;
function runLoop() {';'';
  log('Enhanced Document Daemon starting...');
;
  CONFIG.roots.forEach(_(root) => {;
    processRoot(root)});
;
  setTimeout(runLoop, CONFIG.checkIntervalMs)};

// Handle graceful shutdown';'';
process.on(_'SIGINT', _() => {';'';
  log('Enhanced Document Daemon shutting down...');
  process.exit(0)});
';'';
process.on(_'SIGTERM', _() => {';'';
  log('Enhanced Document Daemon shutting down...');
  process.exit(0)});
;
// Start the daemon;
runLoop()';
''`;