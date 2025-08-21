import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

declare const console: unknown;

const execAsync = promisify(exec);
const logPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/sentinel-status.log";
const logDir = path.dirname(logPath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface DaemonStatus {
  name: string;
  running: boolean;
  error?: string;
  pid?: string;
}

const daemons = [
  "relayCore",
  "diffMonitor",
  "roleVerifier",
  "summarySyncValidator",
  "bootstrapDaemon",
  "monitorWatcher",
  "executor",
];

async function checkDaemonStatus(name: string): Promise<DaemonStatus> {
  try {
    // Use non-blocking pattern with better process detection
    const cmd = `ps aux | grep -E "${name}\.ts|${name}\.js" | grep -v grep | head -1`;
    const { stdout } = await execAsync(cmd);

    if (stdout.trim()) {
      const parts = stdout.trim().split(/\s+/);
      const pid = parts[1];
      return {
        name,
        running: true,
        pid,
      };
    } else {
      return {
        name,
        running: false,
      };
    }
  } catch (err) {
    return {
      name,
      running: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export async function startGhostSentinelGuard(): Promise<void> {
  console.log("[sentinel] Starting daemon monitoring...");

  // Initial status check
  await logDaemonStatus();

  // Set up monitoring interval (15 seconds)
  setInterval(async () => {
    await logDaemonStatus();
  }, 15000);
}

async function logDaemonStatus(): Promise<void> {
  const timestamp = new Date().toISOString();
  const statusPromises = daemons.map(checkDaemonStatus);
  const statuses = await Promise.all(statusPromises);

  const logEntries: string[] = [];

  statuses.forEach((status) => {
    if (status.running) {
      logEntries.push(
        `[${timestamp}] 🟢 ${status.name} is running (PID: ${status.pid || "unknown"})`,
      );
    } else if (status.error) {
      logEntries.push(
        `[${timestamp}] 🔴 ${status.name} ERROR: ${status.error}`,
      );
    } else {
      logEntries.push(`[${timestamp}] 🔴 ${status.name} NOT running`);
    }
  });

  const logEntry = logEntries.join("\n") + "\n";

  try {
    fs.appendFileSync(logPath, logEntry);
  } catch (err) {
    console.error("[sentinel] Failed to write to log:", err);
  }
}

export function getDaemonStatus(): Promise<DaemonStatus[]> {
  return Promise.all(daemons.map(checkDaemonStatus));
}
