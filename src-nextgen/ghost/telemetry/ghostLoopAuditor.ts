// GHOST Loop Auditor — Phase 8B P8.04.00
// Comprehensive loop auditing and anomaly detection system

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import * as crypto from "crypto";

const execAsync = promisify(exec);
const auditorLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/loop-auditor.log";
const auditorStatePath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/loop-auditor-state.json";
const configPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/loop-auditor-config.json";
const logDir = path.dirname(auditorLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(auditorStatePath))) {
  fs.mkdirSync(path.dirname(auditorStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface LoopEvent {
  id: string;
  timestamp: string;
  eventType:
    | "loop_start"
    | "loop_complete"
    | "loop_error"
    | "validation_start"
    | "validation_complete"
    | "relay_start"
    | "relay_complete"
    | "anomaly_detected"
    | "system_startup"
    | "config_error"
    | "state_error"
    | "dashboard_integration"
    | "dashboard_error"
    | "monitoring_error"
    | "system_error"
    | "system_shutdown"
    | "config_update"
    | "system_maintenance";
  component: string;
  loopId: string;
  correlationId?: string;
  data: unknown;
  severity: "info" | "warning" | "error" | "critical";
  processingTime?: number;
  error?: string;
}

interface LoopCycle {
  id: string;
  loopId: string;
  correlationId?: string;
  timestamp: string;
  startTime: string;
  endTime?: string;
  processingTime?: number;
  status: "running" | "completed" | "failed" | "timeout" | "anomaly";
  stages: {
    stage: string;
    component: string;
    startTime: string;
    endTime?: string;
    duration?: number;
    status: "pending" | "running" | "completed" | "failed";
    error?: string;
    data?: unknown;
  }[];
  daemonStatus: {
    name: string;
    status: "running" | "failed" | "restarted" | "paused";
    uptime: number;
    memoryUsage: number;
    cpuUsage: number;
  }[];
  validationResults: {
    passed: boolean;
    errors: string[];
    warnings: string[];
    processingTime: number;
  };
  relayResults: {
    success: boolean;
    responseTime: number;
    error?: string;
    sanitized: boolean;
  };
  anomalies: string[];
}

interface LoopAuditorConfig {
  enabled: boolean;
  monitoring: {
    enabled: boolean;
    intervalMs: number;
    maxRetries: number;
    timeoutMs: number;
  };
  auditing: {
    enabled: boolean;
    traceAllLoops: boolean;
    maxLoopHistory: number;
    includeData: boolean;
  };
  anomalyDetection: {
    enabled: boolean;
    thresholds: {
      maxLoopTime: number;
      maxValidationTime: number;
      maxRelayTime: number;
      maxErrorRate: number;
      maxMemoryUsage: number;
      maxCpuUsage: number;
    };
    patterns: {
      consecutiveFailures: number;
      timeoutPattern: number;
      memoryLeak: number;
      cpuSpike: number;
    };
  };
  integration: {
    dashboard: {
      enabled: boolean;
      updateInterval: number;
      sendMetrics: boolean;
      sendAnomalies: boolean;
    };
    telemetry: {
      enabled: boolean;
      sendLoopData: boolean;
      sendAnomalies: boolean;
    };
  };
  security: {
    enabled: boolean;
    auditLogging: boolean;
    sanitizeData: boolean;
    validateInputs: boolean;
  };
}

interface LoopAuditorState {
  timestamp: string;
  events: LoopEvent[];
  loopCycles: LoopCycle[];
  anomalies: {
    id: string;
    timestamp: string;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    description: string;
    data: unknown;
    resolved: boolean;
  }[];
  metrics: {
    totalLoops: number;
    successfulLoops: number;
    failedLoops: number;
    averageLoopTime: number;
    averageValidationTime: number;
    averageRelayTime: number;
    anomalyCount: number;
    lastUpdate: string;
  };
  lastUpdate: string;
  version: string;
}

class GhostLoopAuditor {
  private config!: LoopAuditorConfig;
  private state!: LoopAuditorState;
  private isRunning = false;
  private monitoringInterval = 10000; // 10 seconds
  private maxEventHistory = 2000;
  private maxLoopHistory = 1000;
  private maxAnomalyHistory = 500;
  private eventCounter = 0;
  private activeLoops: Map<string, LoopCycle> = new Map();

  constructor() {
    this.loadConfig();
    this.initializeState();
    this.logEvent("system_startup", "Loop auditor started", "info");
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

  private getDefaultConfig(): LoopAuditorConfig {
    return {
      enabled: true,
      monitoring: {
        enabled: true,
        intervalMs: 10000,
        maxRetries: 3,
        timeoutMs: 30000,
      },
      auditing: {
        enabled: true,
        traceAllLoops: true,
        maxLoopHistory: 1000,
        includeData: true,
      },
      anomalyDetection: {
        enabled: true,
        thresholds: {
          maxLoopTime: 60000,
          maxValidationTime: 10000,
          maxRelayTime: 30000,
          maxErrorRate: 0.1,
          maxMemoryUsage: 85,
          maxCpuUsage: 90,
        },
        patterns: {
          consecutiveFailures: 3,
          timeoutPattern: 5,
          memoryLeak: 10,
          cpuSpike: 5,
        },
      },
      integration: {
        dashboard: {
          enabled: true,
          updateInterval: 10000,
          sendMetrics: true,
          sendAnomalies: true,
        },
        telemetry: {
          enabled: true,
          sendLoopData: true,
          sendAnomalies: true,
        },
      },
      security: {
        enabled: true,
        auditLogging: true,
        sanitizeData: true,
        validateInputs: true,
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
      if (fs.existsSync(auditorStatePath)) {
        const stateData = fs.readFileSync(auditorStatePath, "utf8");
        this.state = JSON.parse(stateData);
      } else {
        this.state = this.getInitialState();
      }
    } catch (error) {
      this.logEvent("state_error", `Failed to load state: ${error}`, "error");
      this.state = this.getInitialState();
    }
  }

  private getInitialState(): LoopAuditorState {
    return {
      timestamp: new Date().toISOString(),
      events: [],
      loopCycles: [],
      anomalies: [],
      metrics: {
        totalLoops: 0,
        successfulLoops: 0,
        failedLoops: 0,
        averageLoopTime: 0,
        averageValidationTime: 0,
        averageRelayTime: 0,
        anomalyCount: 0,
        lastUpdate: new Date().toISOString(),
      },
      lastUpdate: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  private logEvent(
    eventType: LoopEvent["eventType"],
    message: string,
    severity: LoopEvent["severity"],
    data: unknown = {},
    loopId?: string,
    correlationId?: string,
  ): void {
    if (!this.config.enabled) return;

    const event: LoopEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      component: "loop-auditor",
      loopId: loopId || "system",
      correlationId,
      data,
      severity,
      processingTime: data.processingTime,
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

    fs.appendFileSync(auditorLogPath, JSON.stringify(logEntry) + "\n");
  }

  private sanitizeData(data: unknown): unknown {
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
      const sanitized: unknown = {};
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

  public startLoopCycle(loopId: string, correlationId?: string): void {
    if (!this.config.auditing.enabled) return;

    const cycle: LoopCycle = {
      id: crypto.randomUUID(),
      loopId,
      correlationId,
      timestamp: new Date().toISOString(),
      startTime: new Date().toISOString(),
      status: "running",
      stages: [
        {
          stage: "loop_started",
          component: "loop-auditor",
          startTime: new Date().toISOString(),
          status: "running",
        },
      ],
      daemonStatus: [],
      validationResults: {
        passed: false,
        errors: [],
        warnings: [],
        processingTime: 0,
      },
      relayResults: {
        success: false,
        responseTime: 0,
        sanitized: false,
      },
      anomalies: [],
    };

    this.activeLoops.set(loopId, cycle);
    this.state.loopCycles.push(cycle);

    if (this.state.loopCycles.length > this.maxLoopHistory) {
      this.state.loopCycles = this.state.loopCycles.slice(-this.maxLoopHistory);
    }

    this.logEvent(
      "loop_start",
      `Loop cycle started: ${loopId}`,
      "info",
      {
        loopId,
        correlationId,
      },
      loopId,
      correlationId,
    );
  }

  public addLoopStage(
    loopId: string,
    stage: string,
    component: string,
    data?: unknown,
  ): void {
    if (!this.config.auditing.enabled) return;

    const cycle = this.activeLoops.get(loopId);
    if (cycle) {
      const lastStage = cycle.stages[cycle.stages.length - 1];
      if (lastStage && !lastStage.endTime) {
        lastStage.endTime = new Date().toISOString();
        lastStage.duration =
          new Date(lastStage.endTime).getTime() -
          new Date(lastStage.startTime).getTime();
        lastStage.status = "completed";
      }

      cycle.stages.push({
        stage,
        component,
        startTime: new Date().toISOString(),
        status: "running",
        data,
      });

      this.logEvent(
        "loop_complete",
        `Stage completed: ${stage}`,
        "info",
        data,
        loopId,
      );
    }
  }

  public updateDaemonStatus(
    loopId: string,
    daemonStatus: LoopCycle["daemonStatus"],
  ): void {
    if (!this.config.auditing.enabled) return;

    const cycle = this.activeLoops.get(loopId);
    if (cycle) {
      cycle.daemonStatus = daemonStatus;
      this.logEvent("loop_complete", "Daemon status updated", "info");
    }
  }

  public updateValidationResults(
    loopId: string,
    validationResults: LoopCycle["validationResults"],
  ): void {
    if (!this.config.auditing.enabled) return;

    const cycle = this.activeLoops.get(loopId);
    if (cycle) {
      cycle.validationResults = validationResults;
      this.logEvent("validation_complete", "Validation completed", "info");
    }
  }

  public updateRelayResults(
    loopId: string,
    relayResults: LoopCycle["relayResults"],
  ): void {
    if (!this.config.auditing.enabled) return;

    const cycle = this.activeLoops.get(loopId);
    if (cycle) {
      cycle.relayResults = relayResults;
      this.logEvent("relay_complete", "Relay completed", "info");
    }
  }

  public completeLoopCycle(
    loopId: string,
    success: boolean,
    error?: string,
  ): void {
    if (!this.config.auditing.enabled) return;

    const cycle = this.activeLoops.get(loopId);
    if (cycle) {
      cycle.endTime = new Date().toISOString();
      cycle.processingTime =
        new Date(cycle.endTime).getTime() - new Date(cycle.startTime).getTime();
      cycle.status = success ? "completed" : "failed";

      const lastStage = cycle.stages[cycle.stages.length - 1];
      if (lastStage && !lastStage.endTime) {
        lastStage.endTime = new Date().toISOString();
        lastStage.duration = cycle.processingTime;
        lastStage.status = success ? "completed" : "failed";
        if (error) lastStage.error = error;
      }

      // Update metrics
      this.updateMetrics(cycle, success);

      // Detect anomalies
      this.detectAnomalies(cycle);

      this.activeLoops.delete(loopId);

      this.logEvent(
        "loop_complete",
        `Loop cycle completed: ${loopId}`,
        success ? "info" : "error",
        {
          success,
          processingTime: cycle.processingTime,
          error,
        },
        loopId,
      );
    }
  }

  private updateMetrics(cycle: LoopCycle, success: boolean): void {
    this.state.metrics.totalLoops++;

    if (success) {
      this.state.metrics.successfulLoops++;
    } else {
      this.state.metrics.failedLoops++;
    }

    // Calculate averages (simplified)
    const allLoops = this.state.loopCycles.filter((l) => l.processingTime);
    if (allLoops.length > 0) {
      this.state.metrics.averageLoopTime =
        allLoops.reduce((sum, loop) => sum + (loop.processingTime || 0), 0) /
        allLoops.length;
    }

    const validationLoops = this.state.loopCycles.filter(
      (l) => l.validationResults.processingTime > 0,
    );
    if (validationLoops.length > 0) {
      this.state.metrics.averageValidationTime =
        validationLoops.reduce(
          (sum, loop) => sum + loop.validationResults.processingTime,
          0,
        ) / validationLoops.length;
    }

    const relayLoops = this.state.loopCycles.filter(
      (l) => l.relayResults.responseTime > 0,
    );
    if (relayLoops.length > 0) {
      this.state.metrics.averageRelayTime =
        relayLoops.reduce(
          (sum, loop) => sum + loop.relayResults.responseTime,
          0,
        ) / relayLoops.length;
    }

    this.state.metrics.lastUpdate = new Date().toISOString();
  }

  private detectAnomalies(cycle: LoopCycle): void {
    if (!this.config.anomalyDetection.enabled) return;

    const anomalies: string[] = [];

    // Check loop time
    if (
      cycle.processingTime &&
      cycle.processingTime > this.config.anomalyDetection.thresholds.maxLoopTime
    ) {
      anomalies.push(`Loop time exceeded threshold: ${cycle.processingTime}ms`);
    }

    // Check validation time
    if (
      cycle.validationResults.processingTime >
      this.config.anomalyDetection.thresholds.maxValidationTime
    ) {
      anomalies.push(
        `Validation time exceeded threshold: ${cycle.validationResults.processingTime}ms`,
      );
    }

    // Check relay time
    if (
      cycle.relayResults.responseTime >
      this.config.anomalyDetection.thresholds.maxRelayTime
    ) {
      anomalies.push(
        `Relay time exceeded threshold: ${cycle.relayResults.responseTime}ms`,
      );
    }

    // Check validation errors
    if (cycle.validationResults.errors.length > 0) {
      anomalies.push(
        `Validation errors: ${cycle.validationResults.errors.length} errors`,
      );
    }

    // Check daemon failures
    const failedDaemons = cycle.daemonStatus.filter(
      (d) => d.status === "failed",
    );
    if (failedDaemons.length > 0) {
      anomalies.push(`Daemon failures: ${failedDaemons.length} failed`);
    }

    // Check memory usage
    const highMemoryDaemons = cycle.daemonStatus.filter(
      (d) =>
        d.memoryUsage > this.config.anomalyDetection.thresholds.maxMemoryUsage,
    );
    if (highMemoryDaemons.length > 0) {
      anomalies.push(`High memory usage: ${highMemoryDaemons.length} daemons`);
    }

    // Check CPU usage
    const highCpuDaemons = cycle.daemonStatus.filter(
      (d) => d.cpuUsage > this.config.anomalyDetection.thresholds.maxCpuUsage,
    );
    if (highCpuDaemons.length > 0) {
      anomalies.push(`High CPU usage: ${highCpuDaemons.length} daemons`);
    }

    if (anomalies.length > 0) {
      cycle.anomalies = anomalies;
      cycle.status = "anomaly";

      // Add to global anomalies
      const anomaly = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: "loop_anomaly",
        severity: "medium" as const,
        description: `Loop ${cycle.loopId} detected ${anomalies.length} anomalies`,
        data: {
          loopId: cycle.loopId,
          anomalies,
          processingTime: cycle.processingTime,
        },
        resolved: false,
      };

      this.state.anomalies.push(anomaly);
      this.state.metrics.anomalyCount++;

      if (this.state.anomalies.length > this.maxAnomalyHistory) {
        this.state.anomalies = this.state.anomalies.slice(
          -this.maxAnomalyHistory,
        );
      }

      this.logEvent(
        "anomaly_detected",
        `Anomalies detected in loop: ${cycle.loopId}`,
        "warning",
        {
          anomalies,
          loopId: cycle.loopId,
        },
        cycle.loopId,
      );
    }
  }

  private async saveState(): Promise<void> {
    try {
      this.state.timestamp = new Date().toISOString();
      this.state.lastUpdate = new Date().toISOString();
      fs.writeFileSync(auditorStatePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logEvent("state_error", `Failed to save state: ${error}`, "error");
    }
  }

  private async sendToDashboard(): Promise<void> {
    try {
      if (this.config.integration.dashboard.enabled) {
        this.logEvent("loop_error", "Component error detected", "error");
      }
    } catch (error) {
      this.logEvent(
        "dashboard_error",
        `Failed to send to dashboard: ${error}`,
        "error",
      );
    }
  }

  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check for stuck loops
        const now = Date.now();
        this.activeLoops.forEach((cycle, loopId) => {
          const loopStart = new Date(cycle.startTime).getTime();
          if (
            now - loopStart >
            this.config.anomalyDetection.thresholds.maxLoopTime
          ) {
            this.logEvent(
              "loop_error",
              `Loop timeout detected: ${loopId}`,
              "error",
              {
                loopId,
                duration: now - loopStart,
              },
              loopId,
            );
          }
        });

        // Save state
        await this.saveState();

        // Send to dashboard
        await this.sendToDashboard();

        await new Promise((resolve) =>
          setTimeout(resolve, this.config.monitoring.intervalMs),
        );
      } catch (error) {
        this.logEvent(
          "monitoring_error",
          `Monitoring loop error: ${error}`,
          "error",
        );
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logEvent("system_startup", "Loop auditor started", "info");

    this.monitoringLoop().catch((error) => {
      this.logEvent(
        "system_error",
        `Monitoring loop failed: ${error}`,
        "critical",
      );
    });
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.logEvent("system_shutdown", "Loop auditor stopped", "info");
    await this.saveState();
  }

  public getState(): LoopAuditorState {
    return { ...this.state };
  }

  public getConfig(): LoopAuditorConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<LoopAuditorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.logEvent("config_update", "Configuration updated", "info");
  }

  public getMetrics(): LoopAuditorState["metrics"] {
    return { ...this.state.metrics };
  }

  public getAnomalies(limit: number = 100): LoopAuditorState["anomalies"] {
    return this.state.anomalies.slice(-limit);
  }

  public getRecentLoops(limit: number = 100): LoopCycle[] {
    return this.state.loopCycles.slice(-limit);
  }

  public getActiveLoops(): LoopCycle[] {
    return Array.from(this.activeLoops.values());
  }

  public isHealthy(): boolean {
    const errorRate =
      this.state.metrics.totalLoops > 0
        ? this.state.metrics.failedLoops / this.state.metrics.totalLoops
        : 0;
    return errorRate < this.config.anomalyDetection.thresholds.maxErrorRate;
  }

  public clearHistory(): void {
    this.state.events = [];
    this.state.loopCycles = [];
    this.state.anomalies = [];
    this.activeLoops.clear();
    this.logEvent("loop_error", "Component error detected", "error");
  }
}

let loopAuditorInstance: GhostLoopAuditor | null = null;

export async function startGhostLoopAuditor(): Promise<void> {
  if (!loopAuditorInstance) {
    loopAuditorInstance = new GhostLoopAuditor();
  }
  await loopAuditorInstance.start();
}

export async function stopGhostLoopAuditor(): Promise<void> {
  if (loopAuditorInstance) {
    await loopAuditorInstance.stop();
  }
}

export function getGhostLoopAuditor(): GhostLoopAuditor {
  if (!loopAuditorInstance) {
    loopAuditorInstance = new GhostLoopAuditor();
  }
  return loopAuditorInstance;
}

export type { LoopEvent, LoopCycle, LoopAuditorConfig, LoopAuditorState };
