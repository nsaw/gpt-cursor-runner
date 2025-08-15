#!/usr/bin/env node
/**
 * Metrics Aggregator Daemon
 * Collects and aggregates system metrics for performance monitoring
 * Integrates with existing Ghost Runner and BRAUN daemon systems
 */

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Unified path structure
const CYOPS_CACHE = "/Users/sawyer/gitSync/.cursor-cache/CYOPS";
const MAIN_CACHE = "/Users/sawyer/gitSync/.cursor-cache/MAIN";
const LOG_DIR = path.join(CYOPS_CACHE, "logs");
const PID_DIR = path.join(CYOPS_CACHE, "pids");

// Ensure directories exist
[LOG_DIR, PID_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const LOG_FILE = path.join(LOG_DIR, "metrics-aggregator-daemon.log");
const PID_FILE = path.join(PID_DIR, "metrics-aggregator-daemon.pid");

class MetricsAggregatorDaemon {
  constructor() {
    this.process = null;
    this.isRunning = false;
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.restartDelay = 5000; // 5 seconds
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;

    try {
      fs.appendFileSync(LOG_FILE, logEntry);
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }

    console.log(`[MetricsAggregatorDaemon] ${message}`);
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

  async start() {
    if (this.isRunning) {
      this.log("Daemon is already running");
      return;
    }

    this.log("Starting Metrics Aggregator Daemon...");
    this.writePID();

    // Start the metrics aggregator
    const aggregatorPath = path.join(
      __dirname,
      "../../src-nextgen/ghost/telemetry/ghostMetricsAggregatorRunner.ts",
    );

    if (!fs.existsSync(aggregatorPath)) {
      this.log(`Aggregator file not found: ${aggregatorPath}`, "error");
      return;
    }

    try {
      // Use ts-node to run the TypeScript file
      this.process = spawn("npx", ["ts-node", aggregatorPath], {
        stdio: ["pipe", "pipe", "pipe"],
        detached: false,
        env: {
          ...process.env,
          NODE_ENV: "production",
          CYOPS_CACHE: CYOPS_CACHE,
          MAIN_CACHE: MAIN_CACHE,
        },
      });

      this.isRunning = true;
      this.log("Metrics Aggregator process started");

      // Handle stdout
      this.process.stdout.on("data", (data) => {
        const output = data.toString().trim();
        if (output) {
          this.log(`Aggregator: ${output}`);
        }
      });

      // Handle stderr
      this.process.stderr.on("data", (data) => {
        const error = data.toString().trim();
        if (error) {
          this.log(`Aggregator Error: ${error}`, "error");
        }
      });

      // Handle process exit
      this.process.on("exit", (code, signal) => {
        this.isRunning = false;
        this.log(
          `Aggregator process exited with code ${code} and signal ${signal}`,
        );

        if (code !== 0 && this.restartCount < this.maxRestarts) {
          this.restartCount++;
          this.log(
            `Restarting aggregator (attempt ${this.restartCount}/${this.maxRestarts})...`,
          );
          setTimeout(() => this.start(), this.restartDelay);
        } else if (this.restartCount >= this.maxRestarts) {
          this.log("Max restart attempts reached, stopping daemon", "error");
          this.removePID();
        }
      });

      // Handle process errors
      this.process.on("error", (error) => {
        this.log(`Aggregator process error: ${error.message}`, "error");
      });
    } catch (error) {
      this.log(`Failed to start aggregator: ${error.message}`, "error");
      this.removePID();
    }
  }

  async stop() {
    if (!this.isRunning) {
      this.log("Daemon is not running");
      return;
    }

    this.log("Stopping Metrics Aggregator Daemon...");
    this.isRunning = false;

    if (this.process) {
      this.process.kill("SIGTERM");

      // Force kill after 5 seconds if not stopped
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.log("Force killing process...");
          this.process.kill("SIGKILL");
        }
      }, 5000);
    }

    this.removePID();
    this.log("Metrics Aggregator Daemon stopped");
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      restartCount: this.restartCount,
      maxRestarts: this.maxRestarts,
      pid: this.process ? this.process.pid : null,
      logFile: LOG_FILE,
      pidFile: PID_FILE,
    };
  }
}

// Handle process signals
process.on("SIGINT", () => {
  console.log("\nReceived SIGINT, shutting down...");
  daemon.stop().then(() => process.exit(0));
});

process.on("SIGTERM", () => {
  console.log("\nReceived SIGTERM, shutting down...");
  daemon.stop().then(() => process.exit(0));
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  daemon.log(`Uncaught Exception: ${error.message}`, "error");
  daemon.stop().then(() => process.exit(1));
});

process.on("unhandledRejection", (reason, promise) => {
  daemon.log(`Unhandled Rejection at ${promise}: ${reason}`, "error");
  daemon.stop().then(() => process.exit(1));
});

// Create and start daemon
const daemon = new MetricsAggregatorDaemon();

// Start the daemon
daemon.start().catch((error) => {
  console.error("Failed to start daemon:", error);
  process.exit(1);
});

// Export for testing
module.exports = MetricsAggregatorDaemon;
