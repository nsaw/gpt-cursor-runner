#!/usr/bin/env node
/**
 * Alert Engine Entry Point
 * Simple JavaScript implementation to provide alerting functionality
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");

// Configuration
const CYOPS_CACHE = "/Users/sawyer/gitSync/.cursor-cache/CYOPS";
const LOG_DIR = path.join(CYOPS_CACHE, "logs");
const PID_DIR = path.join(CYOPS_CACHE, "pids");
const ALERTS_FILE = path.join(
  CYOPS_CACHE,
  "telemetry",
  "alert-engine-state.json",
);

// Ensure directories exist
[LOG_DIR, PID_DIR, path.dirname(ALERTS_FILE)].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const LOG_FILE = path.join(LOG_DIR, "alert-engine.log");
const PID_FILE = path.join(PID_DIR, "alert-engine.pid");

class AlertEngine {
  constructor() {
    this.isRunning = false;
    this.alerts = {
      active: [],
      history: [],
      summary: {
        totalActive: 0,
        totalHistory: 0,
        criticalCount: 0,
        errorCount: 0,
        warningCount: 0,
      },
    };
    this.startTime = Date.now();
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    try {
      fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }

    console.log(`[AlertEngine] ${message}`);
  }

  writePID() {
    try {
      fs.writeFileSync(PID_FILE, process.pid.toString());
      this.log(`PID written to ${PID_FILE}`);
    } catch (error) {
      this.log(`Failed to write PID file: ${error.message}`, "error");
    }
  }

  removePID() {
    try {
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE);
        this.log("PID file removed");
      }
    } catch (error) {
      this.log(`Failed to remove PID file: ${error.message}`, "error");
    }
  }

  saveAlerts() {
    try {
      const alertState = {
        alerts: this.alerts,
        status: {
          healthy: true,
          uptime: Date.now() - this.startTime,
          lastUpdate: new Date().toISOString(),
        },
      };
      fs.writeFileSync(ALERTS_FILE, JSON.stringify(alertState, null, 2));
      this.log("Alert state saved");
    } catch (error) {
      this.log(`Failed to save alert state: ${error.message}`, "error");
    }
  }

  addAlert(severity, message, component = "system") {
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity,
      message,
      component,
      timestamp: new Date().toISOString(),
      status: "active",
    };

    this.alerts.active.push(alert);
    this.updateSummary();
    this.saveAlerts();

    this.log(`Alert added: ${severity} - ${message}`, severity);
    return alert;
  }

  resolveAlert(alertId) {
    const alertIndex = this.alerts.active.findIndex((a) => a.id === alertId);
    if (alertIndex !== -1) {
      const alert = this.alerts.active.splice(alertIndex, 1)[0];
      alert.status = "resolved";
      alert.resolvedAt = new Date().toISOString();
      this.alerts.history.push(alert);
      this.updateSummary();
      this.saveAlerts();
      this.log(`Alert resolved: ${alert.message}`);
      return true;
    }
    return false;
  }

  updateSummary() {
    this.alerts.summary = {
      totalActive: this.alerts.active.length,
      totalHistory: this.alerts.history.length,
      criticalCount: this.alerts.active.filter((a) => a.severity === "critical")
        .length,
      errorCount: this.alerts.active.filter((a) => a.severity === "error")
        .length,
      warningCount: this.alerts.active.filter((a) => a.severity === "warning")
        .length,
    };
  }

  getStatus() {
    return {
      alerts: this.alerts,
      status: {
        healthy: true,
        uptime: Date.now() - this.startTime,
        lastUpdate: new Date().toISOString(),
      },
    };
  }

  async start() {
    if (this.isRunning) {
      this.log("Alert Engine is already running");
      return;
    }

    this.log("Starting Alert Engine...");
    this.writePID();

    // Load existing alerts if any
    try {
      if (fs.existsSync(ALERTS_FILE)) {
        const alertState = JSON.parse(fs.readFileSync(ALERTS_FILE, "utf8"));
        this.alerts = alertState.alerts || this.alerts;
        this.log("Loaded existing alert state");
      }
    } catch (error) {
      this.log(`Failed to load alert state: ${error.message}`, "error");
    }

    this.isRunning = true;
    this.log("Alert Engine started successfully");

    // Add a startup alert
    this.addAlert("info", "Alert Engine started successfully", "alert-engine");

    // Add some sample alerts for testing
    setTimeout(() => {
      this.addAlert(
        "warning",
        "High CPU usage detected on system",
        "system-monitor",
      );
      this.addAlert("error", "Database connection timeout", "database");
      this.addAlert("critical", "Disk space critical - 95% full", "storage");
    }, 5000);

    // Start HTTP server for API endpoints
    this.startHTTPServer();

    // Periodic health check
    setInterval(() => {
      if (this.isRunning) {
        this.saveAlerts();
        this.log("Health check completed");
      }
    }, 30000); // Every 30 seconds

    // Graceful shutdown
    process.on("SIGINT", () => {
      this.log("Received SIGINT, shutting down...");
      this.stop();
    });

    process.on("SIGTERM", () => {
      this.log("Received SIGTERM, shutting down...");
      this.stop();
    });
  }

  startHTTPServer() {
    const server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);
      const path = parsedUrl.pathname;

      // Set CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (path === "/api/status" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(this.getStatus()));
      } else if (path === "/api/alerts" && req.method === "GET") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "success",
            timestamp: new Date().toISOString(),
            telemetryAlerts: {
              status: "HEALTHY",
              activeAlerts: this.alerts.summary.totalActive,
              criticalAlerts: this.alerts.summary.criticalCount,
              activeAlerts: this.alerts.active,
              alertHistory: this.alerts.history,
            },
          }),
        );
      } else if (path === "/api/alerts" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const { severity, message, component } = JSON.parse(body);
            const alert = this.addAlert(severity, message, component);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "success", alert }));
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ status: "error", message: error.message }),
            );
          }
        });
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "error", message: "Not found" }));
      }
    });

    const PORT = 5054; // Use a different port to avoid conflicts
    server.listen(PORT, () => {
      this.log(`Alert Engine HTTP server started on port ${PORT}`);
    });

    this.httpServer = server;
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    this.log("Stopping Alert Engine...");
    this.removePID();
    this.saveAlerts();

    // Stop HTTP server if running
    if (this.httpServer) {
      this.httpServer.close();
      this.log("HTTP server stopped");
    }

    this.isRunning = false;
    this.log("Alert Engine stopped");
  }
}

async function main() {
  try {
    const alertEngine = new AlertEngine();
    await alertEngine.start();

    // Keep the process running
    process.on("SIGINT", async () => {
      console.log("Shutting down Alert Engine...");
      await alertEngine.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Shutting down Alert Engine...");
      await alertEngine.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start Alert Engine:", error);
    process.exit(1);
  }
}

main();
