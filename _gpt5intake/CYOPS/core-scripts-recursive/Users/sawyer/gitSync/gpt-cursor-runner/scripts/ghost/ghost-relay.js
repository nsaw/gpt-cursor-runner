// ghost-relay.js: Comprehensive ghost relay system for CYOPS and MAIN agents
const fs = require("fs");
const path = require("path");
const express = require("express");

const ROOT = "/Users/sawyer/gitSync/.cursor-cache/";
const CYOPS_ROOT = path.join(ROOT, "CYOPS");
const MAIN_ROOT = path.join(ROOT, "MAIN");

// Ensure directories exist
[ROOT, CYOPS_ROOT, MAIN_ROOT].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Create .logs directories
[path.join(CYOPS_ROOT, ".logs"), path.join(MAIN_ROOT, ".logs")].forEach(
  (logDir) => {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  },
);

// Initialize ghost-relay.log files
function initializeLogFiles() {
  const timestamp = new Date().toISOString();
  const initialStatus = `[${timestamp}] Ghost relay initialized\nStatus: Ready\nAgent: Connected\nLast Update: ${timestamp}`;

  fs.writeFileSync(
    path.join(CYOPS_ROOT, ".logs", "ghost-relay.log"),
    initialStatus,
  );
  fs.writeFileSync(
    path.join(MAIN_ROOT, ".logs", "ghost-relay.log"),
    initialStatus,
  );
}

// Update status for a specific agent
function updateStatus(agent, status) {
  const timestamp = new Date().toISOString();
  const logPath = path.join(ROOT, agent, ".logs", "ghost-relay.log");
  const statusUpdate = `[${timestamp}] ${status}\nLast Update: ${timestamp}`;

  try {
    fs.writeFileSync(logPath, statusUpdate);
    console.log(`[GHOST-RELAY] Updated ${agent} status: ${status}`);
  } catch (_error) {
    console.error(
      `[GHOST-RELAY] Error updating ${agent} status:`,
      error.message,
    );
  }
}

// Monitor agent status
function monitorAgents() {
  // Check if agents are active by looking for recent activity
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  // Check CYOPS agent activity
  const cyopsSummariesPath = path.join(CYOPS_ROOT, "summaries");
  let cyopsStatus = "Inactive";
  if (fs.existsSync(cyopsSummariesPath)) {
    try {
      const files = fs.readdirSync(cyopsSummariesPath);
      const recentFiles = files.filter((file) => {
        const filePath = path.join(cyopsSummariesPath, file);
        const stats = fs.statSync(filePath);
        return stats.mtime.getTime() > fiveMinutesAgo;
      });
      cyopsStatus = recentFiles.length > 0 ? "Active" : "Idle";
    } catch (_error) {
      cyopsStatus = "Error";
    }
  }

  // Check MAIN agent activity
  const mainSummariesPath = path.join(MAIN_ROOT, "summaries");
  let mainStatus = "Inactive";
  if (fs.existsSync(mainSummariesPath)) {
    try {
      const files = fs.readdirSync(mainSummariesPath);
      const recentFiles = files.filter((file) => {
        const filePath = path.join(mainSummariesPath, file);
        const stats = fs.statSync(filePath);
        return stats.mtime.getTime() > fiveMinutesAgo;
      });
      mainStatus = recentFiles.length > 0 ? "Active" : "Idle";
    } catch (_error) {
      mainStatus = "Error";
    }
  }

  updateStatus("CYOPS", `Agent Status: ${cyopsStatus}`);
  updateStatus("MAIN", `Agent Status: ${mainStatus}`);
}

// Express server for ghost relay API
const app = express();
const PORT = process.env.GHOST_RELAY_PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Status endpoint
app.get("/status", (req, res) => {
  const cyopsStatus = tryRead(
    path.join(CYOPS_ROOT, ".logs", "ghost-relay.log"),
  );
  const mainStatus = tryRead(path.join(MAIN_ROOT, ".logs", "ghost-relay.log"));

  res.json({
    cyops: { status: cyopsStatus },
    main: { status: mainStatus },
    timestamp: new Date().toISOString(),
  });
});

// Update status endpoint
app.post("/status/:agent", (req, res) => {
  const agent = req.params.agent.toUpperCase();
  const status = req.body.status || "Unknown";

  if (agent === "CYOPS" || agent === "MAIN") {
    updateStatus(agent, status);
    res.json({ success: true, agent, status });
  } else {
    res.status(400).json({ error: "Invalid agent. Use CYOPS or MAIN." });
  }
});

// Summary routing endpoint
app.post("/summary/:agent", (req, res) => {
  const agent = req.params.agent.toUpperCase();
  const { content, filename } = req.body;

  if (!content || !filename) {
    return res.status(400).json({ error: "Content and filename required" });
  }

  if (agent !== "CYOPS" && agent !== "MAIN") {
    return res.status(400).json({ error: "Invalid agent. Use CYOPS or MAIN." });
  }

  const summariesPath = path.join(ROOT, agent, "summaries");
  if (!fs.existsSync(summariesPath)) {
    fs.mkdirSync(summariesPath, { recursive: true });
  }

  const filePath = path.join(summariesPath, filename);
  try {
    fs.writeFileSync(filePath, content);
    updateStatus(agent, `Summary delivered: ${filename}`);
    res.json({ success: true, agent, filename, path: filePath });
  } catch (_error) {
    console.error(
      `[GHOST-RELAY] Error writing summary for ${agent}:`,
      error.message,
    );
    res.status(500).json({ error: "Failed to write summary" });
  }
});

function tryRead(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (_error) {
    return "[Unavailable]";
  }
}

// Initialize and start
initializeLogFiles();

// Start monitoring loop
setInterval(monitorAgents, 30000); // Check every 30 seconds

// Start server
app.listen(PORT, () => {
  console.log(`[GHOST-RELAY] Relay server running on port ${PORT}`);
  console.log("[GHOST-RELAY] Monitoring CYOPS and MAIN agents");
  console.log(
    `[GHOST-RELAY] Status logs: ${CYOPS_ROOT}/.logs/ghost-relay.log, ${MAIN_ROOT}/.logs/ghost-relay.log`,
  );
});

// Initial status update
monitorAgents();
