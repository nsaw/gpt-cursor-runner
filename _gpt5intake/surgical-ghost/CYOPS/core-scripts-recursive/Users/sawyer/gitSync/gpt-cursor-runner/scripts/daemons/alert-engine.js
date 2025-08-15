#!/usr/bin/env node
/**
 * Alert Engine - Real System Monitoring
 * Monitors actual system events and generates alerts based on real conditions
 * No fake alerts - only real system monitoring
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Unified path structure
const CYOPS_CACHE =
  process.env.CYOPS_CACHE || "/Users/sawyer/gitSync/.cursor-cache/CYOPS";
const MAIN_CACHE =
  process.env.MAIN_CACHE || "/Users/sawyer/gitSync/.cursor-cache/MAIN";
const TELEMETRY_DIR = path.join(CYOPS_CACHE, "telemetry");
const CONFIG_DIR = path.join(CYOPS_CACHE, "config");

// Ensure directories exist
[TELEMETRY_DIR, CONFIG_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const ALERT_STATE_FILE = path.join(TELEMETRY_DIR, "alert-engine-state.json");
const CONFIG_FILE = path.join(CONFIG_DIR, "alert-engine-config.json");

class RealAlertEngine {
  constructor() {
    this.alerts = {
      active: [],
      history: [],
      summary: {
        totalActive: 0,
        criticalCount: 0,
        warningCount: 0,
        infoCount: 0,
      },
    };
    this.isRunning = false;
    this.monitoringInterval = null;
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    }

    // Default config
    return {
      enabled: true,
      monitoring: {
        enabled: true,
        intervalMs: 30000, // 30 seconds
        maxConcurrentAlerts: 50,
      },
      rules: {
        enabled: true,
        ruleEvaluationInterval: 60000, // 1 minute
      },
    };
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    console.log(
      `[${timestamp}] [${level.toUpperCase()}] [AlertEngine] ${message}`,
    );
  }

  addAlert(severity, message, component = "system", metadata = {}) {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      component,
      timestamp: new Date().toISOString(),
      metadata,
      resolved: false,
      resolvedAt: null,
    };

    this.alerts.active.push(alert);
    this.alerts.history.push(alert);
    this.updateSummary();
    this.saveAlerts();

    this.log(`Alert added: ${severity.toUpperCase()} - ${message}`, severity);
    return alert;
  }

  resolveAlert(alertId) {
    const alert = this.alerts.active.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      this.alerts.active = this.alerts.active.filter((a) => a.id !== alertId);
      this.updateSummary();
      this.saveAlerts();
      this.log(`Alert resolved: ${alert.message}`);
    }
  }

  updateSummary() {
    this.alerts.summary = {
      totalActive: this.alerts.active.length,
      criticalCount: this.alerts.active.filter((a) => a.severity === "critical")
        .length,
      warningCount: this.alerts.active.filter((a) => a.severity === "warning")
        .length,
      infoCount: this.alerts.active.filter((a) => a.severity === "info").length,
    };
  }

  saveAlerts() {
    try {
      fs.writeFileSync(ALERT_STATE_FILE, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      this.log(`Failed to save alerts: ${error.message}`, "error");
    }
  }

  loadAlerts() {
    try {
      if (fs.existsSync(ALERT_STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(ALERT_STATE_FILE, "utf8"));
        this.alerts = data;
        this.updateSummary();
      }
    } catch (error) {
      this.log(`Failed to load alerts: ${error.message}`, "error");
    }
  }

  // Real system monitoring functions
  async checkSystemHealth() {
    try {
      // Check disk space
      const diskUsage = await this.getDiskUsage();
      if (diskUsage > 90) {
        this.addAlert(
          "critical",
          `Disk usage critical: ${diskUsage}%`,
          "storage",
        );
      } else if (diskUsage > 80) {
        this.addAlert("warning", `Disk usage high: ${diskUsage}%`, "storage");
      }

      // Check memory usage
      const memoryUsage = await this.getMemoryUsage();
      if (memoryUsage > 90) {
        this.addAlert(
          "critical",
          `Memory usage critical: ${memoryUsage}%`,
          "system",
        );
      } else if (memoryUsage > 80) {
        this.addAlert(
          "warning",
          `Memory usage high: ${memoryUsage}%`,
          "system",
        );
      }

      // Check for failed patches
      await this.checkFailedPatches();

      // Check for stuck processes
      await this.checkStuckProcesses();
    } catch (error) {
      this.log(`System health check failed: ${error.message}`, "error");
    }
  }

  async getDiskUsage() {
    return new Promise((resolve) => {
      exec(
        "df -h / | tail -1 | awk '{print $5}' | sed 's/%//'",
        (error, stdout) => {
          if (error) {
            resolve(0);
          } else {
            resolve(parseInt(stdout.trim()) || 0);
          }
        },
      );
    });
  }

  async getMemoryUsage() {
    return new Promise((resolve) => {
      exec(
        "top -l 1 | grep PhysMem | awk '{print $2}' | sed 's/%//'",
        (error, stdout) => {
          if (error) {
            resolve(0);
          } else {
            resolve(parseInt(stdout.trim()) || 0);
          }
        },
      );
    });
  }

  async checkFailedPatches() {
    try {
      const failedPatchesDir = path.join(MAIN_CACHE, "patches", ".failed");
      if (fs.existsSync(failedPatchesDir)) {
        const failedPatches = fs
          .readdirSync(failedPatchesDir)
          .filter((f) => f.endsWith(".json")).length;

        if (failedPatches > 10) {
          this.addAlert(
            "warning",
            `${failedPatches} patches have failed`,
            "patch-executor",
          );
        }
      }
    } catch (error) {
      this.log(`Failed to check failed patches: ${error.message}`, "error");
    }
  }

  async checkStuckProcesses() {
    try {
      // Check for processes that have been running too long
      const processes = [
        "ghost-bridge-simple.js",
        "dual-monitor-server.js",
        "gpt_cursor_runner.main",
      ];

      for (const processName of processes) {
        const uptime = await this.getProcessUptime(processName);
        if (uptime > 3600) {
          // More than 1 hour
          this.addAlert(
            "info",
            `${processName} has been running for ${Math.floor(uptime / 3600)}h`,
            "process-monitor",
          );
        }
      }
    } catch (error) {
      this.log(`Failed to check stuck processes: ${error.message}`, "error");
    }
  }

  async getProcessUptime(processName) {
    return new Promise((resolve) => {
      exec(
        `ps -eo pid,etime,comm | grep "${processName}" | head -1 | awk '{print $2}'`,
        (error, stdout) => {
          if (error || !stdout.trim()) {
            resolve(0);
          } else {
            // Parse etime format (HH:MM:SS or MM:SS)
            const timeStr = stdout.trim();
            const parts = timeStr.split(":").map(Number);
            if (parts.length === 3) {
              resolve(parts[0] * 3600 + parts[1] * 60 + parts[2]);
            } else if (parts.length === 2) {
              resolve(parts[0] * 60 + parts[1]);
            } else {
              resolve(0);
            }
          }
        },
      );
    });
  }

  getStatus() {
    return {
      status: "running",
      timestamp: new Date().toISOString(),
      alerts: this.alerts,
      config: {
        enabled: this.config.enabled,
        monitoring: this.config.monitoring.enabled,
      },
    };
  }

  async start() {
    if (this.isRunning) {
      this.log("Alert Engine is already running");
      return;
    }

    this.log("Starting Real Alert Engine...");
    this.loadAlerts();

    // Add startup alert
    this.addAlert(
      "info",
      "Real Alert Engine started successfully",
      "alert-engine",
    );

    this.isRunning = true;

    // Start monitoring
    if (this.config.monitoring.enabled) {
      this.monitoringInterval = setInterval(() => {
        this.checkSystemHealth();
      }, this.config.monitoring.intervalMs);

      this.log(
        `System monitoring started with ${this.config.monitoring.intervalMs}ms interval`,
      );
    }

    // Graceful shutdown
    process.on("SIGINT", () => {
      this.log("Received SIGINT, shutting down...");
      this.stop();
    });

    process.on("SIGTERM", () => {
      this.log("Received SIGTERM, shutting down...");
      this.stop();
    });

    this.log("Alert Engine started successfully");
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.log("Stopping Alert Engine...");

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.saveAlerts();
    this.isRunning = false;
    this.log("Alert Engine stopped");
    process.exit(0);
  }
}

// Start the alert engine
async function main() {
  const alertEngine = new RealAlertEngine();

  try {
    await alertEngine.start();
  } catch (error) {
    console.error("Failed to start Alert Engine:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RealAlertEngine;
