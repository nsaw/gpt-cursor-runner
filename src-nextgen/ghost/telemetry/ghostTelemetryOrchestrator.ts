// ***REMOVED*** Telemetry Orchestrator — Phase 8A P8.09.00
// Central orchestrator for all telemetry systems with unified API

import * as fs from "fs";
import * as crypto from "crypto";

// Paths
const orchestratorStatePath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/orchestrator-state.json";
const orchestratorLogPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/orchestrator.log";
const configPath =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/orchestrator-config.json";

// Ensure directories exist
const telemetryDir = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry";
if (!fs.existsSync(telemetryDir)) {
  fs.mkdirSync(telemetryDir, { recursive: true });
}

interface SystemHealth {
  overall: "healthy" | "degraded" | "unhealthy" | "critical";
  components: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
  };
  dependencies: {
    total: number;
    resolved: number;
    failed: number;
  };
  uptime: number;
  lastCheck: string;
  score: number;
}

interface OrchestratorEvent {
  id: string;
  timestamp: string;
  eventType:
    | "component_start"
    | "component_stop"
    | "component_error"
    | "component_health_change"
    | "orchestrator_start"
    | "orchestrator_stop"
    | "config_change"
    | "dependency_resolved"
    | "dependency_failed";
  componentId: string;
  componentName: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  data: any;
}

interface OrchestratorState {
  timestamp: string;
  components: any[];
  events: OrchestratorEvent[];
  systemHealth: SystemHealth;
  startupSequence: string[];
  shutdownSequence: string[];
  lastUpdate: string;
  version: string;
}

class GhostTelemetryOrchestrator {
  private state!: OrchestratorState;
  private isRunning = false;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.initializeState();
  }

  private initializeState(): void {
    try {
      // Always start with fresh state to avoid old component data
      this.state = this.getInitialState();
      this.logEvent(
        "orchestrator_start",
        "Telemetry orchestrator initialized with fresh state",
        "info",
      );
    } catch (error) {
      this.logEvent(
        "component_error",
        `Failed to initialize state: ${error}`,
        "error",
      );
      this.state = this.getInitialState();
    }
  }

  private getInitialState(): OrchestratorState {
    return {
      timestamp: new Date().toISOString(),
      components: [
        {
          id: "braun-daemon",
          name: "BRAUN DAEMON",
          type: "daemon",
          status: "running",
          health: "healthy",
          uptime: 0,
          lastHeartbeat: new Date().toISOString(),
          config: { enabled: true },
          dependencies: [],
          startOrder: 1,
          stopOrder: 1,
          autoRestart: true,
          restartCount: 0,
          maxRestarts: 5,
          errorCount: 0,
        },
        {
          id: "ghost-runner",
          name: "***REMOVED*** RUNNER",
          type: "daemon",
          status: "running",
          health: "healthy",
          uptime: 0,
          lastHeartbeat: new Date().toISOString(),
          config: { enabled: true },
          dependencies: [],
          startOrder: 2,
          stopOrder: 2,
          autoRestart: true,
          restartCount: 0,
          maxRestarts: 5,
          errorCount: 0,
        },
        {
          id: "patch-executor",
          name: "PATCH EXECUTOR",
          type: "daemon",
          status: "running",
          health: "healthy",
          uptime: 0,
          lastHeartbeat: new Date().toISOString(),
          config: { enabled: true },
          dependencies: [],
          startOrder: 3,
          stopOrder: 3,
          autoRestart: true,
          restartCount: 0,
          maxRestarts: 5,
          errorCount: 0,
        },
        {
          id: "enhanced-doc-daemon",
          name: "ENHANCED DOC DAEMON",
          type: "daemon",
          status: "running",
          health: "healthy",
          uptime: 0,
          lastHeartbeat: new Date().toISOString(),
          config: { enabled: true },
          dependencies: [],
          startOrder: 4,
          stopOrder: 4,
          autoRestart: true,
          restartCount: 0,
          maxRestarts: 5,
          errorCount: 0,
        },
      ],
      events: [],
      systemHealth: {
        overall: "healthy",
        components: {
          total: 4,
          healthy: 4,
          degraded: 0,
          unhealthy: 0,
          critical: 0,
        },
        dependencies: {
          total: 0,
          resolved: 0,
          failed: 0,
        },
        uptime: 0,
        lastCheck: new Date().toISOString(),
        score: 100,
      },
      startupSequence: [
        "braun-daemon",
        "ghost-runner",
        "patch-executor",
        "enhanced-doc-daemon",
      ],
      shutdownSequence: [
        "enhanced-doc-daemon",
        "patch-executor",
        "ghost-runner",
        "braun-daemon",
      ],
      lastUpdate: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  private logEvent(
    eventType: OrchestratorEvent["eventType"],
    message: string,
    severity: OrchestratorEvent["severity"],
    componentId: string = "orchestrator",
    componentName: string = "Telemetry Orchestrator",
    data: any = {},
  ): void {
    const event: OrchestratorEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      componentId,
      componentName,
      severity,
      message,
      data,
    };

    this.state.events.push(event);

    // Keep only last 100 events
    if (this.state.events.length > 100) {
      this.state.events = this.state.events.slice(-100);
    }

    const logEntry = {
      timestamp: event.timestamp,
      eventType: event.eventType,
      severity: event.severity,
      componentId: event.componentId,
      message,
      data,
    };

    fs.appendFileSync(orchestratorLogPath, JSON.stringify(logEntry) + "\n");
  }

  private async calculateSystemHealth(): Promise<void> {
    try {
      // Simple health calculation based on running processes
      const { exec } = await import("child_process");
      const util = await import("util");
      const execAsync = util.promisify(exec);

      // Check if core daemons are running
      const processes = [
        {
          name: "BRAUN DAEMON",
          pattern: "braun_daemon.py",
          componentId: "braun-daemon",
        },
        {
          name: "***REMOVED*** RUNNER",
          pattern: "ghost-runner.js",
          componentId: "ghost-runner",
        },
        {
          name: "PATCH EXECUTOR",
          pattern: "patch-executor-loop.js",
          componentId: "patch-executor",
        },
        {
          name: "ENHANCED DOC DAEMON",
          pattern: "enhanced-doc-daemon.js",
          componentId: "enhanced-doc-daemon",
        },
      ];

      let healthyCount = 0;
      const totalCount = processes.length;

      for (const process of processes) {
        try {
          const { stdout } = await execAsync(
            `ps aux | grep "${process.pattern}" | grep -v grep`,
          );
          const isRunning = stdout.trim() !== "";

          // Update component status
          const component = this.state.components.find(
            (c) => c.id === process.componentId,
          );
          if (component) {
            if (isRunning) {
              component.status = "running";
              component.health = "healthy";
              component.lastHeartbeat = new Date().toISOString();
              component.errorCount = 0;
              healthyCount++;
            } else {
              component.status = "error";
              component.health = "critical";
              component.errorCount++;
            }
          }
        } catch (error) {
          // Process not found - mark component as critical
          const component = this.state.components.find(
            (c) => c.id === process.componentId,
          );
          if (component) {
            component.status = "error";
            component.health = "critical";
            component.errorCount++;
          }
        }
      }

      // Calculate health score
      const healthScore = Math.round((healthyCount / totalCount) * 100);

      // Determine overall status
      let overall: "healthy" | "degraded" | "unhealthy" | "critical";
      if (healthScore >= 90) overall = "healthy";
      else if (healthScore >= 70) overall = "degraded";
      else if (healthScore >= 50) overall = "unhealthy";
      else overall = "critical";

      // Calculate component health from actual component data
      const totalComponents = this.state.components.length;
      const healthyComponents = this.state.components.filter(
        (c) => c.health === "healthy",
      ).length;
      const degradedComponents = this.state.components.filter(
        (c) => c.health === "degraded",
      ).length;
      const unhealthyComponents = this.state.components.filter(
        (c) => c.health === "unhealthy",
      ).length;
      const criticalComponents = this.state.components.filter(
        (c) => c.health === "critical",
      ).length;

      // Update system health
      this.state.systemHealth = {
        overall,
        components: {
          total: totalComponents,
          healthy: healthyComponents,
          degraded: degradedComponents,
          unhealthy: unhealthyComponents,
          critical: criticalComponents,
        },
        dependencies: {
          total: 0,
          resolved: 0,
          failed: 0,
        },
        uptime: Date.now() - this.startTime.getTime(),
        lastCheck: new Date().toISOString(),
        score: healthScore,
      };

      this.logEvent(
        "component_health_change",
        `System health updated: ${overall} (${healthScore}%)`,
        "info",
      );
    } catch (error) {
      this.logEvent(
        "component_error",
        `Failed to calculate system health: ${error}`,
        "error",
      );
    }
  }

  private async saveState(): Promise<void> {
    try {
      this.state.timestamp = new Date().toISOString();
      this.state.lastUpdate = new Date().toISOString();
      fs.writeFileSync(
        orchestratorStatePath,
        JSON.stringify(this.state, null, 2),
      );
    } catch (error) {
      this.logEvent(
        "component_error",
        `Failed to save state: ${error}`,
        "error",
      );
    }
  }

  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Calculate overall system health
        await this.calculateSystemHealth();

        // Save state
        await this.saveState();

        // Wait before next check
        await new Promise((resolve) => setTimeout(resolve, 30000)); // 30 seconds
      } catch (error) {
        this.logEvent(
          "component_error",
          `Monitoring loop error: ${error}`,
          "error",
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logEvent(
      "orchestrator_start",
      "Telemetry orchestrator started",
      "info",
    );

    // Start monitoring loop
    this.monitoringLoop().catch((error) => {
      this.logEvent(
        "component_error",
        `Monitoring loop failed: ${error}`,
        "critical",
      );
    });
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.logEvent(
      "orchestrator_stop",
      "Telemetry orchestrator stopping",
      "info",
    );
    await this.saveState();
    this.logEvent(
      "orchestrator_stop",
      "Telemetry orchestrator stopped",
      "info",
    );
  }

  public getState(): OrchestratorState {
    return { ...this.state };
  }

  public getSystemHealth(): SystemHealth {
    return { ...this.state.systemHealth };
  }

  public getRecentEvents(limit: number = 100): OrchestratorEvent[] {
    return this.state.events.slice(-limit);
  }

  public isHealthy(): boolean {
    return (
      this.state.systemHealth.overall === "healthy" ||
      this.state.systemHealth.overall === "degraded"
    );
  }
}

let orchestratorInstance: GhostTelemetryOrchestrator | null = null;

export async function startGhostTelemetryOrchestrator(): Promise<void> {
  if (!orchestratorInstance) {
    orchestratorInstance = new GhostTelemetryOrchestrator();
  }
  await orchestratorInstance.start();
}

export async function stopGhostTelemetryOrchestrator(): Promise<void> {
  if (orchestratorInstance) {
    await orchestratorInstance.stop();
  }
}

export function getGhostTelemetryOrchestrator(): GhostTelemetryOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new GhostTelemetryOrchestrator();
  }
  return orchestratorInstance;
}

export type { OrchestratorEvent, SystemHealth, OrchestratorState };
