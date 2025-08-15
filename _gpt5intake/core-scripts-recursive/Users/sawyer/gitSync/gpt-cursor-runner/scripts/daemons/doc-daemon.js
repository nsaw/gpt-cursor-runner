/* ⬅️ PATCHED: Now targets unified scaffolding structure with nested directories */
const fs = require("fs");
const path = require("path");
const roots = [
  "/Users/sawyer/gitSync/.cursor-cache/MAIN",
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS",
];

function updateIndex(root) {
  try {
    // Check for patches in main directory and nested subdirectories
    const patches = [];
    const completed = [];
    const archive = [];
    const failed = [];

    // Main patches directory
    const patchesDir = `${root}/patches`;
    if (fs.existsSync(patchesDir)) {
      const mainPatches = fs
        .readdirSync(patchesDir)
        .filter((f) => f.endsWith(".json"));
      patches.push(...mainPatches);
    }

    // Patches/.archive
    const patchesArchiveDir = `${root}/patches/.archive`;
    if (fs.existsSync(patchesArchiveDir)) {
      const archivedPatches = fs
        .readdirSync(patchesArchiveDir)
        .filter((f) => f.endsWith(".json"));
      archive.push(...archivedPatches);
    }

    // Patches/.failed
    const patchesFailedDir = `${root}/patches/.failed`;
    if (fs.existsSync(patchesFailedDir)) {
      const failedPatches = fs
        .readdirSync(patchesFailedDir)
        .filter((f) => f.endsWith(".json"));
      failed.push(...failedPatches);
    }

    // Summaries/.completed
    const summariesCompletedDir = `${root}/summaries/.completed`;
    if (fs.existsSync(summariesCompletedDir)) {
      const completedSummaries = fs
        .readdirSync(summariesCompletedDir)
        .filter((f) => f.endsWith(".json"));
      completed.push(...completedSummaries);
    }

    // Summaries/.archive
    const summariesArchiveDir = `${root}/summaries/.archive`;
    if (fs.existsSync(summariesArchiveDir)) {
      const archivedSummaries = fs
        .readdirSync(summariesArchiveDir)
        .filter((f) => f.endsWith(".json"));
      archive.push(...archivedSummaries);
    }

    // Summaries/.failed
    const summariesFailedDir = `${root}/summaries/.failed`;
    if (fs.existsSync(summariesFailedDir)) {
      const failedSummaries = fs
        .readdirSync(summariesFailedDir)
        .filter((f) => f.endsWith(".json"));
      failed.push(...failedSummaries);
    }

    let index = `# Unified Patch Index - ${path.basename(root)}\n\n## Pending Patches\n`;
    patches.forEach((p) => (index += `- [ ] ${p}\n`));
    index += "\n## Completed\n";
    completed.forEach((p) => (index += `- ✅ ${p}\n`));
    index += "\n## Archived\n";
    archive.forEach((p) => (index += `- 📦 ${p}\n`));
    index += "\n## Failed\n";
    failed.forEach((p) => (index += `- ❌ ${p}\n`));

    fs.writeFileSync(`${root}/INDEX.md`, index);
    fs.writeFileSync(
      `${root}/README.md`,
      `# GHOST ROOT — ${path.basename(root)}\n\nUnified scaffolding structure maintained by doc-daemon.js\n\n## Directory Structure\n- patches/ - Active patches\n- patches/.archive/ - Archived patches\n- patches/.failed/ - Failed patches\n- summaries/ - Active summaries\n- summaries/.completed/ - Completed summaries\n- summaries/.archive/ - Archived summaries\n- summaries/.failed/ - Failed summaries\n- summaries/.logs/ - Summary logs\n- summaries/.heartbeat/ - Heartbeat files`,
    );
  } catch (_error) {
    console.error(`Error updating index for ${root}:`, error.message);
  }
}

function moveStalePatches(root) {
  try {
    const patchDir = `${root}/patches`;
    if (!fs.existsSync(patchDir)) return;

    const files = fs.readdirSync(patchDir);
    const now = Date.now();

    files.forEach((file) => {
      if (file.startsWith(".")) return; // Skip hidden directories
      const full = `${patchDir}/${file}`;
      if (!file.endsWith(".json")) return;

      try {
        const { birthtimeMs } = fs.statSync(full);
        const age = (now - birthtimeMs) / (1000 * 60 * 60 * 24);
        if (age > 2) {
          const archiveDir = `${root}/patches/.archive`;
          if (!fs.existsSync(archiveDir)) {
            fs.mkdirSync(archiveDir, { recursive: true });
          }
          fs.renameSync(full, `${archiveDir}/${file}`);
          console.log(`[DOC-DAEMON] Archived stale patch: ${file}`);
        }
      } catch (_error) {
        console.error(`Error processing file ${file}:`, error.message);
      }
    });
  } catch (_error) {
    console.error(`Error moving stale patches for ${root}:`, error.message);
  }
}

function runLoop() {
  console.log("[DOC-DAEMON] Running unified scaffolding maintenance...");
  roots.forEach((root) => {
    if (!fs.existsSync(root)) {
      console.log(`[DOC-DAEMON] Root not found: ${root}`);
      return;
    }
    moveStalePatches(root);
    updateIndex(root);
  });
  setTimeout(runLoop, 30000);
}

runLoop();
