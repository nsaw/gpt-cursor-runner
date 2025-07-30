import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const healerLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/autopilot-healer.log';
const healerStatePath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/healer/healer-state.json';
const configPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/healer-config.json';
const logDir = path.dirname(healerLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(healerStatePath))) {
  fs.mkdirSync(path.dirname(healerStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface HealingAction {
  id: string;
  timestamp: string;
  component: string;
  action: 'restart' | 'reconfigure' | 'rollback' | 'scale' | 'cleanup';
  reason: string;
  success: boolean;
  error?: string;
  executionTime: number;
  retryCount: number;
  maxRetries: number;
}

interface ComponentHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'critical' | 'failed' | 'unknown';
  lastCheck: string;
  restartCount: number;
  lastRestart: string;
  failurePattern: string[];
  cooldownUntil?: string;
  inhibited: boolean;
  inhibitionReason?: string;
}

interface HealerConfig {
  safety: {
    enabled: boolean;
    maxRestartsPerComponent: number;
    maxRestartsPerHour: number;
    cooldownPeriodMs: number;
    inhibitionEnabled: boolean;
    watchdogCompatible: boolean;
  };
  actions: {
    restart: {
      enabled: boolean;
      maxRetries: number;
      retryDelayMs: number;
      backoffMultiplier: number;
    };
    reconfigure: {
      enabled: boolean;
      maxRetries: number;
      retryDelayMs: number;
    };
    rollback: {
      enabled: boolean;
      maxRetries: number;
      retryDelayMs: number;
    };
    scale: {
      enabled: boolean;
      maxRetries: number;
      retryDelayMs: number;
    };
    cleanup: {
      enabled: boolean;
      maxRetries: number;
      retryDelayMs: number;
    };
  };
  monitoring: {
    enabled: boolean;
    checkIntervalMs: number;
    logAllActions: boolean;
    metricsCollection: boolean;
  };
  inhibition: {
    configBasedFailures: boolean;
    resourceExhaustion: boolean;
    externalDependencies: boolean;
    manualOverride: boolean;
  };
}

interface HealerMetrics {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  inhibitedActions: number;
  averageExecutionTime: number;
  lastActionTime: string;
  uptime: number;
  componentsMonitored: number;
  componentsInhibited: number;
}

class GhostAutopilotHealer {
  private config!: HealerConfig;
  private metrics!: HealerMetrics;
  private componentHealth: Map<string, ComponentHealth> = new Map();
  private healingActions: HealingAction[] = [];
  private isRunning = false;
  private checkInterval = 30000; // 30 seconds
  private globalRestartCount = 0;
  private lastGlobalRestart = new Date(0);

  constructor() {
    this.loadConfig();
    this.initializeMetrics();
    this.initializeComponentHealth();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(configPath)) {
        this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      } else {
        this.config = this.getDefaultConfig();
        this.saveConfig();
      }
    } catch (error) {
      console.error('[GhostAutopilotHealer] Error loading config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): HealerConfig {
    return {
      safety: {
        enabled: true,
        maxRestartsPerComponent: 5,
        maxRestartsPerHour: 20,
        cooldownPeriodMs: 300000, // 5 minutes
        inhibitionEnabled: true,
        watchdogCompatible: true
      },
      actions: {
        restart: {
          enabled: true,
          maxRetries: 3,
          retryDelayMs: 5000,
          backoffMultiplier: 2
        },
        reconfigure: {
          enabled: true,
          maxRetries: 2,
          retryDelayMs: 10000
        },
        rollback: {
          enabled: true,
          maxRetries: 2,
          retryDelayMs: 15000
        },
        scale: {
          enabled: true,
          maxRetries: 2,
          retryDelayMs: 20000
        },
        cleanup: {
          enabled: true,
          maxRetries: 3,
          retryDelayMs: 5000
        }
      },
      monitoring: {
        enabled: true,
        checkIntervalMs: 30000,
        logAllActions: true,
        metricsCollection: true
      },
      inhibition: {
        configBasedFailures: true,
        resourceExhaustion: true,
        externalDependencies: true,
        manualOverride: true
      }
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('[GhostAutopilotHealer] Error saving config:', error);
    }
  }

  private initializeMetrics(): void {
    this.metrics = {
      totalActions: 0,
      successfulActions: 0,
      failedActions: 0,
      inhibitedActions: 0,
      averageExecutionTime: 0,
      lastActionTime: new Date().toISOString(),
      uptime: 0,
      componentsMonitored: 0,
      componentsInhibited: 0
    };
  }

  private initializeComponentHealth(): void {
    const ghostComponents = [
      'ghostSentinelGuard',
      'ghostWatchdogLoop',
      'ghostExecutorUnifier',
      'ghostSelfCheckCore',
      'ghostLifecycleGovernor',
      'ghostGptRelayCore',
      'configurationValidationEngine',
      'messageQueueSystem',
      'healthCheckAggregator'
    ];

    for (const component of ghostComponents) {
      this.componentHealth.set(component, {
        id: component,
        name: component,
        status: 'unknown',
        lastCheck: new Date().toISOString(),
        restartCount: 0,
        lastRestart: new Date(0).toISOString(),
        failurePattern: [],
        inhibited: false
      });
    }
  }

  private async checkComponentHealth(componentId: string): Promise<ComponentHealth> {
    const health = this.componentHealth.get(componentId) || {
      id: componentId,
      name: componentId,
      status: 'unknown',
      lastCheck: new Date().toISOString(),
      restartCount: 0,
      lastRestart: new Date(0).toISOString(),
      failurePattern: [],
      inhibited: false
    };

    try {
      // Check if process is running
      const { stdout } = await execAsync(`ps aux | grep -E '${componentId}\\.ts|${componentId}\\.js' | grep -v grep | wc -l`);
      const isRunning = parseInt(stdout.trim()) > 0;

      if (isRunning) {
        health.status = 'healthy';
      } else {
        health.status = 'failed';
      }

      health.lastCheck = new Date().toISOString();
      this.componentHealth.set(componentId, health);

      return health;
    } catch (_error) {
      health.status = 'failed';
      health.lastCheck = new Date().toISOString();
      this.componentHealth.set(componentId, health);
      return health;
    }
  }

  private isInCooldown(componentId: string): boolean {
    const health = this.componentHealth.get(componentId);
    if (!health || !health.cooldownUntil) return false;

    return new Date() < new Date(health.cooldownUntil);
  }

  private isRestartLimitExceeded(componentId: string): boolean {
    const health = this.componentHealth.get(componentId);
    if (!health) return false;

    // Check per-component limit
    if (health.restartCount >= this.config.safety.maxRestartsPerComponent) {
      return true;
    }

    // Check global limit
    const oneHourAgo = new Date(Date.now() - 3600000);
    if (this.lastGlobalRestart > oneHourAgo && this.globalRestartCount >= this.config.safety.maxRestartsPerHour) {
      return true;
    }

    return false;
  }

  private shouldInhibitHealing(componentId: string, failureReason: string): boolean {
    if (!this.config.safety.inhibitionEnabled) return false;

    const health = this.componentHealth.get(componentId);
    if (!health) return false;

    // Check for config-based failures
    if (this.config.inhibition.configBasedFailures && 
        failureReason.toLowerCase().includes('config')) {
      health.inhibited = true;
      health.inhibitionReason = 'Config-based failure detected';
      return true;
    }

    // Check for resource exhaustion
    if (this.config.inhibition.resourceExhaustion && 
        failureReason.toLowerCase().includes('memory') || 
        failureReason.toLowerCase().includes('cpu')) {
      health.inhibited = true;
      health.inhibitionReason = 'Resource exhaustion detected';
      return true;
    }

    // Check for external dependencies
    if (this.config.inhibition.externalDependencies && 
        failureReason.toLowerCase().includes('network') || 
        failureReason.toLowerCase().includes('api')) {
      health.inhibited = true;
      health.inhibitionReason = 'External dependency failure';
      return true;
    }

    return false;
  }

  private async executeHealingAction(action: HealingAction): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      console.log(`[GhostAutopilotHealer] Executing healing action: ${action.action} for ${action.component}`);

      switch (action.action) {
        case 'restart':
          await this.restartComponent(action.component);
          break;
        case 'reconfigure':
          await this.reconfigureComponent(action.component);
          break;
        case 'rollback':
          await this.rollbackComponent(action.component);
          break;
        case 'scale':
          await this.scaleComponent(action.component);
          break;
        case 'cleanup':
          await this.cleanupComponent(action.component);
          break;
        default:
          throw new Error(`Unknown healing action: ${action.action}`);
      }

      action.success = true;
      action.executionTime = Date.now() - startTime;
      
      this.metrics.successfulActions++;
      this.metrics.averageExecutionTime = 
        (this.metrics.averageExecutionTime + action.executionTime) / 2;

      return true;

    } catch (error) {
      action.success = false;
      action.error = error instanceof Error ? error.message : 'Unknown error';
      action.executionTime = Date.now() - startTime;
      
      this.metrics.failedActions++;

      return false;
    }
  }

  private async restartComponent(componentId: string): Promise<void> {
    const health = this.componentHealth.get(componentId);
    if (!health) throw new Error(`Component ${componentId} not found`);

    // Kill existing process
    await execAsync(`pkill -f ${componentId} || true`);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Restart component
    await execAsync(`node src-nextgen/ghost/${this.getComponentPath(componentId)} &`);

    // Update health metrics
    health.restartCount++;
    health.lastRestart = new Date().toISOString();
    health.cooldownUntil = new Date(Date.now() + this.config.safety.cooldownPeriodMs).toISOString();
    
    this.globalRestartCount++;
    this.lastGlobalRestart = new Date();

    this.componentHealth.set(componentId, health);
  }

  private async reconfigureComponent(componentId: string): Promise<void> {
    // Implement component reconfiguration logic
    await execAsync(`echo "Reconfiguring ${componentId}"`);
  }

  private async rollbackComponent(componentId: string): Promise<void> {
    // Implement component rollback logic
    await execAsync(`echo "Rolling back ${componentId}"`);
  }

  private async scaleComponent(componentId: string): Promise<void> {
    // Implement component scaling logic
    await execAsync(`echo "Scaling ${componentId}"`);
  }

  private async cleanupComponent(componentId: string): Promise<void> {
    // Implement component cleanup logic
    await execAsync(`echo "Cleaning up ${componentId}"`);
  }

  private getComponentPath(componentId: string): string {
    const pathMap: { [key: string]: string } = {
      'ghostSentinelGuard': 'shell/ghostSentinelGuard.ts',
      'ghostWatchdogLoop': 'shell/ghostWatchdogLoop.ts',
      'ghostExecutorUnifier': 'shell/ghostExecutorUnifier.ts',
      'ghostSelfCheckCore': 'shell/ghostSelfCheckCore.ts',
      'ghostLifecycleGovernor': 'shell/ghostLifecycleGovernor.ts',
      'ghostGptRelayCore': 'relay/ghostGptRelayCore.ts',
      'configurationValidationEngine': 'validation/configurationValidationEngine.ts',
      'messageQueueSystem': 'queue/messageQueueSystem.ts',
      'healthCheckAggregator': 'monitoring/healthCheckAggregator.ts'
    };

    return pathMap[componentId] || `shell/${componentId}.ts`;
  }

  private async logAction(action: HealingAction): Promise<void> {
    if (!this.config.monitoring.logAllActions) return;

    const logEntry = `[${action.timestamp}] HEALING: ${action.action.toUpperCase()} | ${action.component} | ${action.success ? 'SUCCESS' : 'FAILED'} | ${action.executionTime}ms | ${action.reason}\n`;
    
    try {
      fs.appendFileSync(healerLogPath, logEntry);
    } catch (error) {
      console.error('[GhostAutopilotHealer] Failed to log action:', error);
    }
  }

  private async analyzeAndHeal(): Promise<void> {
    try {
      const componentIds = Array.from(this.componentHealth.keys());
      
      for (const componentId of componentIds) {
        const health = await this.checkComponentHealth(componentId);
        
        if (health.status === 'failed' || health.status === 'critical') {
          // Check if healing should be inhibited
          if (this.shouldInhibitHealing(componentId, 'Component failure detected')) {
            this.metrics.inhibitedActions++;
            console.log(`[GhostAutopilotHealer] Healing inhibited for ${componentId}: ${health.inhibitionReason}`);
            continue;
          }

          // Check cooldown
          if (this.isInCooldown(componentId)) {
            console.log(`[GhostAutopilotHealer] ${componentId} in cooldown period`);
            continue;
          }

          // Check restart limits
          if (this.isRestartLimitExceeded(componentId)) {
            console.log(`[GhostAutopilotHealer] Restart limit exceeded for ${componentId}`);
            continue;
          }

          // Create healing action
          const action: HealingAction = {
            id: `heal_${componentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            component: componentId,
            action: 'restart',
            reason: `Component ${componentId} is in ${health.status} state`,
            success: false,
            executionTime: 0,
            retryCount: 0,
            maxRetries: this.config.actions.restart.maxRetries
          };

          this.metrics.totalActions++;
          this.metrics.lastActionTime = action.timestamp;

          // Execute healing action
          await this.executeHealingAction(action);
          this.healingActions.push(action);
          await this.logAction(action);
        }
      }

      // Update metrics
      this.metrics.componentsMonitored = componentIds.length;
      this.metrics.componentsInhibited = Array.from(this.componentHealth.values())
        .filter(h => h.inhibited).length;

    } catch (error) {
      console.error('[GhostAutopilotHealer] Error in analyze and heal cycle:', error);
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[GhostAutopilotHealer] Starting autopilot healer...');
    
    // Initial health check
    await this.analyzeAndHeal();
    
    // Start periodic healing
    setInterval(async () => {
      if (this.isRunning) {
        await this.analyzeAndHeal();
      }
    }, this.checkInterval);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[GhostAutopilotHealer] Stopping autopilot healer...');
  }

  public getConfig(): HealerConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<HealerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  public getMetrics(): HealerMetrics {
    return { ...this.metrics };
  }

  public getComponentHealth(): Map<string, ComponentHealth> {
    return new Map(this.componentHealth);
  }

  public getHealingActions(): HealingAction[] {
    return [...this.healingActions];
  }

  public forceHealingAction(componentId: string, action: 'restart' | 'reconfigure' | 'rollback' | 'scale' | 'cleanup'): Promise<boolean> {
    const healingAction: HealingAction = {
      id: `force_${componentId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      component: componentId,
      action,
      reason: 'Manual healing action',
      success: false,
      executionTime: 0,
      retryCount: 0,
      maxRetries: this.config.actions[action].maxRetries
    };

    return this.executeHealingAction(healingAction);
  }

  public clearInhibition(componentId: string): void {
    const health = this.componentHealth.get(componentId);
    if (health) {
      health.inhibited = false;
      health.inhibitionReason = undefined;
      this.componentHealth.set(componentId, health);
    }
  }

  public isHealthy(): boolean {
    return this.isRunning && this.metrics.failedActions / Math.max(this.metrics.totalActions, 1) < 0.2;
  }
}

// Export singleton instance
export const ghostAutopilotHealer = new GhostAutopilotHealer();

export async function startGhostAutopilotHealer(): Promise<void> {
  await ghostAutopilotHealer.start();
}

export async function stopGhostAutopilotHealer(): Promise<void> {
  await ghostAutopilotHealer.stop();
}

export function getGhostAutopilotHealer(): GhostAutopilotHealer {
  return ghostAutopilotHealer;
}

export { GhostAutopilotHealer };
