const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");

const WATCH_DIR = "/Users/sawyer/gitSync/.cursor-cache/MAIN/ui-patch-inbox";
const DEST_DIR = "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches";
const LOG_FILE = path.resolve(__dirname, "../../logs/main-relay-daemon.log");

if (!fs.existsSync(WATCH_DIR)) fs.mkdirSync(WATCH_DIR, { recursive: true });
if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

function log(msg) {
  fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] ${msg}\n`);
}

function startPatchExecutorIfMissing() {
  try {
    const running = execSync("ps aux | grep patch-executor | grep -v grep", {
      encoding: "utf8",
    }).toString();
    if (!running.includes("patch-executor")) {
      log("Patch executor not running. Restarting...");
      spawn("node", ["scripts/patch-executor.js"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      log("Patch executor already running.");
    }
  } catch (_error) {
    // If grep doesn't find anything, it returns non-zero exit code
    if (error.status === 1) {
      log("Patch executor not running. Restarting...");
      spawn("node", ["scripts/patch-executor.js"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      log(`Error checking patch executor: ${error.message}`);
    }
  }
}

log("MAIN Patch Relay Daemon Started");
log(`Watching directory: ${WATCH_DIR}`);
log(`Destination directory: ${DEST_DIR}`);

// Track processed files to avoid duplicates
const processedFiles = new Set();

// Polling function to check for new files
function checkForNewFiles() {
  try {
    log(`Checking directory: ${WATCH_DIR}`);
    const files = fs.readdirSync(WATCH_DIR);
    log(`Found ${files.length} files in directory`);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));
    log(`Found ${jsonFiles.length} JSON files: ${jsonFiles.join(", ")}`);

    for (const filename of jsonFiles) {
      if (!processedFiles.has(filename)) {
        log(`Found new JSON file: ${filename}`);
        const src = path.join(WATCH_DIR, filename);
        const dest = path.join(DEST_DIR, filename);

        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, dest);
            // Remove the file from inbox after successful copy
            fs.unlinkSync(src);
            log(
              `Relayed patch ${filename} to MAIN patch queue and removed from inbox.`,
            );
            processedFiles.add(filename);
            startPatchExecutorIfMissing();
          } catch (_error) {
            log(`Error copying file ${filename}: ${error.message}`);
            // Don't mark as processed if copy failed
          }
        } else {
          log(`Source file not found: ${src}`);
        }
      } else {
        log(`File already processed: ${filename}`);
      }
    }
  } catch (_error) {
    log(`Error checking directory: ${error.message}`);
  }
}

// Check for new files every 2 seconds
setInterval(checkForNewFiles, 2000);

setInterval(() => {
  log("✅ Heartbeat: relay running");
}, 30000);
