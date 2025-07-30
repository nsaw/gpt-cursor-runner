// GHOST Telemetry Dashboard — Phase 8A P8.01.00
// Top-level visual dashboard for comprehensive system monitoring

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);
const telemetryLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-dashboard.log';
const dashboardStatePath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/dashboard-state.json';
const configPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/telemetry-config.json';
const logDir = path.dirname(telemetryLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(dashboardStatePath))) {
  fs.mkdirSync(path.dirname(dashboardStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface DaemonHealth {
  id: string;
  name: string;
  status: 'running' | 'failed' | 'restarted' | 'paused' | 'unknown';
  uptime: number;
  restartCount: number;
  pid?: number;
  memoryUsage: number;
  cpuUsage: number;
  lastCheck: string;
  error?: string;
}

interface GptRelayTrace {
  id: string;
  timestamp: string;
  command: string;
  responseTime: number;
  success: boolean;
  sanitized: boolean;
  rateLimited: boolean;
  error?: string;
  handlerId: string;
  correlationId?: string;
}

interface PatchQueueStatus {
  pending: number;
  executing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
  lastUpdate: string;
}

interface HeartbeatStatus {
  systemTime: string;
  clockDrift: number;
  lastHeartbeat: string;
  daemonCount: number;
  healthyDaemons: number;
  systemUptime: number;
}

interface AnomalyReport {
  id: string;
  timestamp: string;
  type: 'error' | 'warning' | 'info';
  component: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
  resolutionTime?: number;
}

interface SystemMetrics {
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
}

interface DashboardConfig {
  refresh: {
    enabled: boolean;
    intervalMs: number;
    maxRetries: number;
  };
  monitoring: {
    enabled: boolean;
    logAllEvents: boolean;
    metricsCollection: boolean;
    anomalyDetection: boolean;
  };
  alerts: {
    enabled: boolean;
    emailNotifications: boolean;
    slackNotifications: boolean;
    threshold: {
      cpuUsage: number;
      memoryUsage: number;
      diskUsage: number;
      errorRate: number;
    };
  };
  security: {
    enabled: boolean;
    authentication: boolean;
    rateLimiting: boolean;
    auditLogging: boolean;
  };
}

interface DashboardState {
  timestamp: string;
  daemonHealth: DaemonHealth[];
  gptRelayTraces: GptRelayTrace[];
  patchQueueStatus: PatchQueueStatus;
  heartbeatStatus: HeartbeatStatus;
  anomalies: AnomalyReport[];
  systemMetrics: SystemMetrics;
  overallHealth: 'excellent' | 'good' | 'degraded' | 'critical';
  lastUpdate: string;
}

class GhostTelemetryDashboard {
  private config!: DashboardConfig;
  private state!: DashboardState;
  private isRunning = false;
  private updateInterval = 5000; // 5 seconds
  private maxTraceHistory = 100;
  private maxAnomalyHistory = 50;

  constructor() {
    this.loadConfig();
    this.initializeState();
    this.logEvent('system_startup', 'info');
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

  private getDefaultConfig(): DashboardConfig {
    return {
      refresh: {
        enabled: true,
        intervalMs: 5000,
        maxRetries: 3
      },
      monitoring: {
        enabled: true,
        logAllEvents: true,
        metricsCollection: true,
        anomalyDetection: true
      },
      alerts: {
        enabled: true,
        emailNotifications: false,
        slackNotifications: true,
        threshold: {
          cpuUsage: 80,
          memoryUsage: 85,
          diskUsage: 90,
          errorRate: 5
        }
      },
      security: {
        enabled: true,
        authentication: false,
        rateLimiting: true,
        auditLogging: true
      }
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.logEvent('config_error', `Failed to save config: ${error}`);
    }
  }

  private initializeState(): void {
    try {
      if (fs.existsSync(dashboardStatePath)) {
        const stateData = fs.readFileSync(dashboardStatePath, 'utf8');
        this.state = JSON.parse(stateData);
      } else {
        this.state = this.getInitialState();
      }
    } catch (error) {
      this.logEvent('state_error', `Failed to load state: ${error}`);
      this.state = this.getInitialState();
    }
  }

  private getInitialState(): DashboardState {
    return {
      timestamp: new Date().toISOString(),
      daemonHealth: [],
      gptRelayTraces: [],
      patchQueueStatus: {
        pending: 0,
        executing: 0,
        completed: 0,
        failed: 0,
        totalProcessed: 0,
        averageProcessingTime: 0,
        lastUpdate: new Date().toISOString()
      },
      heartbeatStatus: {
        systemTime: new Date().toISOString(),
        clockDrift: 0,
        lastHeartbeat: new Date().toISOString(),
        daemonCount: 0,
        healthyDaemons: 0,
        systemUptime: 0
      },
      anomalies: [],
      systemMetrics: {
        cpu: { usage: 0, load: 0, cores: 0 },
        memory: { total: 0, used: 0, available: 0, usage: 0 },
        disk: { total: 0, used: 0, available: 0, usage: 0 },
        network: { bytesIn: 0, bytesOut: 0, connections: 0 }
      },
      overallHealth: 'excellent',
      lastUpdate: new Date().toISOString()
    };
  }

  private async collectDaemonHealth(): Promise<DaemonHealth[]> {
    const daemons = [
      'relayCore', 'watchdog', 'executor', 'healer',
      'validationEngine', 'messageQueue', 'healthAggregator', 'decisionEngine'
    ];

    const healthPromises = daemons.map(daemon => this.checkDaemonHealth(daemon));
    return Promise.all(healthPromises);
  }

  private async checkDaemonHealth(daemonName: string): Promise<DaemonHealth> {
    try {
      // Check if daemon process is running
      const { stdout } = await execAsync(`pgrep -f "${daemonName}"`);
      const pids = stdout.trim().split('\n').filter(pid => pid.length > 0);
      
      if (pids.length === 0) {
        return {
          id: crypto.randomUUID(),
          name: daemonName,
          status: 'failed',
          uptime: 0,
          restartCount: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          lastCheck: new Date().toISOString(),
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
          uptime: 0,
          restartCount: 0,
          pid,
          memoryUsage: 0,
          cpuUsage: 0,
          lastCheck: new Date().toISOString()
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
        uptime,
        restartCount: 0, // Would need to track this separately
        pid,
        memoryUsage,
        cpuUsage,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        name: daemonName,
        status: 'failed',
        uptime: 0,
        restartCount: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error) : 'Unknown error'
      };
    }
  }

  private parseEtime(etime: string): number {
    // Parse etime format (e.g., "1-02:30:45" or "02:30:45" or "30:45")
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

  private async collectGptRelayTraces(): Promise<GptRelayTrace[]> {
    try {
      const relayLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/gpt-relay.log';
      if (!fs.existsSync(relayLogPath)) {
        return [];
      }

      const logContent = fs.readFileSync(relayLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim().length > 0);
      
      const traces: GptRelayTrace[] = [];
      const recentLines = lines.slice(-this.maxTraceHistory);
      
      for (const line of recentLines) {
        const trace = this.parseRelayTrace(line);
        if (trace) {
          traces.push(trace);
        }
      }
      
      return traces.slice(-this.maxTraceHistory);
    } catch (error) {
      this.logEvent('trace_error', `Failed to collect GPT relay traces: ${error}`);
      return [];
    }
  }

  private parseRelayTrace(line: string): GptRelayTrace | null {
    try {
      const data = JSON.parse(line);
      return {
        id: data.id || crypto.randomUUID(),
        timestamp: data.timestamp || new Date().toISOString(),
        command: data.command || 'unknown',
        responseTime: data.responseTime || 0,
        success: data.success || false,
        sanitized: data.sanitized || false,
        rateLimited: data.rateLimited || false,
        error: data.error,
        handlerId: data.handlerId || 'unknown',
        correlationId: data.correlationId
      };
    } catch (_error) {
      return null;
    }
  }

  private async collectPatchQueueStatus(): Promise<PatchQueueStatus> {
    try {
      const patchesDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
      const pendingDir = path.join(patchesDir, '.pending');
      const executingDir = path.join(patchesDir, '.executing');
      const completedDir = path.join(patchesDir, '.completed');
      const failedDir = path.join(patchesDir, '.failed');

      const pending = fs.existsSync(pendingDir) ? fs.readdirSync(pendingDir).length : 0;
      const executing = fs.existsSync(executingDir) ? fs.readdirSync(executingDir).length : 0;
      const completed = fs.existsSync(completedDir) ? fs.readdirSync(completedDir).length : 0;
      const failed = fs.existsSync(failedDir) ? fs.readdirSync(failedDir).length : 0;

      return {
        pending,
        executing,
        completed,
        failed,
        totalProcessed: completed + failed,
        averageProcessingTime: 0, // Would need to calculate from actual data
        lastUpdate: new Date().toISOString()
      };
    } catch (error) {
      this.logEvent('queue_error', `Failed to collect patch queue status: ${error}`);
      return {
        pending: 0,
        executing: 0,
        completed: 0,
        failed: 0,
        totalProcessed: 0,
        averageProcessingTime: 0,
        lastUpdate: new Date().toISOString()
      };
    }
  }

  private async collectHeartbeatStatus(): Promise<HeartbeatStatus> {
    try {
      const heartbeatDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat';
      const clockStatusPath = path.join(heartbeatDir, '.clock-status.md');
      
      let systemTime = new Date().toISOString();
      let clockDrift = 0;
      let lastHeartbeat = new Date().toISOString();
      
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
          }
        }
      }

      // Count daemons
      const daemonHealth = await this.collectDaemonHealth();
      const daemonCount = daemonHealth.length;
      const healthyDaemons = daemonHealth.filter(d => d.status === 'running').length;
      
      // Calculate system uptime
      const { stdout } = await execAsync('uptime');
      const uptimeMatch = stdout.match(/up\s+(.+?),/);
      const systemUptime = uptimeMatch ? this.parseUptime(uptimeMatch[1]) : 0;

      return {
        systemTime,
        clockDrift,
        lastHeartbeat,
        daemonCount,
        healthyDaemons,
        systemUptime
      };
    } catch (error) {
      this.logEvent('heartbeat_error', `Failed to collect heartbeat status: ${error}`);
      return {
        systemTime: new Date().toISOString(),
        clockDrift: 0,
        lastHeartbeat: new Date().toISOString(),
        daemonCount: 0,
        healthyDaemons: 0,
        systemUptime: 0
      };
    }
  }

  private parseUptime(uptimeStr: string): number {
    // Parse uptime string (e.g., "2 days, 3 hours, 45 minutes")
    const daysMatch = uptimeStr.match(/(\d+)\s+days?/);
    const hoursMatch = uptimeStr.match(/(\d+)\s+hours?/);
    const minutesMatch = uptimeStr.match(/(\d+)\s+minutes?/);
    
    const days = daysMatch ? parseInt(daysMatch[1]) : 0;
    const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
    
    return (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60);
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      // CPU metrics
      const { stdout: cpuInfo } = await execAsync('top -l 1 | grep "CPU usage"');
      const cpuUsage = this.parseCpuUsage(cpuInfo);
      
      const { stdout: loadInfo } = await execAsync('sysctl -n hw.ncpu');
      const cores = parseInt(loadInfo.trim());
      
      const { stdout: loadAvg } = await execAsync('sysctl -n vm.loadavg');
      const load = this.parseLoadAverage(loadAvg);

      // Memory metrics
      const { stdout: memoryInfo } = await execAsync('vm_stat');
      const memory = this.parseMemoryInfo(memoryInfo);

      // Disk metrics
      const { stdout: diskInfo } = await execAsync('df -h /Users/sawyer/gitSync');
      const disk = this.parseDiskInfo(diskInfo);

      // Network metrics (simplified)
      const network = {
        bytesIn: 0,
        bytesOut: 0,
        connections: 0
      };

      return {
        cpu: { usage: cpuUsage, load, cores },
        memory,
        disk,
        network
      };
    } catch (error) {
      this.logEvent('metrics_error', `Failed to collect system metrics: ${error}`);
      return {
        cpu: { usage: 0, load: 0, cores: 0 },
        memory: { total: 0, used: 0, available: 0, usage: 0 },
        disk: { total: 0, used: 0, available: 0, usage: 0 },
        network: { bytesIn: 0, bytesOut: 0, connections: 0 }
      };
    }
  }

  private parseCpuUsage(cpuInfo: string): number {
    const match = cpuInfo.match(/CPU usage: (\d+\.\d+)%/);
    return match ? parseFloat(match[1]) : 0;
  }

  private parseLoadAverage(loadAvg: string): number {
    const parts = loadAvg.trim().split(' ');
    return parseFloat(parts[0]) || 0;
  }

  private parseMemoryInfo(memoryInfo: string): { total: number; used: number; available: number; usage: number } {
    // Simplified memory parsing
    const lines = memoryInfo.split('\n');
    let total = 0;
    let used = 0;
    
    for (const line of lines) {
      if (line.includes('Pages free:')) {
        const match = line.match(/Pages free:\s+(\d+)/);
        if (match) {
          used = parseInt(match[1]) * 4096; // 4KB pages
        }
      }
    }
    
    // Estimate total memory (simplified)
    total = 16 * 1024 * 1024 * 1024; // 16GB estimate
    const available = total - used;
    const usage = total > 0 ? (used / total) * 100 : 0;
    
    return { total, used, available, usage };
  }

  private parseDiskInfo(diskInfo: string): { total: number; used: number; available: number; usage: number } {
    const lines = diskInfo.split('\n');
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
      case 'K': return value * 1024;
      case 'M': return value * 1024 * 1024;
      case 'G': return value * 1024 * 1024 * 1024;
      case 'T': return value * 1024 * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  private async detectAnomalies(): Promise<AnomalyReport[]> {
    const anomalies: AnomalyReport[] = [];
    
    try {
      // Check for high CPU usage
      if (this.state.systemMetrics.cpu.usage > this.config.alerts.threshold.cpuUsage) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'warning',
          component: 'system',
          message: `High CPU usage: ${this.state.systemMetrics.cpu.usage.toFixed(1)}%`,
          severity: 'medium',
          resolved: false
        });
      }

      // Check for high memory usage
      if (this.state.systemMetrics.memory.usage > this.config.alerts.threshold.memoryUsage) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'warning',
          component: 'system',
          message: `High memory usage: ${this.state.systemMetrics.memory.usage.toFixed(1)}%`,
          severity: 'medium',
          resolved: false
        });
      }

      // Check for failed daemons
      const failedDaemons = this.state.daemonHealth.filter(d => d.status === 'failed');
      if (failedDaemons.length > 0) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'error',
          component: 'daemons',
          message: `${failedDaemons.length} daemon(s) failed: ${failedDaemons.map(d => d.name).join(', ')}`,
          severity: 'high',
          resolved: false
        });
      }

      // Check for clock drift
      if (Math.abs(this.state.heartbeatStatus.clockDrift) > 30) {
        anomalies.push({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'warning',
          component: 'heartbeat',
          message: `Clock drift detected: ${this.state.heartbeatStatus.clockDrift}s`,
          severity: 'medium',
          resolved: false
        });
      }

      // Check for high error rate in GPT traces
      const recentTraces = this.state.gptRelayTraces.slice(-20);
      if (recentTraces.length > 0) {
        const errorRate = recentTraces.filter(t => !t.success).length / recentTraces.length;
        if (errorRate > this.config.alerts.threshold.errorRate / 100) {
          anomalies.push({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            type: 'error',
            component: 'gpt-relay',
            message: `High GPT relay error rate: ${(errorRate * 100).toFixed(1)}%`,
            severity: 'high',
            resolved: false
          });
        }
      }
    } catch (error) {
      this.logEvent('anomaly_error', `Failed to detect anomalies: ${error}`);
    }
    
    return anomalies;
  }

  private calculateOverallHealth(): 'excellent' | 'good' | 'degraded' | 'critical' {
    const failedDaemons = this.state.daemonHealth.filter(d => d.status === 'failed').length;
    const totalDaemons = this.state.daemonHealth.length;
    
    if (totalDaemons === 0) return 'excellent';
    
    const failureRate = failedDaemons / totalDaemons;
    
    if (failureRate === 0 && this.state.systemMetrics.cpu.usage < 50) {
      return 'excellent';
    } else if (failureRate < 0.25 && this.state.systemMetrics.cpu.usage < 80) {
      return 'good';
    } else if (failureRate < 0.5 && this.state.systemMetrics.cpu.usage < 90) {
      return 'degraded';
    } else {
      return 'critical';
    }
  }

  private async updateDashboardState(): Promise<void> {
    try {
      this.state.daemonHealth = await this.collectDaemonHealth();
      this.state.gptRelayTraces = await this.collectGptRelayTraces();
      this.state.patchQueueStatus = await this.collectPatchQueueStatus();
      this.state.heartbeatStatus = await this.collectHeartbeatStatus();
      this.state.systemMetrics = await this.collectSystemMetrics();
      
      // Detect and add new anomalies
      const newAnomalies = await this.detectAnomalies();
      this.state.anomalies.push(...newAnomalies);
      
      // Maintain anomaly history
      if (this.state.anomalies.length > this.maxAnomalyHistory) {
        this.state.anomalies = this.state.anomalies.slice(-this.maxAnomalyHistory);
      }
      
      this.state.overallHealth = this.calculateOverallHealth();
      this.state.timestamp = new Date().toISOString();
      this.state.lastUpdate = new Date().toISOString();
      
      this.saveState();
    } catch (error) {
      this.logEvent('update_error', `Failed to update dashboard state: ${error}`);
    }
  }

  private saveState(): void {
    try {
      fs.writeFileSync(dashboardStatePath, JSON.stringify(this.state, null, 2));
    } catch (error) {
      this.logEvent('state_error', `Failed to save state: ${error}`);
    }
  }

  private logEvent(message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component: 'telemetry-dashboard',
      message,
      data
    };
    
    fs.appendFileSync(telemetryLogPath, JSON.stringify(logEntry) + '\n');
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.logEvent('system_startup', 'info');

    const updateLoop = async () => {
      while (this.isRunning) {
        try {
          await this.updateDashboardState();
          await new Promise(resolve => setTimeout(resolve, this.updateInterval));
        } catch (error) {
          this.logEvent('loop_error', `Update loop error: ${error}`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };

    updateLoop().catch(error => {
      this.logEvent('fatal_error', `Fatal error in update loop: ${error}`);
    });
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    this.logEvent('system_shutdown', 'info');
  }

  public getState(): DashboardState {
    return { ...this.state };
  }

  public getConfig(): DashboardConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.logEvent('config_update', 'newConfig');
  }

  public isHealthy(): boolean {
    return this.state.overallHealth === 'excellent' || this.state.overallHealth === 'good';
  }
}

// Global instance
let dashboardInstance: GhostTelemetryDashboard | null = null;

export async function startGhostTelemetryDashboard(): Promise<void> {
  if (!dashboardInstance) {
    dashboardInstance = new GhostTelemetryDashboard();
  }
  await dashboardInstance.start();
}

export async function stopGhostTelemetryDashboard(): Promise<void> {
  if (dashboardInstance) {
    await dashboardInstance.stop();
  }
}

export function getGhostTelemetryDashboard(): GhostTelemetryDashboard {
  if (!dashboardInstance) {
    dashboardInstance = new GhostTelemetryDashboard();
  }
  return dashboardInstance;
}

export type {
  DaemonHealth,
  GptRelayTrace,
  PatchQueueStatus,
  HeartbeatStatus,
  AnomalyReport,
  SystemMetrics,
  DashboardConfig,
  DashboardState
}; 