// GHOST Snapshot Daemon — Phase 8B P8.06.00
// Runtime state capture and system telemetry snapshot system

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import * as crypto from "crypto";

const execAsync = promisify(exec);
const snapshotLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/snapshot-daemon.log";
const snapshotDir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/snapshots";
const configPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/snapshot-config.json";
const logDir = path.dirname(snapshotLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(snapshotDir)) {
  fs.mkdirSync(snapshotDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface SnapshotEvent {
  id: string;
  timestamp: string;
  eventType:
    | "snapshot_start"
    | "snapshot_complete"
    | "snapshot_error"
    | "backup_start"
    | "backup_complete"
    | "cleanup"
    | "system_event"
    | "system_startup"
    | "config_error"
    | "state_error"
    | "dashboard_integration"
    | "dashboard_error"
    | "capture_error"
    | "system_error"
    | "system_shutdown"
    | "config_update"
    | "system_maintenance"
    | "system_info_error"
    | "telemetry_error"
    | "patch_info_error"
    | "metrics_error"
    | "anomaly_error"
    | "cleanup_error";
  component: string;
  data: any;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
}

interface SystemSnapshot {
  id: string;
  timestamp: string;
  version: string;
  systemInfo: {
    hostname: string;
    platform: string;
    arch: string;
    nodeVersion: string;
    uptime: number;
    loadAverage: number[];
  };
  daemonStatus: {
    name: string;
    status: "running" | "failed" | "restarted" | "paused" | "unknown";
    pid?: number;
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
    lastCheck: string;
  }[];
  telemetryData: {
    dashboardState: any;
    relayTelemetry: any;
    heartbeatStatus: any;
    loopAuditor: any;
  };
  patchInfo: {
    lastPatch: string;
    patchQueue: any;
    patchHistory: any[];
  };
  systemMetrics: {
    cpu: {
      usage: number;
      load: number;
      cores: number;
    };
    memory: {
      total: number;
      used: number;
      available: number;
      usage: number;
    };
    disk: {
      total: number;
      used: number;
      available: number;
      usage: number;
    };
    network: {
      bytesIn: number;
      bytesOut: number;
      connections: number;
    };
  };
  anomalies: {
    id: string;
    timestamp: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    resolved: boolean;
  }[];
  size: number;
  checksum: string;
}

interface SnapshotConfig {
  enabled: boolean;
  capture: {
    enabled: boolean;
    intervalMs: number;
    maxSnapshots: number;
    retentionDays: number;
    includeTelemetry: boolean;
    includeLogs: boolean;
    includeConfigs: boolean;
  };
  backup: {
    enabled: boolean;
    backupInterval: number;
    maxBackups: number;
    compression: boolean;
    encryption: boolean;
  };
  cleanup: {
    enabled: boolean;
    cleanupInterval: number;
    maxAge: number;
    preserveImportant: boolean;
  };
  integration: {
    dashboard: {
      enabled: boolean;
      sendSnapshots: boolean;
      sendMetrics: boolean;
    };
    telemetry: {
      enabled: boolean;
      sendEvents: boolean;
      sendMetrics: boolean;
    };
  };
  security: {
    enabled: boolean;
    validateSnapshots: boolean;
    auditLogging: boolean;
    sanitizeData: boolean;
  };
}

interface SnapshotState {
  timestamp: string;
  events: SnapshotEvent[];
  snapshots: SystemSnapshot[];
  lastSnapshot: string;
  totalSnapshots: number;
  totalSize: number;
  lastUpdate: string;
  version: string;
}

class GhostSnapshotDaemon {
  private config!: SnapshotConfig;
  private state!: SnapshotState;
  private isRunning = false;
  private captureInterval = 300000; // 5 minutes
  private maxEventHistory = 1000;
  private eventCounter = 0;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.loadConfig();
    this.initializeState();
    this.logEvent("system_startup", "System started", "info");
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, "utf8");
        this.config = JSON.parse(configData);
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      this.logEvent("config_error", `Failed to load config: ${error}`, "error");
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): SnapshotConfig {
    return {
      enabled: true,
      capture: {
        enabled: true,
        intervalMs: 300000, // 5 minutes
        maxSnapshots: 100,
        retentionDays: 7,
        includeTelemetry: true,
        includeLogs: false,
        includeConfigs: true,
      },
      backup: {
        enabled: true,
        backupInterval: 86400000, // 24 hours
        maxBackups: 10,
        compression: true,
        encryption: false,
      },
      cleanup: {
        enabled: true,
        cleanupInterval: 3600000, // 1 hour
        maxAge: 604800000, // 7 days
        preserveImportant: true,
      },
      integration: {
        dashboard: {
          enabled: true,
          sendSnapshots: true,
          sendMetrics: true,
        },
        telemetry: {
          enabled: true,
          sendEvents: true,
          sendMetrics: true,
        },
      },
      security: {
        enabled: true,
        validateSnapshots: true,
        auditLogging: true,
        sanitizeData: true,
      },
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.logEvent("system_error", `Failed to save config: ${error}`, "error");
    }
  }

  private initializeState(): void {
    try {
      const statePath = path.join(snapshotDir, "snapshot-state.json");
      if (fs.existsSync(statePath)) {
        const stateData = fs.readFileSync(statePath, "utf8");
        this.state = JSON.parse(stateData);
      } else {
        this.state = this.getInitialState();
      }
    } catch (error) {
      this.logEvent("state_error", `Failed to load state: ${error}`, "error");
      this.state = this.getInitialState();
    }
  }

  private getInitialState(): SnapshotState {
    return {
      timestamp: new Date().toISOString(),
      events: [],
      snapshots: [],
      lastSnapshot: new Date().toISOString(),
      totalSnapshots: 0,
      totalSize: 0,
      lastUpdate: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  private logEvent(
    eventType: SnapshotEvent["eventType"],
    message: string,
    severity: SnapshotEvent["severity"],
    data: any = {},
  ): void {
    if (!this.config.enabled) return;

    const event: SnapshotEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      component: "snapshot-daemon",
      data,
      severity,
      message,
    };

    this.state.events.push(event);

    if (this.state.events.length > this.maxEventHistory) {
      this.state.events = this.state.events.slice(-this.maxEventHistory);
    }

    const logEntry = {
      timestamp: event.timestamp,
      eventType: event.eventType,
      severity: event.severity,
      message,
      data: this.config.security.sanitizeData ? this.sanitizeData(data) : data,
    };

    fs.appendFileSync(snapshotLogPath, JSON.stringify(logEntry) + "\n");
  }

  private sanitizeData(data: any): any {
    if (typeof data === "string") {
      return data
        .replace(
          /api[_-]?key["\s]*[:=]["\s]*[^"\s,}]+/gi,
          "api_key: [REDACTED]",
        )
        .replace(/token["\s]*[:=]["\s]*[^"\s,}]+/gi, "token: [REDACTED]")
        .replace(/password["\s]*[:=]["\s]*[^"\s,}]+/gi, "password: [REDACTED]");
    }
    if (typeof data === "object" && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (
          this.config.security.sanitizeData &&
          ["apiKey", "token", "password", "secret"].includes(key.toLowerCase())
        ) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    return data;
  }

  private async captureSystemInfo(): Promise<SystemSnapshot["systemInfo"]> {
    try {
      const { stdout: hostname } = await execAsync("hostname");
      const { stdout: platform } = await execAsync("uname -s");
      const { stdout: arch } = await execAsync("uname -m");
      const { stdout: nodeVersion } = await execAsync("node --version");
      const { stdout: uptime } = await execAsync("uptime");
      const { stdout: loadAvg } = await execAsync("sysctl -n vm.loadavg");

      const uptimeMatch = uptime.match(/up\s+(.+?),/);
      const systemUptime = uptimeMatch ? this.parseUptime(uptimeMatch[1]) : 0;

      const loadParts = loadAvg.trim().split(" ");
      const loadAverage = loadParts
        .slice(0, 3)
        .map((load) => parseFloat(load) || 0);

      return {
        hostname: hostname.trim(),
        platform: platform.trim(),
        arch: arch.trim(),
        nodeVersion: nodeVersion.trim(),
        uptime: systemUptime,
        loadAverage,
      };
    } catch (error) {
      this.logEvent(
        "system_info_error",
        `Failed to capture system info: ${error}`,
        "error",
      );
      return {
        hostname: "unknown",
        platform: "unknown",
        arch: "unknown",
        nodeVersion: "unknown",
        uptime: 0,
        loadAverage: [0, 0, 0],
      };
    }
  }

  private async captureDaemonStatus(): Promise<SystemSnapshot["daemonStatus"]> {
    const daemons = [
      "relayCore",
      "watchdog",
      "executor",
      "healer",
      "validationEngine",
      "messageQueue",
      "healthAggregator",
      "decisionEngine",
    ];

    const statusPromises = daemons.map((daemon) =>
      this.checkDaemonStatus(daemon),
    );
    return Promise.all(statusPromises);
  }

  private async checkDaemonStatus(
    daemonName: string,
  ): Promise<SystemSnapshot["daemonStatus"][0]> {
    try {
      const { stdout } = await execAsync(`pgrep -f "${daemonName}"`);
      const pids = stdout
        .trim()
        .split("\n")
        .filter((pid) => pid.length > 0);

      if (pids.length === 0) {
        return {
          name: daemonName,
          status: "failed",
          uptime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          lastCheck: new Date().toISOString(),
        };
      }

      const pid = parseInt(pids[0]);

      const { stdout: psOutput } = await execAsync(
        `ps -p ${pid} -o pid,ppid,etime,pcpu,pmem,comm`,
      );
      const lines = psOutput.trim().split("\n");

      if (lines.length < 2) {
        return {
          name: daemonName,
          status: "unknown",
          pid,
          uptime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          lastCheck: new Date().toISOString(),
        };
      }

      const stats = lines[1].trim().split(/\s+/);
      const cpuUsage = parseFloat(stats[3]) || 0;
      const memoryUsage = parseFloat(stats[4]) || 0;

      const etime = stats[2];
      const uptime = this.parseEtime(etime);

      return {
        name: daemonName,
        status: "running",
        pid,
        uptime,
        memoryUsage,
        cpuUsage,
        lastCheck: new Date().toISOString(),
      };
    } catch (_error) {
      return {
        name: daemonName,
        status: "failed",
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        lastCheck: new Date().toISOString(),
      };
    }
  }

  private async captureTelemetryData(): Promise<
    SystemSnapshot["telemetryData"]
  > {
    try {
      const telemetryData = {
        dashboardState: null,
        relayTelemetry: null,
        heartbeatStatus: null,
        loopAuditor: null,
      };

      // Try to load telemetry data from files
      const dashboardStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/dashboard-state.json";
      const relayTelemetryPath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/relay-telemetry-state.json";
      const heartbeatStatePath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/heartbeat-state.json";
      const loopAuditorPath =
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/loop-auditor-state.json";

      if (fs.existsSync(dashboardStatePath)) {
        telemetryData.dashboardState = JSON.parse(
          fs.readFileSync(dashboardStatePath, "utf8"),
        );
      }

      if (fs.existsSync(relayTelemetryPath)) {
        telemetryData.relayTelemetry = JSON.parse(
          fs.readFileSync(relayTelemetryPath, "utf8"),
        );
      }

      if (fs.existsSync(heartbeatStatePath)) {
        telemetryData.heartbeatStatus = JSON.parse(
          fs.readFileSync(heartbeatStatePath, "utf8"),
        );
      }

      if (fs.existsSync(loopAuditorPath)) {
        telemetryData.loopAuditor = JSON.parse(
          fs.readFileSync(loopAuditorPath, "utf8"),
        );
      }

      return telemetryData;
    } catch (error) {
      this.logEvent(
        "telemetry_error",
        `Failed to capture telemetry data: ${error}`,
        "error",
      );
      return {
        dashboardState: null,
        relayTelemetry: null,
        heartbeatStatus: null,
        loopAuditor: null,
      };
    }
  }

  private async capturePatchInfo(): Promise<SystemSnapshot["patchInfo"]> {
    try {
      const patchesDir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
      const completedDir = path.join(patchesDir, ".completed");

      let lastPatch = "none";
      let patchHistory: any[] = [];

      if (fs.existsSync(completedDir)) {
        const completedPatches = fs
          .readdirSync(completedDir)
          .filter((file) => file.endsWith(".json"))
          .sort()
          .reverse();

        if (completedPatches.length > 0) {
          lastPatch = completedPatches[0];

          // Get last 10 patches for history
          patchHistory = completedPatches.slice(0, 10).map((patch) => {
            try {
              const patchPath = path.join(completedDir, patch);
              const patchData = JSON.parse(fs.readFileSync(patchPath, "utf8"));
              return {
                id: patchData.id,
                version: patchData.version,
                phase: patchData.phase,
                timestamp:
                  patchData.metadata?.created || new Date().toISOString(),
              };
            } catch (error) {
              return { id: patch, error: "Failed to parse patch" };
            }
          });
        }
      }

      const patchQueue = {
        pending: fs.existsSync(path.join(patchesDir, ".pending"))
          ? fs.readdirSync(path.join(patchesDir, ".pending")).length
          : 0,
        executing: fs.existsSync(path.join(patchesDir, ".executing"))
          ? fs.readdirSync(path.join(patchesDir, ".executing")).length
          : 0,
        failed: fs.existsSync(path.join(patchesDir, ".failed"))
          ? fs.readdirSync(path.join(patchesDir, ".failed")).length
          : 0,
      };

      return {
        lastPatch,
        patchQueue,
        patchHistory,
      };
    } catch (error) {
      this.logEvent(
        "patch_info_error",
        `Failed to capture patch info: ${error}`,
        "error",
      );
      return {
        lastPatch: "unknown",
        patchQueue: { pending: 0, executing: 0, failed: 0 },
        patchHistory: [],
      };
    }
  }

  private async captureSystemMetrics(): Promise<
    SystemSnapshot["systemMetrics"]
  > {
    try {
      // CPU metrics
      const { stdout: cpuInfo } = await execAsync(
        'top -l 1 | grep "CPU usage"',
      );
      const cpuUsage = this.parseCpuUsage(cpuInfo);

      const { stdout: loadInfo } = await execAsync("sysctl -n hw.ncpu");
      const cores = parseInt(loadInfo.trim());

      const { stdout: loadAvg } = await execAsync("sysctl -n vm.loadavg");
      const load = this.parseLoadAverage(loadAvg);

      // Memory metrics
      const { stdout: memoryInfo } = await execAsync("vm_stat");
      const memory = this.parseMemoryInfo(memoryInfo);

      // Disk metrics
      const { stdout: diskInfo } = await execAsync(
        "df -h /Users/sawyer/gitSync",
      );
      const disk = this.parseDiskInfo(diskInfo);

      // Network metrics (simplified)
      const network = {
        bytesIn: 0,
        bytesOut: 0,
        connections: 0,
      };

      return {
        cpu: { usage: cpuUsage, load, cores },
        memory,
        disk,
        network,
      };
    } catch (error) {
      this.logEvent(
        "metrics_error",
        `Failed to capture system metrics: ${error}`,
        "error",
      );
      return {
        cpu: { usage: 0, load: 0, cores: 0 },
        memory: { total: 0, used: 0, available: 0, usage: 0 },
        disk: { total: 0, used: 0, available: 0, usage: 0 },
        network: { bytesIn: 0, bytesOut: 0, connections: 0 },
      };
    }
  }

  private async captureAnomalies(): Promise<SystemSnapshot["anomalies"]> {
    try {
      const anomalies: SystemSnapshot["anomalies"] = [];

      // Check for recent errors in logs
      const logFiles = [
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-dashboard.log",
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/relay-telemetry.log",
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/heartbeat-visualizer.log",
      ];

      for (const logFile of logFiles) {
        if (fs.existsSync(logFile)) {
          const logContent = fs.readFileSync(logFile, "utf8");
          const lines = logContent.split("\n").slice(-100); // Last 100 lines

          for (const line of lines) {
            if (
              line.includes('"severity":"error"') ||
              line.includes('"severity":"critical"')
            ) {
              try {
                const logEntry = JSON.parse(line);
                anomalies.push({
                  id: crypto.randomUUID(),
                  timestamp: logEntry.timestamp,
                  type: "log_error",
                  severity: logEntry.severity,
                  description: logEntry.message,
                  resolved: false,
                });
              } catch (_error) {
                // Skip malformed log entries
              }
            }
          }
        }
      }

      return anomalies.slice(0, 50); // Limit to 50 most recent anomalies
    } catch (error) {
      this.logEvent(
        "anomaly_error",
        `Failed to capture anomalies: ${error}`,
        "error",
      );
      return [];
    }
  }

  private parseUptime(uptimeStr: string): number {
    const daysMatch = uptimeStr.match(/(\d+)\s+days?/);
    const hoursMatch = uptimeStr.match(/(\d+)\s+hours?/);
    const minutesMatch = uptimeStr.match(/(\d+)\s+minutes?/);

    const days = daysMatch ? parseInt(daysMatch[1]) : 0;
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;

    return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
  }

  private parseEtime(etime: string): number {
    const parts = etime.split("-");
    let days = 0;
    let time = parts[0];

    if (parts.length > 1) {
      days = parseInt(parts[0]);
      time = parts[1];
    }

    const timeParts = time.split(":");
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    const seconds = parseInt(timeParts[2]) || 0;

    return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60 + seconds;
  }

  private parseCpuUsage(cpuInfo: string): number {
    const match = cpuInfo.match(/CPU usage: (\d+\.\d+)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  private parseLoadAverage(loadAvg: string): number {
    const parts = loadAvg.trim().split(" ");
    return parseFloat(parts[0]) || 0;
  }

  private parseMemoryInfo(memoryInfo: string): {
    total: number;
    used: number;
    available: number;
    usage: number;
  } {
    const lines = memoryInfo.split("\n");
    let total = 0;
    let used = 0;

    for (const line of lines) {
      if (line.includes("Pages free:")) {
        const match = line.match(/Pages free:\s+(\d+)/);
        if (match) {
          used = parseInt(match[1]) * 4096;
        }
      }
    }

    total = 16 * 1024 * 1024 * 1024; // 16GB estimate
    const available = total - used;
    const usage = total > 0 ? (used / total) * 100 : 0;

    return { total, used, available, usage };
  }

  private parseDiskInfo(diskInfo: string): {
    total: number;
    used: number;
    available: number;
    usage: number;
  } {
    const lines = diskInfo.split("\n");
    if (lines.length < 2) {
      return { total: 0, used: 0, available: 0, usage: 0 };
    }

    const parts = lines[1].trim().split(/\s+/);
    if (parts.length < 5) {
      return { total: 0, used: 0, available: 0, usage: 0 };
    }

    const total = this.parseSize(parts[1]);
    const used = this.parseSize(parts[2]);
    const available = this.parseSize(parts[3]);
    const usage = total > 0 ? (used / total) * 100 : 0;

    return { total, used, available, usage };
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(\.\d+)?)([KMGT])?/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[3];

    switch (unit) {
      case "K":
        return value * 1024;
      case "M":
        return value * 1024 * 1024;
      case "G":
        return value * 1024 * 1024 * 1024;
      case "T":
        return value * 1024 * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  private async createSnapshot(): Promise<SystemSnapshot> {
    this.logEvent("snapshot_start", "Creating system snapshot", "info");

    try {
      const snapshot: SystemSnapshot = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        systemInfo: await this.captureSystemInfo(),
        daemonStatus: await this.captureDaemonStatus(),
        telemetryData: await this.captureTelemetryData(),
        patchInfo: await this.capturePatchInfo(),
        systemMetrics: await this.captureSystemMetrics(),
        anomalies: await this.captureAnomalies(),
        size: 0,
        checksum: "",
      };

      // Calculate size and checksum
      const snapshotJson = JSON.stringify(snapshot, null, 2);
      snapshot.size = Buffer.byteLength(snapshotJson, "utf8");
      snapshot.checksum = crypto
        .createHash("sha256")
        .update(snapshotJson)
        .digest("hex");

      this.logEvent(
        "snapshot_complete",
        "System snapshot created successfully",
        "info",
      );

      return snapshot;
    } catch (error) {
      this.logEvent(
        "snapshot_error",
        `Failed to create snapshot: ${error}`,
        "error",
      );
      throw error;
    }
  }

  private async saveSnapshot(snapshot: SystemSnapshot): Promise<void> {
    try {
      const snapshotPath = path.join(
        snapshotDir,
        `snapshot-${snapshot.id}.json`,
      );
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

      // Update state
      this.state.snapshots.push(snapshot);
      this.state.lastSnapshot = snapshot.timestamp;
      this.state.totalSnapshots++;
      this.state.totalSize += snapshot.size;

      // Maintain snapshot limit
      if (this.state.snapshots.length > this.config.capture.maxSnapshots) {
        const removedSnapshot = this.state.snapshots.shift();
        if (removedSnapshot) {
          this.state.totalSize -= removedSnapshot.size;
          const removedPath = path.join(
            snapshotDir,
            `snapshot-${removedSnapshot.id}.json`,
          );
          if (fs.existsSync(removedPath)) {
            fs.unlinkSync(removedPath);
          }
        }
      }

      this.logEvent("snapshot_complete", "Snapshot saved successfully", "info");
    } catch (error) {
      this.logEvent(
        "snapshot_error",
        `Failed to save snapshot: ${error}`,
        "error",
      );
      throw error;
    }
  }

  private async cleanupOldSnapshots(): Promise<void> {
    try {
      const cutoffTime = Date.now() - this.config.cleanup.maxAge;
      const files = fs.readdirSync(snapshotDir);

      for (const file of files) {
        if (file.startsWith("snapshot-") && file.endsWith(".json")) {
          const filePath = path.join(snapshotDir, file);
          const stats = fs.statSync(filePath);

          if (stats.mtime.getTime() < cutoffTime) {
            fs.unlinkSync(filePath);
            this.logEvent("cleanup", `Removed old snapshot: ${file}`, "info");
          }
        }
      }
    } catch (error) {
      this.logEvent(
        "cleanup_error",
        `Failed to cleanup old snapshots: ${error}`,
        "error",
      );
    }
  }

  private async saveState(): Promise<void> {
    try {
      this.state.timestamp = new Date().toISOString();
      this.state.lastUpdate = new Date().toISOString();
      const statePath = path.join(snapshotDir, "snapshot-state.json");
      fs.writeFileSync(statePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logEvent("state_error", `Failed to save state: ${error}`, "error");
    }
  }

  private async sendToDashboard(): Promise<void> {
    try {
      if (this.config.integration.dashboard.enabled) {
        this.logEvent("system_error", "Component error detected", "error");
      }
    } catch (error) {
      this.logEvent(
        "dashboard_error",
        `Failed to send to dashboard: ${error}`,
        "error",
      );
    }
  }

  private async captureLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        if (this.config.capture.enabled) {
          const snapshot = await this.createSnapshot();
          await this.saveSnapshot(snapshot);
        }

        if (this.config.cleanup.enabled) {
          await this.cleanupOldSnapshots();
        }

        await this.saveState();
        await this.sendToDashboard();

        await new Promise((resolve) =>
          setTimeout(resolve, this.config.capture.intervalMs),
        );
      } catch (error) {
        this.logEvent("capture_error", `Capture loop error: ${error}`, "error");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logEvent("system_startup", "System started", "info");

    this.captureLoop().catch((error) => {
      this.logEvent(
        "system_error",
        `Capture loop failed: ${error}`,
        "critical",
      );
    });
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.logEvent("system_shutdown", "Snapshot daemon stopped", "info");
    await this.saveState();
  }

  public getState(): SnapshotState {
    return { ...this.state };
  }

  public getConfig(): SnapshotConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<SnapshotConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.logEvent("config_update", "Configuration updated", "info");
  }

  public getSnapshots(limit: number = 10): SystemSnapshot[] {
    return this.state.snapshots.slice(-limit);
  }

  public getRecentEvents(limit: number = 100): SnapshotEvent[] {
    return this.state.events.slice(-limit);
  }

  public async createManualSnapshot(): Promise<SystemSnapshot> {
    const snapshot = await this.createSnapshot();
    await this.saveSnapshot(snapshot);
    return snapshot;
  }

  public isHealthy(): boolean {
    return (
      this.state.totalSnapshots > 0 &&
      this.state.lastSnapshot !== new Date(0).toISOString()
    );
  }

  public clearHistory(): void {
    this.state.events = [];
    this.logEvent("system_error", "Component error detected", "error");
  }
}

let snapshotDaemonInstance: GhostSnapshotDaemon | null = null;

export async function startGhostSnapshotDaemon(): Promise<void> {
  if (!snapshotDaemonInstance) {
    snapshotDaemonInstance = new GhostSnapshotDaemon();
  }
  await snapshotDaemonInstance.start();
}

export async function stopGhostSnapshotDaemon(): Promise<void> {
  if (snapshotDaemonInstance) {
    await snapshotDaemonInstance.stop();
  }
}

export function getGhostSnapshotDaemon(): GhostSnapshotDaemon {
  if (!snapshotDaemonInstance) {
    snapshotDaemonInstance = new GhostSnapshotDaemon();
  }
  return snapshotDaemonInstance;
}

export type { SnapshotEvent, SystemSnapshot, SnapshotConfig, SnapshotState };
