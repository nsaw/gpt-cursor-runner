import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

declare const console: {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  info: (...args: any[]) => void;
  debug: (...args: any[]) => void;
};

const execAsync = promisify(exec);
const executorLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/executor-coordination.log";
const sentinelLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/sentinel-status.log";
const watchdogLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/watchdog-restarts.log";
const logDir = path.dirname(executorLogPath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface ExecutorStatus {
  timestamp: string;
  phase: "idle" | "processing" | "coordinating" | "error";
  currentPatch?: string;
  sentinelHealth: boolean;
  watchdogHealth: boolean;
  daemonCount: number;
  error?: string;
}

interface CoordinationState {
  lastSentinelCheck: number;
  lastWatchdogCheck: number;
  lastExecutorRun: number;
  isProcessing: boolean;
  consecutiveErrors: number;
}

const coordinationState: CoordinationState = {
  lastSentinelCheck: 0,
  lastWatchdogCheck: 0,
  lastExecutorRun: 0,
  isProcessing: false,
  consecutiveErrors: 0,
};

const maxConsecutiveErrors = 5;
const coordinationInterval = 10000; // 10 seconds

async function checkSentinelHealth(): Promise<boolean> {
  try {
    if (!fs.existsSync(sentinelLogPath)) {
      return false;
    }

    const content = fs.readFileSync(sentinelLogPath, "utf8");
    const lines = content
      .split("\n")
      .filter((line) => line.trim())
      .slice(-5);

    // Check if sentinel is actively logging
    const recentLines = lines.filter((line) => {
      const timestamp = line.match(/\[(.*?)\]/)?.[1];
      if (!timestamp) return false;
      const lineTime = new Date(timestamp).getTime();
      return Date.now() - lineTime < 60000; // Within last minute
    });

    return recentLines.length > 0;
  } catch (err) {
    console.error("[executor-unifier] Error checking sentinel health:", err);
    return false;
  }
}

async function checkWatchdogHealth(): Promise<boolean> {
  try {
    if (!fs.existsSync(watchdogLogPath)) {
      return true; // Watchdog might not have restarted anything yet
    }

    const content = fs.readFileSync(watchdogLogPath, "utf8");
    const lines = content
      .split("\n")
      .filter((line) => line.trim())
      .slice(-10);

    // Check for recent watchdog activity or errors
    const recentActivity = lines.filter((line) => {
      const timestamp = line.match(/\[(.*?)\]/)?.[1];
      if (!timestamp) return false;
      const lineTime = new Date(timestamp).getTime();
      return Date.now() - lineTime < 300000; // Within last 5 minutes
    });

    // Check for excessive errors
    const errorLines = recentActivity.filter((line) => line.includes("❌"));
    return errorLines.length < 10; // Not too many recent errors
  } catch (err) {
    console.error("[executor-unifier] Error checking watchdog health:", err);
    return false;
  }
}

async function getDaemonCount(): Promise<number> {
  try {
    const cmd = "ps aux | grep -E \"\.ts|\.js\" | grep -v grep | grep -E \"relayCore|diffMonitor|roleVerifier|summarySyncValidator|bootstrapDaemon|monitorWatcher|executor\" | wc -l";
    const { stdout } = await execAsync(cmd);
    return parseInt(stdout.trim()) || 0;
  } catch (err) {
    console.error("[executor-unifier] Error getting daemon count:", err);
    return 0;
  }
}

async function loadNextPatch(): Promise<any> {
  try {
    const patchDir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
    const files = fs.readdirSync(patchDir).filter((f) => f.endsWith(".json"));

    if (files.length === 0) return Promise.resolve(null);

    // Sort by modification time to get the latest
    const patchFiles = files
      .map((file) => ({
        name: file,
        path: path.join(patchDir, file),
        mtime: fs.statSync(path.join(patchDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (patchFiles.length === 0) return Promise.resolve(null);

    const latestPatch = patchFiles[0];
    const content = fs.readFileSync(latestPatch.path, "utf8");
    return Promise.resolve(JSON.parse(content));
  } catch (err) {
    console.error("[executor-unifier] Error loading patch:", err);
    return Promise.resolve(null);
  }
}

async function processPatch(patch: unknown): Promise<boolean> {
  try {
    console.log(
      `[executor-unifier] Processing patch: ${(patch as any)?.blockId || "unknown"}`,
    );

    // Simulate patch processing with non-blocking execution
    const cmd = `cd /Users/sawyer/gitSync/gpt-cursor-runner && python3 -m gpt_cursor_runner.apply_patch ${(patch as any)?.blockId ? `.cursor-cache/CYOPS/patches/${(patch as any).blockId}.json` : ""}`;

    const { stderr } = await execAsync(cmd);

    const success = !stderr || stderr.length === 0;

    if (success) {
      console.log(
        `[executor-unifier] Patch ${(patch as any)?.blockId} processed successfully`,
      );
    } else {
      console.error(
        `[executor-unifier] Patch ${(patch as any)?.blockId} failed:`,
        stderr,
      );
    }

    return success;
  } catch (err) {
    console.error("[executor-unifier] Error processing patch:", err);
    return false;
  }
}

async function logExecutorStatus(status: ExecutorStatus): Promise<void> {
  const logEntry = `[${status.timestamp}] ${status.phase.toUpperCase()} | Patch: ${status.currentPatch || "none"} | Sentinel: ${status.sentinelHealth ? "🟢" : "🔴"} | Watchdog: ${status.watchdogHealth ? "🟢" : "🔴"} | Daemons: ${status.daemonCount}${status.error ? ` | Error: ${status.error}` : ""}\n`;

  try {
    fs.appendFileSync(executorLogPath, logEntry);
  } catch (err) {
    console.error("[executor-unifier] Failed to write status log:", err);
  }
}

async function coordinateExecutor(): Promise<void> {
  try {
    const timestamp = new Date().toISOString();

    // Check system health
    const sentinelHealth = await checkSentinelHealth();
    const watchdogHealth = await checkWatchdogHealth();
    const daemonCount = await getDaemonCount();

    // Determine if we should process patches
    const shouldProcess =
      !coordinationState.isProcessing &&
      sentinelHealth &&
      watchdogHealth &&
      daemonCount >= 5 && // At least 5 daemons running
      coordinationState.consecutiveErrors < maxConsecutiveErrors;

    if (shouldProcess) {
      coordinationState.isProcessing = true;

      // Load and process next patch
      const patch = await loadNextPatch();

      if (patch) {
        const success = await processPatch(patch);

        if (success) {
          coordinationState.consecutiveErrors = 0;
          coordinationState.lastExecutorRun = Date.now();
        } else {
          coordinationState.consecutiveErrors++;
        }

        await logExecutorStatus({
          timestamp,
          phase: success ? "processing" : "error",
          currentPatch: patch.blockId,
          sentinelHealth,
          watchdogHealth,
          daemonCount,
          error: success ? undefined : "Patch processing failed",
        });
      } else {
        await logExecutorStatus({
          timestamp,
          phase: "idle",
          sentinelHealth,
          watchdogHealth,
          daemonCount,
        });
      }

      coordinationState.isProcessing = false;
    } else {
      await logExecutorStatus({
        timestamp,
        phase: "coordinating",
        sentinelHealth,
        watchdogHealth,
        daemonCount,
        error: !sentinelHealth
          ? "Sentinel unhealthy"
          : !watchdogHealth
            ? "Watchdog unhealthy"
            : daemonCount < 5
              ? "Insufficient daemons"
              : coordinationState.consecutiveErrors >= maxConsecutiveErrors
                ? "Too many consecutive errors"
                : "System coordinating",
      });
    }

    // Update coordination state
    coordinationState.lastSentinelCheck = Date.now();
    coordinationState.lastWatchdogCheck = Date.now();
  } catch (err) {
    const timestamp = new Date().toISOString();
    console.error("[executor-unifier] Error in coordination loop:", err);

    await logExecutorStatus({
      timestamp,
      phase: "error",
      sentinelHealth: false,
      watchdogHealth: false,
      daemonCount: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    });

    coordinationState.consecutiveErrors++;
  }
}

export async function startGhostExecutorUnifier(): Promise<void> {
  console.log("[executor-unifier] Starting self-coordinating executor...");

  // Initial coordination check
  await coordinateExecutor();

  // Set up coordination loop
  setInterval(async () => {
    await coordinateExecutor();
  }, coordinationInterval);
}

export function getCoordinationState(): CoordinationState {
  return { ...coordinationState };
}

export async function getExecutorStatus(): Promise<ExecutorStatus> {
  const timestamp = new Date().toISOString();
  const sentinelHealth = await checkSentinelHealth();
  const watchdogHealth = await checkWatchdogHealth();
  const daemonCount = await getDaemonCount();

  return {
    timestamp,
    phase: coordinationState.isProcessing ? "processing" : "coordinating",
    sentinelHealth,
    watchdogHealth,
    daemonCount,
  };
}
