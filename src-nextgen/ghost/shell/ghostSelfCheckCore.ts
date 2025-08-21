import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import http from "http";
import https from "https";

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};

const execAsync = promisify(exec);
const selfCheckLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/selfcheck-health.log";
const logDir = path.dirname(selfCheckLogPath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface HealthCheckResult {
  timestamp: string;
  component: string;
  status: "healthy" | "warning" | "critical" | "unknown";
  responseTime?: number;
  error?: string;
  details?: unknown;
}

interface SystemHealth {
  timestamp: string;
  overallStatus: "healthy" | "warning" | "critical";
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
  };
}

const healthCheckEndpoints = [
  { name: "ghost-shell", url: "http://localhost:8787/health", timeout: 5000 },
  {
    name: "patch-executor",
    url: "http://localhost:8787/executor/status",
    timeout: 5000,
  },
  {
    name: "sentinel-guard",
    url: "http://localhost:8787/sentinel/status",
    timeout: 5000,
  },
  {
    name: "watchdog-loop",
    url: "http://localhost:8787/watchdog/status",
    timeout: 5000,
  },
];

const runtimeChecks = [
  "disk-space",
  "memory-usage",
  "process-count",
  "log-file-sizes",
  "daemon-liveness",
  "file-permissions",
];

async function checkHttpEndpoint(
  name: string,
  url: string,
  timeout: number,
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  try {
    const response = await new Promise<{ statusCode: number; data: string }>(
      (resolve, reject) => {
        const client = url.startsWith("https") ? https : http;
        const req = client.get(url, { timeout }, (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => resolve({ statusCode: res.statusCode!, data }));
        });

        req.on("error", reject);
        req.on("timeout", () => reject(new Error("Request timeout")));
      },
    );

    const responseTime = Date.now() - startTime;

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return {
        timestamp,
        component: name,
        status: "healthy",
        responseTime,
        details: { statusCode: response.statusCode },
      };
    } else if (response.statusCode >= 400 && response.statusCode < 500) {
      return {
        timestamp,
        component: name,
        status: "warning",
        responseTime,
        error: `HTTP ${response.statusCode}`,
        details: { statusCode: response.statusCode },
      };
    } else {
      return {
        timestamp,
        component: name,
        status: "critical",
        responseTime,
        error: `HTTP ${response.statusCode}`,
        details: { statusCode: response.statusCode },
      };
    }
  } catch (err) {
    const responseTime = Date.now() - startTime;
    return {
      timestamp,
      component: name,
      status: "critical",
      responseTime,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkDiskSpace(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();

  try {
    const cmd = "df -h /Users/sawyer/gitSync | tail -1 | awk '{print $5}' | sed 's/%//'";
    const { stdout } = await execAsync(cmd);
    const usagePercent = parseInt(stdout.trim());

    if (usagePercent < 80) {
      return {
        timestamp,
        component: "disk-space",
        status: "healthy",
        details: { usagePercent: `${usagePercent}%` },
      };
    } else if (usagePercent < 90) {
      return {
        timestamp,
        component: "disk-space",
        status: "warning",
        details: { usagePercent: `${usagePercent}%` },
      };
    } else {
      return {
        timestamp,
        component: "disk-space",
        status: "critical",
        error: `Disk usage ${usagePercent}%`,
        details: { usagePercent: `${usagePercent}%` },
      };
    }
  } catch (err) {
    return {
      timestamp,
      component: "disk-space",
      status: "unknown",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkMemoryUsage(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();

  try {
    const cmd = "top -l 1 | grep 'PhysMem' | awk '{print $2}' | sed 's/[^0-9]//g'";
    const { stdout } = await execAsync(cmd);
    const usedMB = parseInt(stdout.trim());

    // Assuming 16GB system, calculate percentage
    const totalMB = 16384;
    const usagePercent = Math.round((usedMB / totalMB) * 100);

    if (usagePercent < 80) {
      return {
        timestamp,
        component: "memory-usage",
        status: "healthy",
        details: { usagePercent: `${usagePercent}%`, usedMB: `${usedMB}MB` },
      };
    } else if (usagePercent < 90) {
      return {
        timestamp,
        component: "memory-usage",
        status: "warning",
        details: { usagePercent: `${usagePercent}%`, usedMB: `${usedMB}MB` },
      };
    } else {
      return {
        timestamp,
        component: "memory-usage",
        status: "critical",
        error: `Memory usage ${usagePercent}%`,
        details: { usagePercent: `${usagePercent}%`, usedMB: `${usedMB}MB` },
      };
    }
  } catch (err) {
    return {
      timestamp,
      component: "memory-usage",
      status: "unknown",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkProcessCount(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();

  try {
    const cmd = "ps aux | grep -E \"\.ts|\.js\" | grep -v grep | wc -l";
    const { stdout } = await execAsync(cmd);
    const processCount = parseInt(stdout.trim());

    if (processCount >= 5 && processCount <= 20) {
      return {
        timestamp,
        component: "process-count",
        status: "healthy",
        details: { processCount },
      };
    } else if (processCount < 5) {
      return {
        timestamp,
        component: "process-count",
        status: "warning",
        error: `Low process count: ${processCount}`,
        details: { processCount },
      };
    } else {
      return {
        timestamp,
        component: "process-count",
        status: "critical",
        error: `High process count: ${processCount}`,
        details: { processCount },
      };
    }
  } catch (err) {
    return {
      timestamp,
      component: "process-count",
      status: "unknown",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkLogFileSizes(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();

  try {
    const logDir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs";
    const cmd = `find ${logDir} -name "*.log" -exec ls -lh {} \; | awk '{sum+=$5} END {print sum}'`;
    const { stdout } = await execAsync(cmd);
    const totalSizeMB = parseFloat(stdout.trim()) || 0;

    if (totalSizeMB < 100) {
      return {
        timestamp,
        component: "log-file-sizes",
        status: "healthy",
        details: { totalSizeMB: `${totalSizeMB.toFixed(2)}MB` },
      };
    } else if (totalSizeMB < 500) {
      return {
        timestamp,
        component: "log-file-sizes",
        status: "warning",
        details: { totalSizeMB: `${totalSizeMB.toFixed(2)}MB` },
      };
    } else {
      return {
        timestamp,
        component: "log-file-sizes",
        status: "critical",
        error: `Large log files: ${totalSizeMB.toFixed(2)}MB`,
        details: { totalSizeMB: `${totalSizeMB.toFixed(2)}MB` },
      };
    }
  } catch (err) {
    return {
      timestamp,
      component: "log-file-sizes",
      status: "unknown",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkDaemonLiveness(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();

  try {
    const daemons = [
      "relayCore",
      "diffMonitor",
      "roleVerifier",
      "summarySyncValidator",
      "bootstrapDaemon",
      "monitorWatcher",
      "executor",
    ];
    const cmd = `ps aux | grep -E "${daemons.join("|")}" | grep -v grep | wc -l`;
    const { stdout } = await execAsync(cmd);
    const runningDaemons = parseInt(stdout.trim());

    if (runningDaemons >= 5) {
      return {
        timestamp,
        component: "daemon-liveness",
        status: "healthy",
        details: { runningDaemons, totalDaemons: daemons.length },
      };
    } else if (runningDaemons >= 3) {
      return {
        timestamp,
        component: "daemon-liveness",
        status: "warning",
        error: `Only ${runningDaemons} daemons running`,
        details: { runningDaemons, totalDaemons: daemons.length },
      };
    } else {
      return {
        timestamp,
        component: "daemon-liveness",
        status: "critical",
        error: `Critical: Only ${runningDaemons} daemons running`,
        details: { runningDaemons, totalDaemons: daemons.length },
      };
    }
  } catch (err) {
    return {
      timestamp,
      component: "daemon-liveness",
      status: "unknown",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkFilePermissions(): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString();

  try {
    const criticalPaths = [
      "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs",
      "/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell",
    ];

    let allAccessible = true;
    const inaccessiblePaths: string[] = [];

    for (const path of criticalPaths) {
      try {
        await fs.promises.access(path, fs.constants.R_OK | fs.constants.W_OK);
      } catch {
        allAccessible = false;
        inaccessiblePaths.push(path);
      }
    }

    if (allAccessible) {
      return {
        timestamp,
        component: "file-permissions",
        status: "healthy",
        details: { checkedPaths: criticalPaths.length },
      };
    } else {
      return {
        timestamp,
        component: "file-permissions",
        status: "critical",
        error: `Inaccessible paths: ${inaccessiblePaths.join(", ")}`,
        details: { inaccessiblePaths },
      };
    }
  } catch (err) {
    return {
      timestamp,
      component: "file-permissions",
      status: "unknown",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function runHealthChecks(): Promise<SystemHealth> {
  const timestamp = new Date().toISOString();
  const checks: HealthCheckResult[] = [];

  // Run HTTP endpoint checks
  for (const endpoint of healthCheckEndpoints) {
    const result = await checkHttpEndpoint(
      endpoint.name,
      endpoint.url,
      endpoint.timeout,
    );
    checks.push(result);
  }

  // Run runtime checks
  const runtimeResults = await Promise.all([
    checkDiskSpace(),
    checkMemoryUsage(),
    checkProcessCount(),
    checkLogFileSizes(),
    checkDaemonLiveness(),
    checkFilePermissions(),
  ]);

  checks.push(...runtimeResults);

  // Calculate summary
  const summary = {
    total: checks.length,
    healthy: checks.filter((c) => c.status === "healthy").length,
    warning: checks.filter((c) => c.status === "warning").length,
    critical: checks.filter((c) => c.status === "critical").length,
  };

  // Determine overall status
  let overallStatus: "healthy" | "warning" | "critical" = "healthy";
  if (summary.critical > 0) {
    overallStatus = "critical";
  } else if (summary.warning > 0) {
    overallStatus = "warning";
  }

  return {
    timestamp,
    overallStatus,
    checks,
    summary,
  };
}

async function logHealthStatus(health: SystemHealth): Promise<void> {
  const statusEmoji =
    health.overallStatus === "healthy"
      ? "🟢"
      : health.overallStatus === "warning"
        ? "🟡"
        : "🔴";

  const logEntry = `[${health.timestamp}] ${statusEmoji} SYSTEM ${health.overallStatus.toUpperCase()} | Total: ${health.summary.total} | Healthy: ${health.summary.healthy} | Warning: ${health.summary.warning} | Critical: ${health.summary.critical}\n`;

  try {
    fs.appendFileSync(selfCheckLogPath, logEntry);
  } catch (err) {
    console.error("[selfcheck-core] Failed to write health log:", err);
  }
}

export async function startGhostSelfCheckCore(): Promise<void> {
  console.log("[selfcheck-core] Starting health monitoring...");

  // Initial health check
  const initialHealth = await runHealthChecks();
  await logHealthStatus(initialHealth);

  // Set up health monitoring loop (every 60 seconds)
  setInterval(async () => {
    const health = await runHealthChecks();
    await logHealthStatus(health);
  }, 60000);
}

export async function getCurrentHealth(): Promise<SystemHealth> {
  return await runHealthChecks();
}

export function getHealthSummary(): Promise<{
  healthy: number;
  warning: number;
  critical: number;
  total: number;
}> {
  return runHealthChecks().then((health) => health.summary);
}
