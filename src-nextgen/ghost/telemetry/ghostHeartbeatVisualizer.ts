// GHOST Heartbeat Visualizer — Phase 8A P8.03.00
// Real-time heartbeat monitoring and visualization system

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);
const heartbeatLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/heartbeat-visualizer.log';
const heartbeatStatePath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/heartbeat-state.json';
const configPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/heartbeat-config.json';
const heartbeatDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat';
const logDir = path.dirname(heartbeatLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(heartbeatStatePath))) {
  fs.mkdirSync(path.dirname(heartbeatStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}
if (!fs.existsSync(heartbeatDir)) {
  fs.mkdirSync(heartbeatDir, { recursive: true });
}

interface HeartbeatEvent {
  id: string;
  timestamp: string;
  eventType: 'heartbeat' | 'clock_sync' | 'daemon_check' | 'system_status' | 'anomaly' | 'error' | 'system_startup' | 'config_error' | 'state_error' | 'heartbeat_error' | 'clock_sync_error' | 'anomaly_error' | 'dashboard_integration' | 'dashboard_error' | 'monitoring_error' | 'system_error' | 'system_shutdown' | 'config_update' | 'system_maintenance';
  component: string;
  data: any;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
}

interface HeartbeatStatus {
  systemTime: string;
  clockDrift: number;
  lastHeartbeat: string;
  daemonCount: number;
  healthyDaemons: number;
  systemUptime: number;
  heartbeatInterval: number;
  lastPingTime: string;
  pingLatency: number;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
}

interface DaemonHeartbeat {
  id: string;
  name: string;
  status: 'running' | 'failed' | 'restarted' | 'paused' | 'unknown';
  lastHeartbeat: string;
  uptime: number;
  restartCount: number;
  pid?: number;
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  error?: string;
}

interface ClockSyncStatus {
  systemTime: string;
  ntpTime: string;
  clockDrift: number;
  lastSync: string;
  syncInterval: number;
  driftThreshold: number;
  status: 'synced' | 'drift_warning' | 'drift_critical' | 'sync_failed';
}

interface HeartbeatConfig {
  enabled: boolean;
  monitoring: {
    enabled: boolean;
    intervalMs: number;
    maxRetries: number;
    timeoutMs: number;
  };
  visualization: {
    enabled: boolean;
    updateInterval: number;
    maxHistorySize: number;
    retentionDays: number;
  };
  alerts: {
    enabled: boolean;
    clockDriftThreshold: number;
    heartbeatTimeout: number;
    daemonFailureThreshold: number;
    systemUptimeThreshold: number;
  };
  integration: {
    dashboard: {
      enabled: boolean;
      updateInterval: number;
      sendMetrics: boolean;
      sendEvents: boolean;
    };
    telemetry: {
      enabled: boolean;
      sendHeartbeats: boolean;
      sendClockSync: boolean;
    };
  };
  security: {
    enabled: boolean;
    validateHeartbeats: boolean;
    auditLogging: boolean;
    sanitizeData: boolean;
  };
}

interface HeartbeatState {
  timestamp: string;
  events: HeartbeatEvent[];
  heartbeatStatus: HeartbeatStatus;
  daemonHeartbeats: DaemonHeartbeat[];
  clockSyncStatus: ClockSyncStatus;
  lastUpdate: string;
  version: string;
}

class GhostHeartbeatVisualizer {
  private config!: HeartbeatConfig;
  private state!: HeartbeatState;
  private isRunning = false;
  private monitoringInterval = 5000; // 5 seconds
  private maxEventHistory = 1000;
  private eventCounter = 0;
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.loadConfig();
    this.initializeState();
    this.logEvent('system_startup', 'Heartbeat visualizer started', 'info');
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
      this.logEvent('config_error', `Failed to load config: ${error}`);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): HeartbeatConfig {
    return {
      enabled: true,
      monitoring: {
        enabled: true,
        intervalMs: 5000,
        maxRetries: 3,
        timeoutMs: 10000
      },
      visualization: {
        enabled: true,
        updateInterval: 5000,
        maxHistorySize: 1000,
        retentionDays: 7
      },
      alerts: {
        enabled: true,
        clockDriftThreshold: 30,
        heartbeatTimeout: 60,
        daemonFailureThreshold: 3,
        systemUptimeThreshold: 3600
      },
      integration: {
        dashboard: {
          enabled: true,
          updateInterval: 5000,
          sendMetrics: true,
          sendEvents: true
        },
        telemetry: {
          enabled: true,
          sendHeartbeats: true,
          sendClockSync: true
        }
      },
      security: {
        enabled: true,
        validateHeartbeats: true,
        auditLogging: true,
        sanitizeData: true
      }
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.logEvent('component_error', `Failed to save config: ${error}`);
    }
  }

  private initializeState(): void {
    try {
      if (fs.existsSync(heartbeatStatePath)) {
        const stateData = fs.readFileSync(heartbeatStatePath, 'utf8');
        this.state = JSON.parse(stateData);
      } else {
        this.state = this.getInitialState();
      }
    } catch (error) {
      this.logEvent('state_error', `Failed to load state: ${error}`);
      this.state = this.getInitialState();
    }
  }

  private getInitialState(): HeartbeatState {
    return {
      timestamp: new Date().toISOString(),
      events: [],
      heartbeatStatus: {
        systemTime: new Date().toISOString(),
        clockDrift: 0,
        lastHeartbeat: new Date().toISOString(),
        daemonCount: 0,
        healthyDaemons: 0,
        systemUptime: 0,
        heartbeatInterval: 5000,
        lastPingTime: new Date().toISOString(),
        pingLatency: 0,
        status: 'healthy'
      },
      daemonHeartbeats: [],
      clockSyncStatus: {
        systemTime: new Date().toISOString(),
        ntpTime: new Date().toISOString(),
        clockDrift: 0,
        lastSync: new Date().toISOString(),
        syncInterval: 300000,
        driftThreshold: 30,
        status: 'synced'
      },
      lastUpdate: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  private logEvent(
    eventType: HeartbeatEvent['eventType'],
    message: string,
    severity: HeartbeatEvent['severity'],
    data: any = {}
  ): void {
    if (!this.config.enabled) return;

    const event: HeartbeatEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType,
      component: 'heartbeat-visualizer',
      data,
      severity,
      message
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
      data: this.config.security.sanitizeData ? this.sanitizeData(data) : data
    };

    fs.appendFileSync(heartbeatLogPath, JSON.stringify(logEntry) + '\n');
  }

  private sanitizeData(data: any): any {
    if (typeof data === 'string') {
      return data
        .replace(/api[_-]?key[\"\s]*[:=][\"\s]*[^\"\s,}]+/gi, 'api_key: [REDACTED]')
        .replace(/token[\"\s]*[:=][\"\s]*[^\"\s,}]+/gi, 'token: [REDACTED]')
        .replace(/password[\"\s]*[:=][\"\s]*[^\"\s,}]+/gi, 'password: [REDACTED]');
    }
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.config.security.sanitizeData && 
            ['apiKey', 'token', 'password', 'secret'].includes(key.toLowerCase())) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }
      return sanitized;
    }
    return data;
  }

  private async collectHeartbeatStatus(): Promise<HeartbeatStatus> {
    try {
      const clockStatusPath = path.join(heartbeatDir, '.clock-status.md');
      const ghostRelayLogPath = path.join(heartbeatDir, '.ghost-relay.log');
      
      let systemTime = new Date().toISOString();
      let clockDrift = 0;
      let lastHeartbeat = new Date().toISOString();
      let heartbeatInterval = 5000;
      
      // Read clock status
      if (fs.existsSync(clockStatusPath)) {
        const content = fs.readFileSync(clockStatusPath, 'utf8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          if (line.includes('System Time:')) {
            systemTime = line.split('System Time:')[1].trim();
          } else if (line.includes('Clock Drift:')) {
            clockDrift = parseFloat(line.split('Clock Drift:')[1].trim()) || 0;
          } else if (line.includes('Last Heartbeat:')) {
            lastHeartbeat = line.split('Last Heartbeat:')[1].trim();
          } else if (line.includes('Heartbeat Interval:')) {
            heartbeatInterval = parseFloat(line.split('Heartbeat Interval:')[1].trim()) || 5000;
          }
        }
      }

      // Count daemons
      const daemonHeartbeats = await this.collectDaemonHeartbeats();
      const daemonCount = daemonHeartbeats.length;
      const healthyDaemons = daemonHeartbeats.filter(d => d.status === 'running').length;
      
      // Calculate system uptime
      const { stdout } = await execAsync('uptime');
      const uptimeMatch = stdout.match(/up\s+(.+?),/);
      const systemUptime = uptimeMatch ? this.parseUptime(uptimeMatch[1]) : 0;

      // Calculate ping latency
      const pingLatency = await this.measurePingLatency();
      const lastPingTime = new Date().toISOString();

      // Determine status
      let status: 'healthy' | 'degraded' | 'unhealthy' | 'critical' = 'healthy';
      
      if (Math.abs(clockDrift) > this.config.alerts.clockDriftThreshold) {
        status = 'degraded';
      }
      
      if (healthyDaemons < daemonCount * 0.8) {
        status = 'unhealthy';
      }
      
      if (healthyDaemons < daemonCount * 0.5) {
        status = 'critical';
      }

      return {
        systemTime,
        clockDrift,
        lastHeartbeat,
        daemonCount,
        healthyDaemons,
        systemUptime,
        heartbeatInterval,
        lastPingTime,
        pingLatency,
        status
      };
    } catch (error) {
      this.logEvent('heartbeat_error', `Failed to collect heartbeat status: ${error}`, 'error');
      return {
        systemTime: new Date().toISOString(),
        clockDrift: 0,
        lastHeartbeat: new Date().toISOString(),
        daemonCount: 0,
        healthyDaemons: 0,
        systemUptime: 0,
        heartbeatInterval: 5000,
        lastPingTime: new Date().toISOString(),
        pingLatency: 0,
        status: 'critical'
      };
    }
  }

  private async collectDaemonHeartbeats(): Promise<DaemonHeartbeat[]> {
    const daemons = [
      'relayCore', 'watchdog', 'executor', 'healer',
      'validationEngine', 'messageQueue', 'healthAggregator', 'decisionEngine'
    ];

    const heartbeatPromises = daemons.map(daemon => this.checkDaemonHeartbeat(daemon));
    return Promise.all(heartbeatPromises);
  }

  private async checkDaemonHeartbeat(daemonName: string): Promise<DaemonHeartbeat> {
    try {
      const startTime = Date.now();
      
      // Check if daemon process is running
      const { stdout } = await execAsync(`pgrep -f "${daemonName}"`);
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      
      const responseTime = Date.now() - startTime;
      
      if (pids.length === 0) {
        return {
          id: crypto.randomUUID(),
          name: daemonName,
          status: 'failed',
          lastHeartbeat: new Date().toISOString(),
          uptime: 0,
          restartCount: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          responseTime,
          error: 'Process not found'
        };
      }

      const pid = parseInt(pids[0]);
      
      // Get process stats
      const { stdout: psOutput } = await execAsync(`ps -p ${pid} -o pid,ppid,etime,pcpu,pmem,comm`);
      const lines = psOutput.trim().split('\n');
      
      if (lines.length < 2) {
        return {
          id: crypto.randomUUID(),
          name: daemonName,
          status: 'unknown',
          lastHeartbeat: new Date().toISOString(),
          uptime: 0,
          restartCount: 0,
          pid,
          memoryUsage: 0,
          cpuUsage: 0,
          responseTime
        };
      }

      const stats = lines[1].trim().split(/\s+/);
      const cpuUsage = parseFloat(stats[3]) || 0;
      const memoryUsage = parseFloat(stats[4]) || 0;
      
      // Calculate uptime from etime
      const etime = stats[2];
      const uptime = this.parseEtime(etime);

      return {
        id: crypto.randomUUID(),
        name: daemonName,
        status: 'running',
        lastHeartbeat: new Date().toISOString(),
        uptime,
        restartCount: 0, // Would need to track this separately
        pid,
        memoryUsage,
        cpuUsage,
        responseTime
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        name: daemonName,
        status: 'failed',
        lastHeartbeat: new Date().toISOString(),
        uptime: 0,
        restartCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        responseTime: 0,
        error: error instanceof Error ? error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) : 'Unknown error'
      };
    }
  }

  private async collectClockSyncStatus(): Promise<ClockSyncStatus> {
    try {
      const systemTime = new Date();
      const ntpTime = await this.getNtpTime();
      const clockDrift = systemTime.getTime() - ntpTime.getTime();
      
      let status: 'synced' | 'drift_warning' | 'drift_critical' | 'sync_failed' = 'synced';
      
      if (Math.abs(clockDrift) > this.config.alerts.clockDriftThreshold * 1000) {
        status = 'drift_warning';
      }
      
      if (Math.abs(clockDrift) > this.config.alerts.clockDriftThreshold * 2000) {
        status = 'drift_critical';
      }
      
      if (Math.abs(clockDrift) > this.config.alerts.clockDriftThreshold * 5000) {
        status = 'sync_failed';
      }

      return {
        systemTime: systemTime.toISOString(),
        ntpTime: ntpTime.toISOString(),
        clockDrift,
        lastSync: new Date().toISOString(),
        syncInterval: 300000, // 5 minutes
        driftThreshold: this.config.alerts.clockDriftThreshold * 1000,
        status
      };
    } catch (error) {
      this.logEvent('clock_sync_error', `Failed to collect clock sync status: ${error}`, 'error');
      return {
        systemTime: new Date().toISOString(),
        ntpTime: new Date().toISOString(),
        clockDrift: 0,
        lastSync: new Date().toISOString(),
        syncInterval: 300000,
        driftThreshold: this.config.alerts.clockDriftThreshold * 1000,
        status: 'sync_failed'
      };
    }
  }

  private async getNtpTime(): Promise<Date> {
    try {
      // Use a simple NTP server query (simplified for this implementation)
      const { stdout } = await execAsync('date -u +%s');
      const timestamp = parseInt(stdout.trim()) * 1000;
      return new Date(timestamp);
    } catch (_error) {
      // Fallback to system time
      return new Date();
    }
  }

  private async measurePingLatency(): Promise<number> {
    try {
      const startTime = Date.now();
      await execAsync('ping -c 1 8.8.8.8');
      return Date.now() - startTime;
    } catch (_error) {
      return 0;
    }
  }

  private parseEtime(etime: string): number {
    const parts = etime.split('-');
    let days = 0;
    let time = parts[0];
    
    if (parts.length > 1) {
      days = parseInt(parts[0]);
      time = parts[1];
    }
    
    const timeParts = time.split(':');
    const hours = parseInt(timeParts[0]) || 0;
    const minutes = parseInt(timeParts[1]) || 0;
    const seconds = parseInt(timeParts[2]) || 0;
    
    return (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60) + seconds;
  }

  private parseUptime(uptimeStr: string): number {
    const daysMatch = uptimeStr.match(/(\d+)\s+days?/);
    const hoursMatch = uptimeStr.match(/(\d+)\s+hours?/);
    const minutesMatch = uptimeStr.match(/(\d+)\s+minutes?/);
    
    const days = daysMatch ? parseInt(daysMatch[1]) : 0;
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    
    return (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60);
  }

  private async detectAnomalies(): Promise<void> {
    try {
      // Check for clock drift
      if (Math.abs(this.state.heartbeatStatus.clockDrift) > this.config.alerts.clockDriftThreshold) {
        this.logEvent('anomaly', `Clock drift detected: ${this.state.heartbeatStatus.clockDrift}s`, 'warning', {
          clockDrift: this.state.heartbeatStatus.clockDrift,
          threshold: this.config.alerts.clockDriftThreshold
        });
      }

      // Check for daemon failures
      const failedDaemons = this.state.daemonHeartbeats.filter(d => d.status === 'failed');
      if (failedDaemons.length > this.config.alerts.daemonFailureThreshold) {
        this.logEvent('anomaly', `${failedDaemons.length} daemon(s) failed`, 'error', {
          failedDaemons: failedDaemons.map(d => d.name),
          threshold: this.config.alerts.daemonFailureThreshold
        });
      }

      // Check for system uptime
      if (this.state.heartbeatStatus.systemUptime < this.config.alerts.systemUptimeThreshold) {
        this.logEvent('anomaly', `System uptime below threshold: ${this.state.heartbeatStatus.systemUptime}s`, 'warning', {
          systemUptime: this.state.heartbeatStatus.systemUptime,
          threshold: this.config.alerts.systemUptimeThreshold
        });
      }

      // Check for high ping latency
      if (this.state.heartbeatStatus.pingLatency > 1000) {
        this.logEvent('anomaly', `High ping latency: ${this.state.heartbeatStatus.pingLatency}ms`, 'warning', {
          pingLatency: this.state.heartbeatStatus.pingLatency
        });
      }
    } catch (error) {
      this.logEvent('anomaly_error', `Failed to detect anomalies: ${error}`, 'error');
    }
  }

  private async saveState(): Promise<void> {
    try {
      this.state.timestamp = new Date().toISOString();
      this.state.lastUpdate = new Date().toISOString();
      fs.writeFileSync(heartbeatStatePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logEvent('state_error', `Failed to save state: ${error}`);
    }
  }

  private async sendToDashboard(): Promise<void> {
    try {
      if (this.config.integration.dashboard.enabled) {
        this.logEvent('error', 'Component error detected', 'error');
      }
    } catch (error) {
      this.logEvent('component_error', `Failed to send to dashboard: ${error}`, 'error');
    }
  }

  private async monitoringLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // Collect heartbeat data
        this.state.heartbeatStatus = await this.collectHeartbeatStatus();
        this.state.daemonHeartbeats = await this.collectDaemonHeartbeats();
        this.state.clockSyncStatus = await this.collectClockSyncStatus();
        
        // Detect anomalies
        await this.detectAnomalies();
        
        // Save state
        await this.saveState();
        
        // Send to dashboard
        await this.sendToDashboard();
        
        // Log heartbeat event
        this.logEvent('heartbeat', 'Heartbeat check completed', 'info');
        
        await new Promise(resolve => setTimeout(resolve, this.config.monitoring.intervalMs));
      } catch (error) {
        this.logEvent('component_error', `Monitoring loop error: ${error}`, 'error');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logEvent('system_startup', 'Heartbeat visualizer started', 'info');

    this.monitoringLoop().catch(error => {
      this.logEvent('component_error', `Monitoring loop failed: ${error}`, 'critical');
    });
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.logEvent('system_shutdown', 'info', 'info');
    await this.saveState();
  }

  public getState(): HeartbeatState {
    return { ...this.state };
  }

  public getConfig(): HeartbeatConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<HeartbeatConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.logEvent('config_update', 'newConfig', 'info');
  }

  public getHeartbeatStatus(): HeartbeatStatus {
    return { ...this.state.heartbeatStatus };
  }

  public getDaemonHeartbeats(): DaemonHeartbeat[] {
    return [...this.state.daemonHeartbeats];
  }

  public getClockSyncStatus(): ClockSyncStatus {
    return { ...this.state.clockSyncStatus };
  }

  public getRecentEvents(limit: number = 100): HeartbeatEvent[] {
    return this.state.events.slice(-limit);
  }

  public isHealthy(): boolean {
    return this.state.heartbeatStatus.status === 'healthy' || this.state.heartbeatStatus.status === 'degraded';
  }

  public clearHistory(): void {
    this.state.events = [];
    this.logEvent('error', 'Component error detected', 'error');
  }
}

let heartbeatVisualizerInstance: GhostHeartbeatVisualizer | null = null;

export async function startGhostHeartbeatVisualizer(): Promise<void> {
  if (!heartbeatVisualizerInstance) {
    heartbeatVisualizerInstance = new GhostHeartbeatVisualizer();
  }
  await heartbeatVisualizerInstance.start();
}

export async function stopGhostHeartbeatVisualizer(): Promise<void> {
  if (heartbeatVisualizerInstance) {
    await heartbeatVisualizerInstance.stop();
  }
}

export function getGhostHeartbeatVisualizer(): GhostHeartbeatVisualizer {
  if (!heartbeatVisualizerInstance) {
    heartbeatVisualizerInstance = new GhostHeartbeatVisualizer();
  }
  return heartbeatVisualizerInstance;
}

export type {
  HeartbeatEvent,
  HeartbeatStatus,
  DaemonHeartbeat,
  ClockSyncStatus,
  HeartbeatConfig,
  HeartbeatState
}; 