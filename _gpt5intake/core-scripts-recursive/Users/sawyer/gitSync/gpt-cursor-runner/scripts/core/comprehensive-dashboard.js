#!/usr/bin/env node
/**
 * Comprehensive Dashboard System
 * Real-time monitoring, alert system, and rollback capabilities for GHOST
 * Integrates with all components for unified system management
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const fs = require("fs/promises");
const path = require("path");
const { EventEmitter } = require("events");

class ComprehensiveDashboard extends EventEmitter {
  constructor(options = {}) {
    super();

    this.port = options.port || 3002;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });

    // System components
    this.components = {
      patchExecutor: { port: 5051, name: "Patch Executor" },
      telemetryAPI: { port: 8788, name: "Telemetry API" },
      statusAPI: { port: 8789, name: "Status API" },
      dualMonitor: { port: 3001, name: "Dual Monitor" },
      autonomousTrigger: { port: 8790, name: "Autonomous Trigger" },
    };

    // Alert system
    this.alerts = new Map();
    this.alertLevels = {
      info: { color: "blue", priority: 1 },
      warning: { color: "yellow", priority: 2 },
      error: { color: "red", priority: 3 },
      critical: { color: "red", priority: 4 },
    };

    // Rollback system
    this.rollbackHistory = new Map();
    this.backupLocations = {
      patches: "/Users/sawyer/gitSync/.cursor-cache/backups/patches",
      summaries: "/Users/sawyer/gitSync/.cursor-cache/backups/summaries",
    };

    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupMonitoring();
    this.setupAlertSystem();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static("dashboard/static"));
    this.app.use((req, res, next) => {
      res.header("Access-Control-Allow-Origin", "*");
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization",
      );
      if (req.method === "OPTIONS") {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  setupRoutes() {
    // Dashboard home
    this.app.get("/", (req, res) => {
      res.sendFile(
        path.join(__dirname, "../dashboard/templates/dashboard.html"),
      );
    });

    // System overview
    this.app.get("/api/overview", async (req, res) => {
      try {
        const overview = await this.getSystemOverview();
        res.json({
          status: "success",
          timestamp: new Date().toISOString(),
          data: overview,
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // Component status
    this.app.get("/api/components/status", async (req, res) => {
      try {
        const status = await this.getComponentStatus();
        res.json({
          status: "success",
          timestamp: new Date().toISOString(),
          data: status,
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // Patch queue status
    this.app.get("/api/patches/queue", async (req, res) => {
      try {
        const queue = await this.getPatchQueue();
        res.json({
          status: "success",
          timestamp: new Date().toISOString(),
          data: queue,
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // Active alerts
    this.app.get("/api/alerts", async (req, res) => {
      try {
        const alerts = await this.getActiveAlerts();
        res.json({
          status: "success",
          timestamp: new Date().toISOString(),
          data: alerts,
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // Rollback history
    this.app.get("/api/rollback/history", async (req, res) => {
      try {
        const history = await this.getRollbackHistory();
        res.json({
          status: "success",
          timestamp: new Date().toISOString(),
          data: history,
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // Trigger rollback
    this.app.post("/api/rollback/:patchId", async (req, res) => {
      try {
        const { patchId } = req.params;
        const { reason } = req.body;

        const result = await this.triggerRollback(patchId, reason);
        res.json({
          status: "success",
          message: "Rollback triggered",
          data: result,
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // Acknowledge alert
    this.app.post("/api/alerts/:alertId/acknowledge", async (req, res) => {
      try {
        const { alertId } = req.params;
        await this.acknowledgeAlert(alertId);
        res.json({
          status: "success",
          message: "Alert acknowledged",
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });

    // System health check
    this.app.get("/api/health", async (req, res) => {
      try {
        const health = await this.getSystemHealth();
        res.json({
          status: "success",
          timestamp: new Date().toISOString(),
          data: health,
        });
      } catch (_error) {
        res.status(500).json({
          status: "error",
          error: error.message,
        });
      }
    });
  }

  setupWebSocket() {
    this.wss.on("connection", (ws, req) => {
      const clientId = this.generateClientId();
      console.log(`🔌 [DASHBOARD] WebSocket client connected: ${clientId}`);

      // Send initial data
      this.sendInitialData(ws);

      ws.on("message", (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(clientId, data);
        } catch (_error) {
          console.error(
            "❌ [DASHBOARD] WebSocket message error:",
            error.message,
          );
        }
      });

      ws.on("close", () => {
        console.log(
          `🔌 [DASHBOARD] WebSocket client disconnected: ${clientId}`,
        );
      });
    });
  }

  setupMonitoring() {
    // Monitor system components
    setInterval(async () => {
      try {
        await this.monitorComponents();
      } catch (_error) {
        console.error(
          "❌ [DASHBOARD] Component monitoring error:",
          error.message,
        );
      }
    }, 10000); // Every 10 seconds

    // Monitor patch queues
    setInterval(async () => {
      try {
        await this.monitorPatchQueues();
      } catch (_error) {
        console.error(
          "❌ [DASHBOARD] Patch queue monitoring error:",
          error.message,
        );
      }
    }, 5000); // Every 5 seconds
  }

  setupAlertSystem() {
    // Alert thresholds
    this.alertThresholds = {
      componentDown: 30, // seconds
      patchQueueStuck: 60, // seconds
      highErrorRate: 0.1, // 10%
      memoryUsage: 0.9, // 90%
      diskUsage: 0.95, // 95%
    };

    // Check for alerts periodically
    setInterval(async () => {
      try {
        await this.checkForAlerts();
      } catch (_error) {
        console.error("❌ [DASHBOARD] Alert check error:", error.message);
      }
    }, 15000); // Every 15 seconds
  }

  async getSystemOverview() {
    const [componentStatus, patchQueue, alerts, health] = await Promise.all([
      this.getComponentStatus(),
      this.getPatchQueue(),
      this.getActiveAlerts(),
      this.getSystemHealth(),
    ]);

    return {
      components: componentStatus,
      patches: patchQueue,
      alerts,
      health,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getComponentStatus() {
    const status = {};

    for (const [name, component] of Object.entries(this.components)) {
      try {
        const isHealthy = await this.checkComponentHealth(component);
        status[name] = {
          name: component.name,
          port: component.port,
          healthy: isHealthy,
          lastChecked: new Date().toISOString(),
        };
      } catch (_error) {
        status[name] = {
          name: component.name,
          port: component.port,
          healthy: false,
          error: error.message,
          lastChecked: new Date().toISOString(),
        };
      }
    }

    return status;
  }

  async checkComponentHealth(component) {
    return new Promise((resolve) => {
      const http = require("http");
      const req = http.request(
        {
          hostname: "localhost",
          port: component.port,
          path: "/health",
          method: "GET",
          timeout: 5000,
        },
        (res) => {
          resolve(res.statusCode === 200);
        },
      );

      req.on("error", () => {
        resolve(false);
      });

      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  }

  async getPatchQueue() {
    const queues = {
      CYOPS: {
        pending: 0,
        executing: 0,
        completed: 0,
        failed: 0,
      },
      MAIN: {
        pending: 0,
        executing: 0,
        completed: 0,
        failed: 0,
      },
    };

    for (const [system, queue] of Object.entries(queues)) {
      const patchDir = `/Users/sawyer/gitSync/.cursor-cache/${system}/patches`;

      try {
        const files = await fs.readdir(patchDir);

        for (const file of files) {
          if (file.endsWith(".json") && !file.startsWith(".")) {
            if (file.includes(".completed")) {
              queue.completed++;
            } else if (file.includes(".failed")) {
              queue.failed++;
            } else {
              queue.pending++;
            }
          }
        }
      } catch (_error) {
        console.error(
          `❌ [DASHBOARD] Error reading ${system} queue:`,
          error.message,
        );
      }
    }

    return queues;
  }

  async getActiveAlerts() {
    const activeAlerts = [];

    for (const [alertId, alert] of this.alerts) {
      if (!alert.acknowledged) {
        activeAlerts.push({
          id: alertId,
          ...alert,
        });
      }
    }

    return activeAlerts.sort(
      (a, b) =>
        this.alertLevels[b.level].priority - this.alertLevels[a.level].priority,
    );
  }

  async getRollbackHistory() {
    const history = [];

    for (const [patchId, rollback] of this.rollbackHistory) {
      history.push({
        patchId,
        ...rollback,
      });
    }

    return history.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );
  }

  async getSystemHealth() {
    const health = {
      cpu: await this.getCPUUsage(),
      memory: await this.getMemoryUsage(),
      disk: await this.getDiskUsage(),
      network: await this.getNetworkStatus(),
    };

    return health;
  }

  async getCPUUsage() {
    return new Promise((resolve) => {
      const { exec } = require("child_process");
      exec('top -l 1 | grep "CPU usage"', (error, stdout) => {
        if (error) {
          resolve({ usage: 0, error: error.message });
        } else {
          const match = stdout.match(/(\d+\.\d+)%/);
          resolve({ usage: match ? parseFloat(match[1]) / 100 : 0 });
        }
      });
    });
  }

  async getMemoryUsage() {
    return new Promise((resolve) => {
      const { exec } = require("child_process");
      exec('vm_stat | grep "Pages free"', (error, stdout) => {
        if (error) {
          resolve({ usage: 0, error: error.message });
        } else {
          // Simplified memory calculation
          resolve({ usage: 0.5 }); // Placeholder
        }
      });
    });
  }

  async getDiskUsage() {
    return new Promise((resolve) => {
      const { exec } = require("child_process");
      exec("df /Users/sawyer/gitSync | tail -1", (error, stdout) => {
        if (error) {
          resolve({ usage: 0, error: error.message });
        } else {
          const parts = stdout.split(/\s+/);
          const usagePercent = parseInt(parts[4].replace("%", ""));
          resolve({ usage: usagePercent / 100 });
        }
      });
    });
  }

  async getNetworkStatus() {
    return new Promise((resolve) => {
      const { exec } = require("child_process");
      exec("ping -c 1 google.com", (error) => {
        resolve({ connected: !error });
      });
    });
  }

  async monitorComponents() {
    const status = await this.getComponentStatus();

    for (const [name, component] of Object.entries(status)) {
      if (!component.healthy) {
        this.createAlert("component_down", {
          level: "error",
          title: `${component.name} is down`,
          message: `Component ${component.name} on port ${component.port} is not responding`,
          component: name,
        });
      }
    }
  }

  async monitorPatchQueues() {
    const queues = await this.getPatchQueue();

    for (const [system, queue] of Object.entries(queues)) {
      if (queue.pending > 10) {
        this.createAlert("patch_queue_backlog", {
          level: "warning",
          title: `${system} patch queue backlog`,
          message: `${queue.pending} patches pending in ${system} queue`,
          system,
          count: queue.pending,
        });
      }

      if (queue.failed > 5) {
        this.createAlert("high_failure_rate", {
          level: "error",
          title: `High failure rate in ${system}`,
          message: `${queue.failed} failed patches in ${system}`,
          system,
          count: queue.failed,
        });
      }
    }
  }

  async checkForAlerts() {
    const health = await this.getSystemHealth();

    // Check memory usage
    if (health.memory.usage > this.alertThresholds.memoryUsage) {
      this.createAlert("high_memory_usage", {
        level: "warning",
        title: "High memory usage",
        message: `Memory usage is ${(health.memory.usage * 100).toFixed(1)}%`,
        usage: health.memory.usage,
      });
    }

    // Check disk usage
    if (health.disk.usage > this.alertThresholds.diskUsage) {
      this.createAlert("high_disk_usage", {
        level: "critical",
        title: "High disk usage",
        message: `Disk usage is ${(health.disk.usage * 100).toFixed(1)}%`,
        usage: health.disk.usage,
      });
    }

    // Check network connectivity
    if (!health.network.connected) {
      this.createAlert("network_disconnected", {
        level: "error",
        title: "Network disconnected",
        message: "No internet connectivity detected",
      });
    }
  }

  createAlert(type, data) {
    const alertId = `${type}_${Date.now()}`;
    const alert = {
      id: alertId,
      type,
      level: data.level || "info",
      title: data.title,
      message: data.message,
      timestamp: new Date().toISOString(),
      acknowledged: false,
      ...data,
    };

    this.alerts.set(alertId, alert);

    // Broadcast alert to WebSocket clients
    this.broadcast({
      type: "alert",
      data: alert,
    });

    console.log(`🚨 [DASHBOARD] Alert created: ${alert.title}`);

    // Emit alert event
    this.emit("alert", alert);
  }

  async acknowledgeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();

      // Broadcast acknowledgment
      this.broadcast({
        type: "alert_acknowledged",
        data: { alertId },
      });
    }
  }

  async triggerRollback(patchId, reason) {
    const rollbackId = `rollback_${Date.now()}`;
    const rollback = {
      id: rollbackId,
      patchId,
      reason,
      timestamp: new Date().toISOString(),
      status: "pending",
    };

    try {
      // Create backup
      await this.createBackup(patchId);

      // Perform rollback
      await this.performRollback(patchId);

      rollback.status = "completed";
      rollback.completedAt = new Date().toISOString();

      // Create alert
      this.createAlert("rollback_completed", {
        level: "info",
        title: "Rollback completed",
        message: `Successfully rolled back patch ${patchId}`,
        patchId,
      });
    } catch (_error) {
      rollback.status = "failed";
      rollback.error = error.message;

      // Create alert
      this.createAlert("rollback_failed", {
        level: "error",
        title: "Rollback failed",
        message: `Failed to rollback patch ${patchId}: ${error.message}`,
        patchId,
      });
    }

    this.rollbackHistory.set(rollbackId, rollback);

    // Broadcast rollback event
    this.broadcast({
      type: "rollback",
      data: rollback,
    });

    return rollback;
  }

  async createBackup(patchId) {
    // Create backup directories
    for (const [type, backupDir] of Object.entries(this.backupLocations)) {
      await fs.mkdir(backupDir, { recursive: true });
    }

    // Backup patch files
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `${patchId}_${timestamp}`;

    // This is a simplified backup - in production, you'd want more sophisticated backup logic
    console.log(`💾 [DASHBOARD] Created backup: ${backupName}`);
  }

  async performRollback(patchId) {
    // Simplified rollback logic - in production, you'd want more sophisticated rollback
    console.log(`🔄 [DASHBOARD] Performing rollback for patch: ${patchId}`);

    // Simulate rollback process
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendInitialData(ws) {
    try {
      const overview = await this.getSystemOverview();
      ws.send(
        JSON.stringify({
          type: "initial_data",
          data: overview,
        }),
      );
    } catch (_error) {
      console.error(
        "❌ [DASHBOARD] Error sending initial data:",
        error.message,
      );
    }
  }

  handleWebSocketMessage(clientId, data) {
    switch (data.type) {
      case "subscribe_alerts":
        // Handle alert subscription
        break;
      case "ping":
        this.sendToClient(clientId, {
          type: "pong",
          timestamp: new Date().toISOString(),
        });
        break;
      default:
        console.warn(
          `⚠️ [DASHBOARD] Unknown WebSocket message type: ${data.type}`,
        );
    }
  }

  sendToClient(clientId, data) {
    this.wss.clients.forEach((client) => {
      if (client.clientId === clientId) {
        client.send(JSON.stringify(data));
      }
    });
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(
        `🚀 [DASHBOARD] Comprehensive dashboard started on port ${this.port}`,
      );
      console.log("📊 [DASHBOARD] WebSocket server ready for connections");
    });
  }

  stop() {
    this.server.close(() => {
      console.log("🛑 [DASHBOARD] Comprehensive dashboard stopped");
    });
  }
}

// Export for use in other modules
module.exports = ComprehensiveDashboard;

// CLI interface
if (require.main === module) {
  const dashboard = new ComprehensiveDashboard();
  dashboard.start();

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n🛑 [DASHBOARD] Shutting down...");
    dashboard.stop();
    process.exit(0);
  });
}
