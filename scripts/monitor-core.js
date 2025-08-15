#!/usr/bin/env node
/**
 * Monitor Core
 * Core functionality for summary monitoring system
 */

const fs = require("fs");
const path = require("path");

// Simple summary monitor implementation
class MonitorCore {
  constructor() {
    this.monitoring = false;
    this.interval = null;
    this.logFile =
      "/Users/sawyer/gitSync/gpt-cursor-runner/logs/summary-monitor.log";
    this.pidFile =
      "/Users/sawyer/gitSync/gpt-cursor-runner/pids/summary-monitor.pid";
  }

  start() {
    console.log("📊 Summary Monitor Core starting...");

    // Write PID file
    fs.writeFileSync(this.pidFile, process.pid.toString());

    this.monitoring = true;
    this.interval = setInterval(() => {
      this.checkSummaries();
    }, 30000); // Check every 30 seconds

    console.log("✅ Summary Monitor Core started");
  }

  stop() {
    console.log("🛑 Summary Monitor Core stopping...");
    this.monitoring = false;
    if (this.interval) {
      clearInterval(this.interval);
    }

    // Remove PID file
    try {
      fs.unlinkSync(this.pidFile);
    } catch (error) {
      // PID file may not exist
    }

    console.log("✅ Summary Monitor Core stopped");
  }

  checkSummaries() {
    try {
      const summariesPath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";
      if (fs.existsSync(summariesPath)) {
        const files = fs.readdirSync(summariesPath);
        const summaryFiles = files.filter((file) => file.endsWith(".md"));

        // Log summary count
        const logEntry = `[${new Date().toISOString()}] Found ${summaryFiles.length} summary files\n`;
        fs.appendFileSync(this.logFile, logEntry);
      }
    } catch (error) {
      console.error("Error checking summaries:", error.message);
    }
  }
}

// Start the monitor
const monitor = new MonitorCore();
monitor.start();

// Handle shutdown
process.on("SIGINT", () => {
  monitor.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  monitor.stop();
  process.exit(0);
});
