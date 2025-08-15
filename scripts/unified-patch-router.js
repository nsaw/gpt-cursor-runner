// Unified Patch Router - Consolidates all patch routing through single system
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Unified paths - ABSOLUTE PATHS ONLY
const PATHS = {
  CYOPS: {
    patches: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
    summaries: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
    logs: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs",
    heartbeat: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat",
  },
  MAIN: {
    patches: "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches",
    summaries: "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries",
    logs: "/Users/sawyer/gitSync/.cursor-cache/MAIN/.logs",
    heartbeat: "/Users/sawyer/gitSync/.cursor-cache/MAIN/.heartbeat",
  },
};

// Ensure all directories exist
Object.values(PATHS).forEach((zone) => {
  Object.values(zone).forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[ROUTER] Created directory: ${dir}`);
    }
  });
});

// Logging function
function log(message, zone = "SYSTEM") {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${zone}] ${message}\n`;

  // Write to console
  console.log(logMessage.trim());

  // Write to log file
  const logFile = path.join(PATHS.CYOPS.logs, "unified-patch-router.log");
  try {
    fs.appendFileSync(logFile, logMessage);
  } catch (_e) {
    console.error(`[LOG ERROR] ${e.message}`);
  }
}

// Patch routing function
function routePatch(patchData, target = "CYOPS") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const patchId = patchData.id || patchData.blockId || `patch-${timestamp}`;
  const filename = `${patchId}.json`;

  const targetPath = path.join(PATHS[target].patches, filename);

  try {
    // Write patch to target directory
    fs.writeFileSync(targetPath, JSON.stringify(patchData, null, 2));

    // Verify write
    if (!fs.existsSync(targetPath)) {
      throw new Error("Patch write verification failed");
    }

    log(`✅ Patch routed successfully: ${filename} → ${target}`, target);

    // Trigger patch executor if not running
    startPatchExecutorIfNeeded(target);

    return {
      success: true,
      filename,
      target,
      path: targetPath,
      timestamp: new Date().toISOString(),
    };
  } catch (_error) {
    log(`❌ Patch routing failed: ${error.message}`, target);
    return {
      success: false,
      error: error.message,
      filename,
      target,
      timestamp: new Date().toISOString(),
    };
  }
}

// Start patch executor if needed
function startPatchExecutorIfNeeded(target) {
  try {
    const { execSync } = require("child_process");
    const result = execSync(
      'ps aux | grep "patch-executor" | grep -v grep | wc -l',
      { encoding: "utf8" },
    );
    const count = parseInt(result.trim());

    if (count === 0) {
      log(`🚀 Starting patch executor for ${target}`, target);
      spawn("node", ["scripts/patch-executor-loop.js"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    } else {
      log(`✅ Patch executor already running (${count} instances)`, target);
    }
  } catch (_error) {
    log(`⚠️ Could not check patch executor status: ${error.message}`, target);
  }
}

// Health check function
function healthCheck() {
  const health = {
    timestamp: new Date().toISOString(),
    zones: {},
    processes: {},
    directories: {},
  };

  // Check directories
  Object.entries(PATHS).forEach(([zone, paths]) => {
    health.directories[zone] = {};
    Object.entries(paths).forEach(([type, path]) => {
      health.directories[zone][type] = fs.existsSync(path);
    });
  });

  // Check processes
  try {
    const { execSync } = require("child_process");
    const patchExecutor = execSync(
      'ps aux | grep "patch-executor" | grep -v grep | wc -l',
      { encoding: "utf8" },
    );
    const orchestrator = execSync(
      'ps aux | grep "orchestrator" | grep -v grep | wc -l',
      { encoding: "utf8" },
    );

    health.processes = {
      patchExecutor: parseInt(patchExecutor.trim()),
      orchestrator: parseInt(orchestrator.trim()),
    };
  } catch (_error) {
    health.processes = { error: error.message };
  }

  // Check zone status
  Object.entries(PATHS).forEach(([zone, paths]) => {
    const patchCount = fs
      .readdirSync(paths.patches)
      .filter((f) => f.endsWith(".json")).length;
    const summaryCount = fs
      .readdirSync(paths.summaries)
      .filter((f) => f.endsWith(".md")).length;

    health.zones[zone] = {
      patches: patchCount,
      summaries: summaryCount,
      lastHeartbeat: fs.existsSync(
        path.join(paths.heartbeat, ".last-md-write.log"),
      ),
    };
  });

  return health;
}

// Express server for API endpoints
const express = require("express");
const app = express();
const PORT = process.env.PATCH_ROUTER_PORT || 5052;

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json(healthCheck());
});

// Route patch endpoint
app.post("/route", (req, res) => {
  const { patchData, target = "CYOPS" } = req.body;

  if (!patchData) {
    return res.status(400).json({ error: "No patch data provided" });
  }

  if (!PATHS[target]) {
    return res.status(400).json({ error: `Invalid target: ${target}` });
  }

  const result = routePatch(patchData, target);
  res.json(result);
});

// List patches endpoint
app.get("/patches/:zone", (req, res) => {
  const { zone } = req.params;

  if (!PATHS[zone]) {
    return res.status(400).json({ error: `Invalid zone: ${zone}` });
  }

  try {
    const files = fs
      .readdirSync(PATHS[zone].patches)
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        filename: f,
        path: path.join(PATHS[zone].patches, f),
        size: fs.statSync(path.join(PATHS[zone].patches, f)).size,
        modified: fs.statSync(path.join(PATHS[zone].patches, f)).mtime,
      }));

    res.json({
      zone,
      count: files.length,
      patches: files,
    });
  } catch (_error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  log(`🚀 Unified Patch Router started on port ${PORT}`);
  log(`📁 CYOPS patches: ${PATHS.CYOPS.patches}`);
  log(`📁 MAIN patches: ${PATHS.MAIN.patches}`);
});

// Export functions for use in other modules
module.exports = {
  routePatch,
  healthCheck,
  PATHS,
  log,
};
