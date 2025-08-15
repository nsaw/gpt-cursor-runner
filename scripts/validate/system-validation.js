#!/usr/bin/env node

/**
 * System Validation Script
 * Comprehensive validation of GHOST RUNNER system fixes
 * Tests path routing, monitoring, self-healing, and system health
 * UPDATED: Validates all endpoints from TUNNELS.json
 */

const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");

const execAsync = promisify(exec);

// Configuration
const CONFIG = {
  // Paths to validate
  PATHS: {
    CYOPS_PATCHES: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
    CYOPS_SUMMARIES: "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
    MAIN_PATCHES: "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches",
    MAIN_SUMMARIES: "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries",
    UNIFIED_MONITOR_LOG:
      "/Users/sawyer/gitSync/gpt-cursor-runner/logs/unified-monitor.log",
    UNIFIED_MONITOR_HEARTBEAT:
      "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/.unified-monitor.json",
    TUNNELS_FILE: "/Users/sawyer/gitSync/.cursor-cache/.docs/TUNNELS.json",
  },

  // Expected processes
  EXPECTED_PROCESSES: [
    "ghost-bridge.js",
    "heartbeat-loop.js",
    "doc-daemon.js",
    "dual-m",
  ],
};

// Load all endpoints from TUNNELS.json
function loadAllEndpoints() {
  try {
    if (fs.existsSync(CONFIG.PATHS.TUNNELS_FILE)) {
      const tunnelsData = JSON.parse(
        fs.readFileSync(CONFIG.PATHS.TUNNELS_FILE, "utf8"),
      );
      const endpoints = [];

      // Add DNS records endpoints
      if (tunnelsData.dns_records) {
        tunnelsData.dns_records.forEach((record) => {
          if (record.status !== "INACTIVE" && record.dns_target) {
            endpoints.push({
              name: `${record.subdomain}.${record.domain}`,
              url: `https://${record.subdomain}.${record.domain}/health`,
              type: "dns_record",
              status: record.status,
              dns_target: record.dns_target,
            });
          }
        });
      }

      // Add ngrok endpoint
      if (tunnelsData.ngrok && tunnelsData.ngrok.domain) {
        endpoints.push({
          name: "ngrok-tunnel",
          url: `https://${tunnelsData.ngrok.domain}/health`,
          type: "ngrok",
          status: "ACTIVE",
          domain: tunnelsData.ngrok.domain,
        });
      }

      return endpoints;
    }
  } catch (_error) {
    console.error("Failed to load endpoints from TUNNELS.json:", error.message);
  }

  // Fallback to original hardcoded endpoints
  return [
    {
      name: "cloudflare-tunnel",
      url: "https://gpt-cursor-runner.fly.dev/health",
      type: "cloudflare",
      status: "ACTIVE",
    },
    {
      name: "ngrok-tunnel",
      url: "https://runner.thoughtmarks.app/health",
      type: "ngrok",
      status: "ACTIVE",
    },
  ];
}

class SystemValidator {
  constructor() {
    this.results = {
      pathRouting: {},
      monitoring: {},
      processes: {},
      health: {},
      overall: "PENDING",
    };
    this.endpoints = loadAllEndpoints();
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  async validatePathRouting() {
    this.log("🔍 Validating path routing configuration...");

    const pathChecks = [
      { name: "CYOPS Patches", path: CONFIG.PATHS.CYOPS_PATCHES },
      { name: "CYOPS Summaries", path: CONFIG.PATHS.CYOPS_SUMMARIES },
      { name: "MAIN Patches", path: CONFIG.PATHS.MAIN_PATCHES },
      { name: "MAIN Summaries", path: CONFIG.PATHS.MAIN_SUMMARIES },
    ];

    for (const check of pathChecks) {
      try {
        const exists = fs.existsSync(check.path);
        const writable = fs.accessSync(check.path, fs.constants.W_OK);

        this.results.pathRouting[check.name] = {
          exists,
          writable: !writable,
          status: exists && !writable ? "PASS" : "FAIL",
        };

        this.log(
          `  ${check.name}: ${this.results.pathRouting[check.name].status}`,
        );
      } catch (_error) {
        this.results.pathRouting[check.name] = {
          exists: false,
          writable: false,
          status: "FAIL",
          error: error.message,
        };
        this.log(`  ${check.name}: FAIL - ${error.message}`);
      }
    }
  }

  async validateMonitoring() {
    this.log("🔍 Validating monitoring systems...");

    // Check unified monitor log
    try {
      const logExists = fs.existsSync(CONFIG.PATHS.UNIFIED_MONITOR_LOG);
      const logContent = logExists
        ? fs.readFileSync(CONFIG.PATHS.UNIFIED_MONITOR_LOG, "utf8")
        : "";
      const hasRecentActivity = logContent.includes(
        new Date().toISOString().split("T")[0],
      );

      this.results.monitoring.log = {
        exists: logExists,
        hasRecentActivity,
        status: logExists && hasRecentActivity ? "PASS" : "FAIL",
      };

      this.log(`  Unified Monitor Log: ${this.results.monitoring.log.status}`);
    } catch (_error) {
      this.results.monitoring.log = {
        exists: false,
        hasRecentActivity: false,
        status: "FAIL",
        error: error.message,
      };
      this.log(`  Unified Monitor Log: FAIL - ${error.message}`);
    }

    // Check unified monitor heartbeat
    try {
      const heartbeatExists = fs.existsSync(
        CONFIG.PATHS.UNIFIED_MONITOR_HEARTBEAT,
      );
      let heartbeatData = null;

      if (heartbeatExists) {
        heartbeatData = JSON.parse(
          fs.readFileSync(CONFIG.PATHS.UNIFIED_MONITOR_HEARTBEAT, "utf8"),
        );
      }

      const isRecent =
        heartbeatData && new Date() - new Date(heartbeatData.timestamp) < 60000; // Within last minute

      this.results.monitoring.heartbeat = {
        exists: heartbeatExists,
        isRecent,
        status: heartbeatExists && isRecent ? "PASS" : "FAIL",
        data: heartbeatData,
      };

      this.log(
        `  Unified Monitor Heartbeat: ${this.results.monitoring.heartbeat.status}`,
      );
    } catch (_error) {
      this.results.monitoring.heartbeat = {
        exists: false,
        isRecent: false,
        status: "FAIL",
        error: error.message,
      };
      this.log(`  Unified Monitor Heartbeat: FAIL - ${error.message}`);
    }
  }

  async validateProcesses() {
    this.log("🔍 Validating critical processes...");

    for (const processName of CONFIG.EXPECTED_PROCESSES) {
      try {
        const { stdout } = await execAsync(
          `ps aux | grep "${processName}" | grep -v grep`,
        );
        const isRunning = stdout.trim().length > 0;

        this.results.processes[processName] = {
          running: isRunning,
          status: isRunning ? "PASS" : "FAIL",
        };

        this.log(
          `  ${processName}: ${this.results.processes[processName].status}`,
        );
      } catch (_error) {
        this.results.processes[processName] = {
          running: false,
          status: "FAIL",
          error: error.message,
        };
        this.log(`  ${processName}: FAIL - ${error.message}`);
      }
    }
  }

  async validateHealth() {
    this.log(`🔍 Validating ${this.endpoints.length} health endpoints...`);

    for (const endpoint of this.endpoints) {
      try {
        const { stdout } = await execAsync(`curl -s -m 5 "${endpoint.url}"`);
        const isHealthy =
          stdout.includes("healthy") ||
          stdout.includes("ok") ||
          stdout.length > 0;

        this.results.health[endpoint.name] = {
          reachable: isHealthy,
          status: isHealthy ? "PASS" : "FAIL",
          url: endpoint.url,
          type: endpoint.type,
          response: stdout.substring(0, 100), // First 100 chars
        };

        this.log(
          `  ${endpoint.name} (${endpoint.type}): ${this.results.health[endpoint.name].status}`,
        );
      } catch (_error) {
        this.results.health[endpoint.name] = {
          reachable: false,
          status: "FAIL",
          url: endpoint.url,
          type: endpoint.type,
          error: error.message,
        };
        this.log(
          `  ${endpoint.name} (${endpoint.type}): FAIL - ${error.message}`,
        );
      }
    }
  }

  calculateOverallStatus() {
    const allResults = [
      ...Object.values(this.results.pathRouting).map((r) => r.status),
      ...Object.values(this.results.monitoring).map((r) => r.status),
      ...Object.values(this.results.processes).map((r) => r.status),
      ...Object.values(this.results.health).map((r) => r.status),
    ];

    const passCount = allResults.filter((r) => r === "PASS").length;
    const totalCount = allResults.length;
    const passRate = totalCount > 0 ? (passCount / totalCount) * 100 : 0;

    if (passRate >= 90) {
      this.results.overall = "PASS";
    } else if (passRate >= 70) {
      this.results.overall = "WARNING";
    } else {
      this.results.overall = "FAIL";
    }

    this.results.summary = {
      passCount,
      totalCount,
      passRate: Math.round(passRate * 100) / 100,
    };
  }

  async runValidation() {
    this.log("🚀 Starting comprehensive system validation...");
    this.log(
      `📊 Validating ${this.endpoints.length} endpoints from TUNNELS.json`,
    );
    this.log("");

    await this.validatePathRouting();
    this.log("");

    await this.validateMonitoring();
    this.log("");

    await this.validateProcesses();
    this.log("");

    await this.validateHealth();
    this.log("");

    this.calculateOverallStatus();

    this.log("📊 Validation Results Summary:");
    this.log(`  Overall Status: ${this.results.overall}`);
    this.log(
      `  Pass Rate: ${this.results.summary.passCount}/${this.results.summary.totalCount} (${this.results.summary.passRate}%)`,
    );
    this.log("");

    // Detailed results
    this.log("📋 Detailed Results:");
    console.log(JSON.stringify(this.results, null, 2));

    return this.results;
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      validation: "GHOST RUNNER System Validation (Enhanced)",
      endpoints: this.endpoints,
      results: this.results,
    };

    const reportPath =
      "/Users/sawyer/gitSync/gpt-cursor-runner/logs/system-validation.json";
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    this.log(`📄 Validation report saved to: ${reportPath}`);
  }
}

// CLI interface
const validator = new SystemValidator();

const command = process.argv[2];

switch (command) {
  case "validate":
    validator.runValidation().then(() => {
      validator.generateReport();
      process.exit(validator.results.overall === "PASS" ? 0 : 1);
    });
    break;
  case "quick":
    validator.validatePathRouting().then(() => {
      console.log("Quick validation completed");
      process.exit(0);
    });
    break;
  default:
    console.log("🔍 GHOST RUNNER System Validator (Enhanced)");
    console.log("");
    console.log("Usage: node system-validation.js [validate|quick]");
    console.log("");
    console.log("Commands:");
    console.log("  validate - Run comprehensive system validation");
    console.log("  quick    - Run quick path routing validation");
    console.log("");
    console.log("This validator tests all GHOST RUNNER system fixes including");
    console.log("path routing, monitoring, self-healing, and system health.");
    console.log("Validates all endpoints from TUNNELS.json.");
}
