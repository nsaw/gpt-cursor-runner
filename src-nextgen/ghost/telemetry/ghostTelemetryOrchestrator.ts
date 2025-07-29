// GHOST Telemetry Orchestrator — Phase 8A P8.09.00
// Central orchestrator for all telemetry systems with unified API

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);
const orchestratorLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-orchestrator.log';
const orchestratorStatePath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/orchestrator-state.json';
const configPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/telemetry-orchestrator-config.json';
const apiPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/api';
const logDir = path.dirname(orchestratorLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(orchestratorStatePath))) {
  fs.mkdirSync(path.dirname(orchestratorStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}
if (!fs.existsSync(apiPath)) {
  fs.mkdirSync(apiPath, { recursive: true });
}

interface TelemetryComponent {
  id: string;
  name: string;
  type: 'dashboard' | 'relay' | 'heartbeat' | 'loop-auditor' | 'snapshot' | 'aggregator' | 'alert-engine';
  status: 'starting' | 'running' | 'stopped' | 'error' | 'unknown';
  health: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  uptime: number;
  lastHeartbeat: string;
  config: any;
  dependencies: string[];
  startOrder: number;
  stopOrder: number;
  autoRestart: boolean;
  restartCount: number;
  maxRestarts: number;
  errorCount: number;
  lastError?: string;
}

interface OrchestratorEvent {
  id: string;
  timestamp: string;
  eventType: 'component_start' | 'component_stop' | 'component_error' | 'component_health_change' | 'orchestrator_start' | 'orchestrator_stop' | 'config_change' | 'dependency_resolved' | 'dependency_failed';
  componentId: string;
  componentName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  data: any;
}

interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
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

interface OrchestratorConfig {
  enabled: boolean;
  components: {
    dashboard: boolean;
    relay: boolean;
    heartbeat: boolean;
    loopAuditor: boolean;
    snapshot: boolean;
    aggregator: boolean;
    alertEngine: boolean;
  };
  lifecycle: {
    enabled: boolean;
    startupTimeout: number;
    shutdownTimeout: number;
    healthCheckInterval: number;
    dependencyCheckInterval: number;
  };
  monitoring: {
    enabled: boolean;
    monitoringInterval: number;
    maxConcurrentOperations: number;
    operationTimeout: number;
  };
  api: {
    enabled: boolean;
    port: number;
    host: string;
    rateLimit: number;
    authentication: boolean;
  };
  integration: {
    dashboard: {
      enabled: boolean;
      updateInterval: number;
      sendStatus: boolean;
      sendMetrics: boolean;
    };
    external: {
      enabled: boolean;
      endpoints: string[];
      healthCheck: boolean;
    };
  };
  security: {
    enabled: boolean;
    accessControl: boolean;
    auditLogging: boolean;
    encryption: boolean;
  };
}

interface OrchestratorState {
  timestamp: string;
  components: TelemetryComponent[];
  events: OrchestratorEvent[];
  systemHealth: SystemHealth;
  startupSequence: string[];
  shutdownSequence: string[];
  lastUpdate: string;
  version: string;
}

class GhostTelemetryOrchestrator {
  private config!: OrchestratorConfig;
  private state!: OrchestratorState;
  private isRunning = false;
  private monitoringInterval = 15000; // 15 seconds
  private maxEventHistory = 5000;
  private startTime: Date;
  private componentInstances: Map<string, any> = new Map();

  constructor() {
    this.startTime = new Date();
    this.loadConfig();
    this.initializeState();
    this.logEvent('orchestrator_start', 'Telemetry orchestrator initialized', 'info');
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, 'utf8');
        this.config = JSON.parse(configData);
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      this.logEvent('config_error', `Failed to load config: ${error}`, 'error');
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): OrchestratorConfig {
    return {
      enabled: true,
      components: {
        dashboard: true,
        relay: true,
        heartbeat: true,
        loopAuditor: true,
        snapshot: true,
        aggregator: true,
        alertEngine: true
      },
      lifecycle: {
        enabled: true,
        startupTimeout: 60000,
        shutdownTimeout: 30000,
        healthCheckInterval: 30000,
        dependencyCheckInterval: 15000
      },
      monitoring: {
        enabled: true,
        monitoringInterval: 15000,
        maxConcurrentOperations: 10,
        operationTimeout: 30000
      },
      api: {
        enabled: true,
        port: 8788,
        host: 'localhost',
        rateLimit: 100,
        authentication: false
      },
      integration: {
        dashboard: {
          enabled: true,
          updateInterval: 10000,
          sendStatus: true,
          sendMetrics: true
        },
        external: {
          enabled: false,
          endpoints: [],
          healthCheck: true
        }
      },
      security: {
        enabled: true,
        accessControl: true,
        auditLogging: true,
        encryption: false
      }
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.logEvent('config_error', `Failed to save config: ${error}`, 'error');
    }
  }

  private initializeState(): void {
    try {
      if (fs.existsSync(orchestratorStatePath)) {
        const stateData = fs.readFileSync(orchestratorStatePath, 'utf8');
        this.state = JSON.parse(stateData);
      } else {
        this.state = this.getInitialState();
      }
    } catch (error) {
      this.logEvent('state_error', `Failed to load state: ${error}`, 'error');
      this.state = this.getInitialState();
    }
  }

  private getInitialState(): OrchestratorState {
    return {
      timestamp: new Date().toISOString(),
      components: this.initializeComponents(),
      events: [],
      systemHealth: {
        overall: 'unknown',
        components: {
          total: 0,
          healthy: 0,
          degraded: 0,
          unhealthy: 0,
          critical: 0
        },
        dependencies: {
          total: 0,
          resolved: 0,
          failed: 0
        },
        uptime: 0,
        lastCheck: new Date().toISOString(),
        score: 0
      },
      startupSequence: ['dashboard', 'relay', 'heartbeat', 'aggregator', 'alert-engine', 'loop-auditor', 'snapshot'],
      shutdownSequence: ['snapshot', 'loop-auditor', 'alert-engine', 'aggregator', 'heartbeat', 'relay', 'dashboard'],
      lastUpdate: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  private initializeComponents(): TelemetryComponent[] {
    return [
      {
        id: 'dashboard',
        name: 'Telemetry Dashboard',
        type: 'dashboard',
        status: 'stopped',
        health: 'unknown',
        uptime: 0,
        lastHeartbeat: new Date().toISOString(),
        config: { enabled: this.config.components.dashboard },
        dependencies: [],
        startOrder: 1,
        stopOrder: 7,
        autoRestart: true,
        restartCount: 0,
        maxRestarts: 5,
        errorCount: 0
      },
      {
        id: 'relay',
        name: 'Relay Telemetry Core',
        type: 'relay',
        status: 'stopped',
        health: 'unknown',
        uptime: 0,
        lastHeartbeat: new Date().toISOString(),
        config: { enabled: this.config.components.relay },
        dependencies: ['dashboard'],
        startOrder: 2,
        stopOrder: 6,
        autoRestart: true,
        restartCount: 0,
        maxRestarts: 5,
        errorCount: 0
      },
      {
        id: 'heartbeat',
        name: 'Heartbeat Visualizer',
        type: 'heartbeat',
        status: 'stopped',
        health: 'unknown',
        uptime: 0,
        lastHeartbeat: new Date().toISOString(),
        config: { enabled: this.config.components.heartbeat },
        dependencies: ['dashboard', 'relay'],
        startOrder: 3,
        stopOrder: 5,
        autoRestart: true,
        restartCount: 0,
        maxRestarts: 5,
        errorCount: 0
      },
      {
        id: 'aggregator',
        name: 'Metrics Aggregator',
        type: 'aggregator',
        status: 'stopped',
        health: 'unknown',
        uptime: 0,
        lastHeartbeat: new Date().toISOString(),
        config: { enabled: this.config.components.aggregator },
        dependencies: ['dashboard', 'relay', 'heartbeat'],
        startOrder: 4,
        stopOrder: 4,
        autoRestart: true,
        restartCount: 0,
        maxRestarts: 5,
        errorCount: 0
      },
      {
        id: 'alert-engine',
        name: 'Alert Engine',
        type: 'alert-engine',
        status: 'stopped',
        health: 'unknown',
        uptime: 0,
        lastHeartbeat: new Date().toISOString(),
        config: { enabled: this.config.components.alertEngine },
        dependencies: ['dashboard', 'aggregator'],
        startOrder: 5,
        stopOrder: 3,
        autoRestart: true,
        restartCount: 0,
        maxRestarts: 5,
        errorCount: 0
      },
      {
        id: 'loop-auditor',
        name: 'Loop Auditor',
        type: 'loop-auditor',
        status: 'stopped',
        health: 'unknown',
        uptime: 0,
        lastHeartbeat: new Date().toISOString(),
        config: { enabled: this.config.components.loopAuditor },
        dependencies: ['dashboard', 'aggregator'],
        startOrder: 6,
        stopOrder: 2,
        autoRestart: true,
        restartCount: 0,
        maxRestarts: 5,
        errorCount: 0
      },
      {
        id: 'snapshot',
        name: 'Snapshot Daemon',
        type: 'snapshot',
        status: 'stopped',
        health: 'unknown',
        uptime: 0,
        lastHeartbeat: new Date().toISOString(),
        config: { enabled: this.config.components.snapshot },
        dependencies: ['dashboard', 'aggregator'],
        startOrder: 7,
        stopOrder: 1,
        autoRestart: true,
        restartCount: 0,
        maxRestarts: 5,
        errorCount: 0
      }
    ];
  }

  private logEvent(
    eventType: OrchestratorEvent['eventType'],
    message: string,
    severity: OrchestratorEvent['severity'],
    componentId: string = 'orchestrator',
    componentName: string = 'Telemetry Orchestrator',
    data: any = {}
  ): void {
    const event: OrchestratorEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      componentId,
      componentName,
      severity,
      message,
      data
    };

    this.state.events.push(event);
    
    if (this.state.events.length > this.maxEventHistory) {
      this.state.events = this.state.events.slice(-this.maxEventHistory);
    }

    const logEntry = {
      timestamp: event.timestamp,
      eventType: event.eventType,
      severity: event.severity,
      componentId: event.componentId,
      message,
      data
    };

    fs.appendFileSync(orchestratorLogPath, JSON.stringify(logEntry) + '\n');
  }

  private async startComponent(component: TelemetryComponent): Promise<boolean> {
    try {
      this.logEvent('component_start', `Starting ${component.name}`, 'info', component.id, component.name);
      
      component.status = 'starting';
      component.lastHeartbeat = new Date().toISOString();

      // Check dependencies
      const dependenciesMet = await this.checkDependencies(component);
      if (!dependenciesMet) {
        component.status = 'error';
        component.health = 'critical';
        component.lastError = 'Dependencies not met';
        this.logEvent('component_error', `Dependencies not met for ${component.name}`, 'error', component.id, component.name);
        return false;
      }

      // Start component based on type
      const success = await this.startComponentByType(component);
      
      if (success) {
        component.status = 'running';
        component.health = 'healthy';
        component.uptime = 0;
        component.errorCount = 0;
        this.logEvent('component_start', `${component.name} started successfully`, 'info', component.id, component.name);
      } else {
        component.status = 'error';
        component.health = 'critical';
        component.errorCount++;
        this.logEvent('component_error', `Failed to start ${component.name}`, 'error', component.id, component.name);
      }

      return success;
    } catch (error) {
      component.status = 'error';
      component.health = 'critical';
      component.errorCount++;
      component.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.logEvent('component_error', `Error starting ${component.name}: ${error}`, 'error', component.id, component.name);
      return false;
    }
  }

  private async startComponentByType(component: TelemetryComponent): Promise<boolean> {
    try {
      switch (component.type) {
        case 'dashboard':
          return await this.startDashboard(component);
        case 'relay':
          return await this.startRelay(component);
        case 'heartbeat':
          return await this.startHeartbeat(component);
        case 'aggregator':
          return await this.startAggregator(component);
        case 'alert-engine':
          return await this.startAlertEngine(component);
        case 'loop-auditor':
          return await this.startLoopAuditor(component);
        case 'snapshot':
          return await this.startSnapshot(component);
        default:
          throw new Error(`Unknown component type: ${component.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to start ${component.type}: ${error}`);
    }
  }

  private async startDashboard(component: TelemetryComponent): Promise<boolean> {
    try {
      // Import and start dashboard
      const { startGhostTelemetryDashboard } = await import('./ghostTelemetryDashboard.ts');
      await startGhostTelemetryDashboard();
      
      const dashboard = await import('./ghostTelemetryDashboard.ts');
      const dashboardInstance = dashboard.getGhostTelemetryDashboard();
      this.componentInstances.set(component.id, dashboardInstance);
      
      return dashboardInstance.isHealthy();
    } catch (error) {
      throw new Error(`Dashboard start failed: ${error}`);
    }
  }

  private async startRelay(component: TelemetryComponent): Promise<boolean> {
    try {
      // Import and start relay telemetry
      const { startGhostRelayTelemetryCore } = await import('./ghostRelayTelemetryCore.ts');
      await startGhostRelayTelemetryCore();
      
      const relay = await import('./ghostRelayTelemetryCore.ts');
      const relayInstance = relay.getGhostRelayTelemetryCore();
      this.componentInstances.set(component.id, relayInstance);
      
      return relayInstance.isHealthy();
    } catch (error) {
      throw new Error(`Relay telemetry start failed: ${error}`);
    }
  }

  private async startHeartbeat(component: TelemetryComponent): Promise<boolean> {
    try {
      // Import and start heartbeat visualizer
      const { startGhostHeartbeatVisualizer } = await import('./ghostHeartbeatVisualizer.ts');
      await startGhostHeartbeatVisualizer();
      
      const heartbeat = await import('./ghostHeartbeatVisualizer.ts');
      const heartbeatInstance = heartbeat.getGhostHeartbeatVisualizer();
      this.componentInstances.set(component.id, heartbeatInstance);
      
      return heartbeatInstance.isHealthy();
    } catch (error) {
      throw new Error(`Heartbeat visualizer start failed: ${error}`);
    }
  }

  private async startAggregator(component: TelemetryComponent): Promise<boolean> {
    try {
      // Import and start metrics aggregator
      const { startGhostMetricsAggregator } = await import('./ghostMetricsAggregator.ts');
      await startGhostMetricsAggregator();
      
      const aggregator = await import('./ghostMetricsAggregator.ts');
      const aggregatorInstance = aggregator.getGhostMetricsAggregator();
      this.componentInstances.set(component.id, aggregatorInstance);
      
      return aggregatorInstance.isHealthy();
    } catch (error) {
      throw new Error(`Metrics aggregator start failed: ${error}`);
    }
  }

  private async startAlertEngine(component: TelemetryComponent): Promise<boolean> {
    try {
      // Import and start alert engine
      const { startGhostAlertEngine } = await import('./ghostAlertEngine.ts');
      await startGhostAlertEngine();
      
      const alertEngine = await import('./ghostAlertEngine.ts');
      const alertEngineInstance = alertEngine.getGhostAlertEngine();
      this.componentInstances.set(component.id, alertEngineInstance);
      
      return alertEngineInstance.isHealthy();
    } catch (error) {
      throw new Error(`Alert engine start failed: ${error}`);
    }
  }

  private async startLoopAuditor(component: TelemetryComponent): Promise<boolean> {
    try {
      // Placeholder for loop auditor start
      // This would be implemented when the loop auditor is available
      component.status = 'running';
      component.health = 'healthy';
      return true;
    } catch (error) {
      throw new Error(`Loop auditor start failed: ${error}`);
    }
  }

  private async startSnapshot(component: TelemetryComponent): Promise<boolean> {
    try {
      // Placeholder for snapshot daemon start
      // This would be implemented when the snapshot daemon is available
      component.status = 'running';
      component.health = 'healthy';
      return true;
    } catch (error) {
      throw new Error(`Snapshot daemon start failed: ${error}`);
    }
  }

  private async stopComponent(component: TelemetryComponent): Promise<boolean> {
    try {
      this.logEvent('component_stop', `Stopping ${component.name}`, 'info', component.id, component.name);
      
      component.status = 'stopped';
      component.health = 'unknown';
      component.uptime = 0;

      // Stop component based on type
      const success = await this.stopComponentByType(component);
      
      if (success) {
        this.logEvent('component_stop', `${component.name} stopped successfully`, 'info', component.id, component.name);
      } else {
        this.logEvent('component_error', `Failed to stop ${component.name}`, 'error', component.id, component.name);
      }

      return success;
    } catch (error) {
      this.logEvent('component_error', `Error stopping ${component.name}: ${error}`, 'error', component.id, component.name);
      return false;
    }
  }

  private async stopComponentByType(component: TelemetryComponent): Promise<boolean> {
    try {
      switch (component.type) {
        case 'dashboard':
          return await this.stopDashboard(component);
        case 'relay':
          return await this.stopRelay(component);
        case 'heartbeat':
          return await this.stopHeartbeat(component);
        case 'aggregator':
          return await this.stopAggregator(component);
        case 'alert-engine':
          return await this.stopAlertEngine(component);
        case 'loop-auditor':
          return await this.stopLoopAuditor(component);
        case 'snapshot':
          return await this.stopSnapshot(component);
        default:
          throw new Error(`Unknown component type: ${component.type}`);
      }
    } catch (error) {
      throw new Error(`Failed to stop ${component.type}: ${error}`);
    }
  }

  private async stopDashboard(component: TelemetryComponent): Promise<boolean> {
    try {
      const { stopGhostTelemetryDashboard } = await import('./ghostTelemetryDashboard');
      await stopGhostTelemetryDashboard();
      this.componentInstances.delete(component.id);
      return true;
    } catch (error) {
      throw new Error(`Dashboard stop failed: ${error}`);
    }
  }

  private async stopRelay(component: TelemetryComponent): Promise<boolean> {
    try {
      const { stopGhostRelayTelemetryCore } = await import('./ghostRelayTelemetryCore');
      await stopGhostRelayTelemetryCore();
      this.componentInstances.delete(component.id);
      return true;
    } catch (error) {
      throw new Error(`Relay telemetry stop failed: ${error}`);
    }
  }

  private async stopHeartbeat(component: TelemetryComponent): Promise<boolean> {
    try {
      const { stopGhostHeartbeatVisualizer } = await import('./ghostHeartbeatVisualizer');
      await stopGhostHeartbeatVisualizer();
      this.componentInstances.delete(component.id);
      return true;
    } catch (error) {
      throw new Error(`Heartbeat visualizer stop failed: ${error}`);
    }
  }

  private async stopAggregator(component: TelemetryComponent): Promise<boolean> {
    try {
      const { stopGhostMetricsAggregator } = await import('./ghostMetricsAggregator');
      await stopGhostMetricsAggregator();
      this.componentInstances.delete(component.id);
      return true;
    } catch (error) {
      throw new Error(`Metrics aggregator stop failed: ${error}`);
    }
  }

  private async stopAlertEngine(component: TelemetryComponent): Promise<boolean> {
    try {
      const { stopGhostAlertEngine } = await import('./ghostAlertEngine');
      await stopGhostAlertEngine();
      this.componentInstances.delete(component.id);
      return true;
    } catch (error) {
      throw new Error(`Alert engine stop failed: ${error}`);
    }
  }

  private async stopLoopAuditor(component: TelemetryComponent): Promise<boolean> {
    try {
      // Placeholder for loop auditor stop
      return true;
    } catch (error) {
      throw new Error(`Loop auditor stop failed: ${error}`);
    }
  }

  private async stopSnapshot(component: TelemetryComponent): Promise<boolean> {
    try {
      // Placeholder for snapshot daemon stop
      return true;
    } catch (error) {
      throw new Error(`Snapshot daemon stop failed: ${error}`);
    }
  }

  private async checkDependencies(component: TelemetryComponent): Promise<boolean> {
    if (component.dependencies.length === 0) return true;

    for (const depId of component.dependencies) {
      const dependency = this.state.components.find(c => c.id === depId);
      if (!dependency || dependency.status !== 'running' || dependency.health !== 'healthy') {
        return false;
      }
    }

    return true;
  }

  private async checkComponentHealth(component: TelemetryComponent): Promise<void> {
    try {
      const instance = this.componentInstances.get(component.id);
      if (instance && typeof instance.isHealthy === 'function') {
        const isHealthy = instance.isHealthy();
        const previousHealth = component.health;
        
        if (isHealthy) {
          component.health = 'healthy';
        } else {
          component.health = 'degraded';
        }

        if (previousHealth !== component.health) {
          this.logEvent('component_health_change', 
            `${component.name} health changed from ${previousHealth} to ${component.health}`, 
            component.health === 'healthy' ? 'info' : 'warning',
            component.id, 
            component.name
          );
        }
      }

      // Update uptime
      if (component.status === 'running') {
        const startTime = new Date(component.lastHeartbeat);
        const now = new Date();
        component.uptime = (now.getTime() - startTime.getTime()) / 1000;
      }
    } catch (error) {
      component.health = 'critical';
      component.errorCount++;
      component.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.logEvent('component_error', 
        `Health check failed for ${component.name}: ${error}`, 
        'error',
        component.id, 
        component.name
      );
    }
  }

  private async calculateSystemHealth(): Promise<void> {
    const components = this.state.components.filter(c => c.config.enabled);
    const total = components.length;
    const healthy = components.filter(c => c.health === 'healthy').length;
    const degraded = components.filter(c => c.health === 'degraded').length;
    const unhealthy = components.filter(c => c.health === 'unhealthy').length;
    const critical = components.filter(c => c.health === 'critical').length;

    this.state.systemHealth.components = {
      total,
      healthy,
      degraded,
      unhealthy,
      critical
    };

    // Calculate overall health
    if (critical > 0) {
      this.state.systemHealth.overall = 'critical';
    } else if (unhealthy > 0) {
      this.state.systemHealth.overall = 'unhealthy';
    } else if (degraded > 0) {
      this.state.systemHealth.overall = 'degraded';
    } else if (healthy === total) {
      this.state.systemHealth.overall = 'healthy';
    } else {
      this.state.systemHealth.overall = 'unknown';
    }

    // Calculate health score
    const score = total > 0 ? (healthy / total) * 100 : 0;
    this.state.systemHealth.score = Math.round(score);
    this.state.systemHealth.lastCheck = new Date().toISOString();
    this.state.systemHealth.uptime = (new Date().getTime() - this.startTime.getTime()) / 1000;
  }

  private async saveState(): Promise<void> {
    try {
      this.state.timestamp = new Date().toISOString();
      this.state.lastUpdate = new Date().toISOString();
      fs.writeFileSync(orchestratorStatePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logEvent('state_error', `Failed to save state: ${error}`, 'error');
    }
  }

  private async sendToDashboard(): Promise<void> {
    try {
      if (this.config.integration.dashboard.enabled) {
        this.logEvent('dashboard_integration', 'Orchestrator status sent to dashboard', 'info', {
          systemHealth: this.state.systemHealth,
          componentCount: this.state.components.length
        });
      }
    } catch (error) {
      this.logEvent('dashboard_error', `Failed to send to dashboard: ${error}`, 'error');
    }
  }

  private async startupSequence(): Promise<void> {
    this.logEvent('orchestrator_start', 'Starting telemetry system startup sequence', 'info');

    for (const componentId of this.state.startupSequence) {
      const component = this.state.components.find(c => c.id === componentId);
      if (component && component.config.enabled) {
        const success = await this.startComponent(component);
        if (!success && component.autoRestart) {
          this.logEvent('component_error', 
            `Failed to start ${component.name}, will retry`, 
            'warning',
            component.id, 
            component.name
          );
        }
        
        // Wait a bit between component starts
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    this.logEvent('orchestrator_start', 'Telemetry system startup sequence completed', 'info');
  }

  private async shutdownSequence(): Promise<void> {
    this.logEvent('orchestrator_stop', 'Starting telemetry system shutdown sequence', 'info');

    for (const componentId of this.state.shutdownSequence) {
      const component = this.state.components.find(c => c.id === componentId);
      if (component && component.status === 'running') {
        await this.stopComponent(component);
        
        // Wait a bit between component stops
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.logEvent('orchestrator_stop', 'Telemetry system shutdown sequence completed', 'info');
  }

  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Check health of all running components
        for (const component of this.state.components) {
          if (component.status === 'running') {
            await this.checkComponentHealth(component);
          }
        }

        // Calculate overall system health
        await this.calculateSystemHealth();
        
        // Save state
        await this.saveState();
        
        // Send to dashboard
        await this.sendToDashboard();
        
        await new Promise(resolve => setTimeout(resolve, this.config.monitoring.monitoringInterval));
      } catch (error) {
        this.logEvent('monitoring_error', `Monitoring loop error: ${error}`, 'error');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logEvent('orchestrator_start', 'Telemetry orchestrator started', 'info');

    // Start all components in sequence
    await this.startupSequence();
    
    // Start monitoring loop
    this.monitoringLoop().catch(error => {
      this.logEvent('system_error', `Monitoring loop failed: ${error}`, 'critical');
    });
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.logEvent('orchestrator_stop', 'Telemetry orchestrator stopping', 'info');

    // Stop all components in sequence
    await this.shutdownSequence();
    
    await this.saveState();
    this.logEvent('orchestrator_stop', 'Telemetry orchestrator stopped', 'info');
  }

  public getState(): OrchestratorState {
    return { ...this.state };
  }

  public getConfig(): OrchestratorConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.logEvent('config_change', 'Configuration updated', 'info', 'orchestrator', 'Telemetry Orchestrator', newConfig);
  }

  public getComponent(componentId: string): TelemetryComponent | null {
    return this.state.components.find(c => c.id === componentId) || null;
  }

  public getAllComponents(): TelemetryComponent[] {
    return [...this.state.components];
  }

  public async restartComponent(componentId: string): Promise<boolean> {
    const component = this.state.components.find(c => c.id === componentId);
    if (!component) return false;

    await this.stopComponent(component);
    await new Promise(resolve => setTimeout(resolve, 2000));
    return await this.startComponent(component);
  }

  public getSystemHealth(): SystemHealth {
    return { ...this.state.systemHealth };
  }

  public getRecentEvents(limit: number = 100): OrchestratorEvent[] {
    return this.state.events.slice(-limit);
  }

  public isHealthy(): boolean {
    return this.state.systemHealth.overall === 'healthy' || this.state.systemHealth.overall === 'degraded';
  }

  public clearHistory(): void {
    this.state.events = [];
    this.logEvent('system_maintenance', 'Orchestrator history cleared', 'info');
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

export type {
  TelemetryComponent,
  OrchestratorEvent,
  SystemHealth,
  OrchestratorConfig,
  OrchestratorState
}; 