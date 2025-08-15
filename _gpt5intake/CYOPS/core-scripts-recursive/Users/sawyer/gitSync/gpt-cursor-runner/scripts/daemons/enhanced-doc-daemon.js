#!/usr/bin/env node
/**
 * Enhanced Document Daemon
 *
 * Features:
 * - Auto-organize summaries after 2 days into .archive
 * - Create and update patch manifests with changelogs
 * - Generate README and INDEX files for all subdirectories
 * - Monitor both MAIN and CYOPS cache directories
 * - Recursive subdirectory processing
 */

const fs = require("fs");
const path = require("path");

// Configuration
const CONFIG = {
  roots: [
    "/Users/sawyer/gitSync/.cursor-cache/MAIN",
    "/Users/sawyer/gitSync/.cursor-cache/CYOPS",
  ],
  archiveAgeDays: 2,
  checkIntervalMs: 30000, // 30 seconds
  logFile:
    "/Users/sawyer/gitSync/gpt-cursor-runner/logs/enhanced-doc-daemon.log",
};

// Logging function
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);

  // Write to log file
  try {
    fs.appendFileSync(CONFIG.logFile, logMessage + "\n");
  } catch (error) {
    console.error("Failed to write to log file:", error.message);
  }
}

// Get file age in days
function getFileAgeDays(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const now = Date.now();
    const ageMs = now - stats.birthtimeMs;
    return ageMs / (1000 * 60 * 60 * 24);
  } catch (error) {
    return 0;
  }
}

// Create directory if it doesn't exist
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    log(`Created directory: ${dirPath}`);
  }
}

// Move file to archive
function moveToArchive(filePath, archiveDir) {
  try {
    const fileName = path.basename(filePath);
    const archivePath = path.join(archiveDir, fileName);

    // Handle duplicate filenames
    let finalArchivePath = archivePath;
    let counter = 1;
    while (fs.existsSync(finalArchivePath)) {
      const ext = path.extname(fileName);
      const base = path.basename(fileName, ext);
      finalArchivePath = path.join(archiveDir, `${base}_${counter}${ext}`);
      counter++;
    }

    fs.renameSync(filePath, finalArchivePath);
    log(
      `Archived: ${fileName} -> ${path.relative(process.cwd(), finalArchivePath)}`,
    );
    return true;
  } catch (error) {
    log(`Error archiving ${filePath}: ${error.message}`);
    return false;
  }
}

// Auto-organize summaries
function organizeSummaries(root) {
  const summariesDir = path.join(root, "summaries");
  if (!fs.existsSync(summariesDir)) return;

  const archiveDir = path.join(summariesDir, ".archive");
  ensureDirectory(archiveDir);

  const files = fs.readdirSync(summariesDir);
  let archivedCount = 0;

  files.forEach((file) => {
    if (
      file.startsWith(".") ||
      file === ".archive" ||
      file === ".completed" ||
      file === ".failed"
    ) {
      return; // Skip hidden files and special directories
    }

    const filePath = path.join(summariesDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && (file.endsWith(".md") || file.endsWith(".json"))) {
      const ageDays = getFileAgeDays(filePath);

      if (ageDays > CONFIG.archiveAgeDays) {
        if (moveToArchive(filePath, archiveDir)) {
          archivedCount++;
        }
      }
    }
  });

  if (archivedCount > 0) {
    log(`Organized ${archivedCount} summaries in ${path.basename(root)}`);
  }
}

// Generate patch manifest for a directory
function generatePatchManifest(dirPath, manifestPath) {
  try {
    const patches = [];
    const completed = [];
    const failed = [];
    const archived = [];

    // Scan for patch files
    if (fs.existsSync(dirPath)) {
      const files = fs.readdirSync(dirPath);
      files.forEach((file) => {
        if (file.endsWith(".json") && file.includes("patch-")) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);

          try {
            const content = fs.readFileSync(filePath, "utf8");
            const patch = JSON.parse(content);

            const patchInfo = {
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,
              id: patch.id || "unknown",
              version: patch.version || "unknown",
              description: patch.description || "No description",
              status: "pending",
            };

            patches.push(patchInfo);
          } catch (error) {
            log(`Error parsing patch ${file}: ${error.message}`);
          }
        }
      });
    }

    // Check .completed directory
    const completedDir = path.join(dirPath, ".completed");
    if (fs.existsSync(completedDir)) {
      const files = fs.readdirSync(completedDir);
      files.forEach((file) => {
        if (file.endsWith(".json") && file.includes("patch-")) {
          const filePath = path.join(completedDir, file);
          const stats = fs.statSync(filePath);

          try {
            const content = fs.readFileSync(filePath, "utf8");
            const patch = JSON.parse(content);

            const patchInfo = {
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,
              id: patch.id || "unknown",
              version: patch.version || "unknown",
              description: patch.description || "No description",
              status: "completed",
            };

            completed.push(patchInfo);
          } catch (error) {
            log(`Error parsing completed patch ${file}: ${error.message}`);
          }
        }
      });
    }

    // Check .failed directory
    const failedDir = path.join(dirPath, ".failed");
    if (fs.existsSync(failedDir)) {
      const files = fs.readdirSync(failedDir);
      files.forEach((file) => {
        if (file.endsWith(".json") && file.includes("patch-")) {
          const filePath = path.join(failedDir, file);
          const stats = fs.statSync(filePath);

          try {
            const content = fs.readFileSync(filePath, "utf8");
            const patch = JSON.parse(content);

            const patchInfo = {
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,
              id: patch.id || "unknown",
              version: patch.version || "unknown",
              description: patch.description || "No description",
              status: "failed",
            };

            failed.push(patchInfo);
          } catch (error) {
            log(`Error parsing failed patch ${file}: ${error.message}`);
          }
        }
      });
    }

    // Check .archive directory
    const archiveDir = path.join(dirPath, ".archive");
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir);
      files.forEach((file) => {
        if (file.endsWith(".json") && file.includes("patch-")) {
          const filePath = path.join(archiveDir, file);
          const stats = fs.statSync(filePath);

          try {
            const content = fs.readFileSync(filePath, "utf8");
            const patch = JSON.parse(content);

            const patchInfo = {
              filename: file,
              created: stats.birthtime,
              modified: stats.mtime,
              size: stats.size,
              id: patch.id || "unknown",
              version: patch.version || "unknown",
              description: patch.description || "No description",
              status: "archived",
            };

            archived.push(patchInfo);
          } catch (error) {
            log(`Error parsing archived patch ${file}: ${error.message}`);
          }
        }
      });
    }

    // Generate manifest
    const manifest = {
      generated: new Date().toISOString(),
      directory: dirPath,
      summary: {
        total:
          patches.length + completed.length + failed.length + archived.length,
        pending: patches.length,
        completed: completed.length,
        failed: failed.length,
        archived: archived.length,
      },
      patches: patches,
      completed: completed,
      failed: failed,
      archived: archived,
      changelog: generateChangelog([
        ...patches,
        ...completed,
        ...failed,
        ...archived,
      ]),
    };

    // Write manifest
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    log(
      `Generated patch manifest: ${path.relative(process.cwd(), manifestPath)}`,
    );
  } catch (error) {
    log(`Error generating patch manifest for ${dirPath}: ${error.message}`);
  }
}

// Generate changelog from patches
function generateChangelog(allPatches) {
  const changelog = {
    versions: {},
    recent: [],
    statistics: {
      totalPatches: allPatches.length,
      byStatus: {},
      byVersion: {},
    },
  };

  // Group by version
  allPatches.forEach((patch) => {
    const version = patch.version;
    if (!changelog.versions[version]) {
      changelog.versions[version] = [];
    }
    changelog.versions[version].push(patch);

    // Count by status
    if (!changelog.statistics.byStatus[patch.status]) {
      changelog.statistics.byStatus[patch.status] = 0;
    }
    changelog.statistics.byStatus[patch.status]++;

    // Count by version
    if (!changelog.statistics.byVersion[version]) {
      changelog.statistics.byVersion[version] = 0;
    }
    changelog.statistics.byVersion[version]++;
  });

  // Get recent patches (last 10)
  const sortedPatches = allPatches.sort(
    (a, b) => new Date(b.modified) - new Date(a.modified),
  );
  changelog.recent = sortedPatches.slice(0, 10);

  return changelog;
}

// Generate README for a directory
function generateREADME(dirPath) {
  try {
    const dirName = path.basename(dirPath);
    const parentDir = path.basename(path.dirname(dirPath));

    let readme = `# ${dirName}\n\n`;
    readme += `**Location**: \`${dirPath}\`\n`;
    readme += `**Parent**: ${parentDir}\n`;
    readme += `**Last Updated**: ${new Date().toISOString()}\n\n`;

    // Scan directory contents
    if (fs.existsSync(dirPath)) {
      const items = fs.readdirSync(dirPath);
      const files = [];
      const dirs = [];

      items.forEach((item) => {
        if (item.startsWith(".")) return; // Skip hidden files

        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          dirs.push(item);
        } else {
          files.push(item);
        }
      });

      if (dirs.length > 0) {
        readme += `## 📁 Subdirectories\n\n`;
        dirs.forEach((dir) => {
          readme += `- \`${dir}/\` - Subdirectory\n`;
        });
        readme += `\n`;
      }

      if (files.length > 0) {
        readme += `## 📄 Files\n\n`;
        files.forEach((file) => {
          const ext = path.extname(file);
          const size = fs.statSync(path.join(dirPath, file)).size;
          readme += `- \`${file}\` (${ext}, ${size} bytes)\n`;
        });
        readme += `\n`;
      }
    }

    readme += `---\n\n*Auto-generated by Enhanced Document Daemon*\n`;

    fs.writeFileSync(path.join(dirPath, "README.md"), readme);
  } catch (error) {
    log(`Error generating README for ${dirPath}: ${error.message}`);
  }
}

// Generate INDEX for a directory
function generateINDEX(dirPath) {
  try {
    const dirName = path.basename(dirPath);

    let index = `# ${dirName} - Index\n\n`;
    index += `**Generated**: ${new Date().toISOString()}\n\n`;

    // Scan directory contents
    if (fs.existsSync(dirPath)) {
      const items = fs.readdirSync(dirPath);
      const files = [];
      const dirs = [];

      items.forEach((item) => {
        if (item.startsWith(".")) return; // Skip hidden files

        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          dirs.push(item);
        } else {
          files.push(item);
        }
      });

      if (dirs.length > 0) {
        index += `## 📁 Directories\n\n`;
        dirs.forEach((dir) => {
          index += `- [${dir}/](./${dir}/)\n`;
        });
        index += `\n`;
      }

      if (files.length > 0) {
        index += `## 📄 Files\n\n`;
        files.forEach((file) => {
          const ext = path.extname(file);
          const size = fs.statSync(path.join(dirPath, file)).size;
          const modified = fs
            .statSync(path.join(dirPath, file))
            .mtime.toISOString();
          index += `- [${file}](./${file}) (${ext}, ${size} bytes, ${modified})\n`;
        });
        index += `\n`;
      }
    }

    index += `---\n\n*Auto-generated by Enhanced Document Daemon*\n`;

    fs.writeFileSync(path.join(dirPath, "INDEX.md"), index);
  } catch (error) {
    log(`Error generating INDEX for ${dirPath}: ${error.message}`);
  }
}

// Process directory recursively
function processDirectoryRecursively(dirPath, depth = 0) {
  if (depth > 5) return; // Prevent infinite recursion

  try {
    if (!fs.existsSync(dirPath)) return;

    const stats = fs.statSync(dirPath);
    if (!stats.isDirectory()) return;

    // Generate documentation for this directory
    generateREADME(dirPath);
    generateINDEX(dirPath);

    // Generate patch manifest if this is a patches directory
    if (path.basename(dirPath) === "patches") {
      const manifestPath = path.join(
        path.dirname(dirPath),
        "patch-manifest.json",
      );
      generatePatchManifest(dirPath, manifestPath);
    }

    // Process subdirectories
    const items = fs.readdirSync(dirPath);
    items.forEach((item) => {
      if (item.startsWith(".")) return; // Skip hidden files

      const itemPath = path.join(dirPath, item);
      const itemStats = fs.statSync(itemPath);

      if (itemStats.isDirectory()) {
        processDirectoryRecursively(itemPath, depth + 1);
      }
    });
  } catch (error) {
    log(`Error processing directory ${dirPath}: ${error.message}`);
  }
}

// Main processing function
function processRoot(root) {
  log(`Processing root: ${root}`);

  if (!fs.existsSync(root)) {
    log(`Root not found: ${root}`);
    return;
  }

  // Organize summaries
  organizeSummaries(root);

  // Process directory recursively
  processDirectoryRecursively(root);

  log(`Completed processing: ${root}`);
}

// Main loop
function runLoop() {
  log("Enhanced Document Daemon starting...");

  CONFIG.roots.forEach((root) => {
    processRoot(root);
  });

  setTimeout(runLoop, CONFIG.checkIntervalMs);
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  log("Enhanced Document Daemon shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  log("Enhanced Document Daemon shutting down...");
  process.exit(0);
});

// Start the daemon
runLoop();
