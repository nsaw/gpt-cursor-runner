import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const aggregatorLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/health-aggregator.log';
const healthStatePath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/health/health-state.json';
const dependencyMapPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/health/dependency-map.json';
const configPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/health-config.json';
const logDir = path.dirname(aggregatorLogPath);

// Ensure directories exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}
if (!fs.existsSync(path.dirname(healthStatePath))) {
  fs.mkdirSync(path.dirname(healthStatePath), { recursive: true });
}
if (!fs.existsSync(path.dirname(configPath))) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
}

interface ComponentHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'critical' | 'failed' | 'unknown';
  healthScore: number; // 0-100
  lastCheck: string;
  responseTime: number;
  errorRate: number;
  throughput: number;
  resourceUsage: {
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  };
  metrics: {
    uptime: number;
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
  };
  alerts: HealthAlert[];
  dependencies: string[];
  dependents: string[];
}

interface HealthAlert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  component: string;
  metric: string;
  value: number;
  threshold: number;
  acknowledged: boolean;
}

interface DependencyNode {
  id: string;
  name: string;
  type: 'component' | 'service' | 'external';
  health: ComponentHealth;
  dependencies: string[];
  dependents: string[];
  criticality: 'low' | 'medium' | 'high' | 'critical';
  failureImpact: string[];
}

interface SystemHealth {
  timestamp: string;
  overallScore: number;
  status: 'healthy' | 'degraded' | 'critical' | 'failed';
  components: Map<string, ComponentHealth>;
  alerts: HealthAlert[];
  dependencies: Map<string, DependencyNode>;
  predictions: HealthPrediction[];
  recommendations: string[];
}

interface HealthPrediction {
  id: string;
  component: string;
  prediction: 'stable' | 'degrading' | 'failing' | 'recovering';
  confidence: number;
  timeToFailure?: number;
  timeToRecovery?: number;
  factors: string[];
  timestamp: string;
}

interface AggregatorConfig {
  monitoring: {
    enabled: boolean;
    checkInterval: number;
    timeout: number;
    maxConcurrentChecks: number;
  };
  scoring: {
    enabled: boolean;
    weights: {
      responseTime: number;
      errorRate: number;
      throughput: number;
      resourceUsage: number;
      uptime: number;
    };
    thresholds: {
      healthy: number;
      degraded: number;
      critical: number;
    };
  };
  dependencies: {
    enabled: boolean;
    autoDiscovery: boolean;
    cascadeDetection: boolean;
    impactAnalysis: boolean;
  };
  prediction: {
    enabled: boolean;
    historicalDataPoints: number;
    predictionWindow: number;
    confidenceThreshold: number;
  };
  routing: {
    enabled: boolean;
    healthBasedRouting: boolean;
    loadBalancing: boolean;
    failover: boolean;
  };
  dashboard: {
    enabled: boolean;
    realTimeUpdates: boolean;
    historicalTrends: boolean;
    alerting: boolean;
  };
}

interface HealthCheckResult {
  component: string;
  success: boolean;
  responseTime: number;
  error?: string;
  metrics?: any;
  timestamp: string;
}

class HealthCheckAggregator {
  private config!: AggregatorConfig;
  private systemHealth!: SystemHealth;
  private healthChecks: Map<string, ComponentHealth> = new Map();
  private dependencyMap: Map<string, DependencyNode> = new Map();
  private healthPredictions: HealthPrediction[] = [];
  private healthAlerts: HealthAlert[] = [];
  private isRunning = false;
  private checkInterval = 30000; // 30 seconds
  private predictionInterval = 300000; // 5 minutes

  constructor() {
    this.loadConfig();
    this.initializeSystemHealth();
    this.initializeDependencyMap();
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
      console.error('[HealthCheckAggregator] Error loading config:', error);
      this.config = this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): AggregatorConfig {
    return {
      monitoring: {
        enabled: true,
        checkInterval: 30000,
        timeout: 10000,
        maxConcurrentChecks: 10
      },
      scoring: {
        enabled: true,
        weights: {
          responseTime: 0.2,
          errorRate: 0.3,
          throughput: 0.2,
          resourceUsage: 0.2,
          uptime: 0.1
        },
        thresholds: {
          healthy: 80,
          degraded: 60,
          critical: 30
        }
      },
      dependencies: {
        enabled: true,
        autoDiscovery: true,
        cascadeDetection: true,
        impactAnalysis: true
      },
      prediction: {
        enabled: true,
        historicalDataPoints: 100,
        predictionWindow: 300000,
        confidenceThreshold: 0.7
      },
      routing: {
        enabled: true,
        healthBasedRouting: true,
        loadBalancing: true,
        failover: true
      },
      dashboard: {
        enabled: true,
        realTimeUpdates: true,
        historicalTrends: true,
        alerting: true
      }
    };
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('[HealthCheckAggregator] Error saving config:', error);
    }
  }

  private initializeSystemHealth(): void {
    this.systemHealth = {
      timestamp: new Date().toISOString(),
      overallScore: 100,
      status: 'healthy',
      components: new Map(),
      alerts: [],
      dependencies: new Map(),
      predictions: [],
      recommendations: []
    };
  }

  private initializeDependencyMap(): void {
    // Initialize with known Ghost components
    const ghostComponents = [
      {
        id: 'ghost-sentinel-guard',
        name: 'Ghost Sentinel Guard',
        type: 'component' as const,
        criticality: 'critical' as const,
        dependencies: [],
        dependents: ['ghost-watchdog-loop', 'ghost-executor-unifier']
      },
      {
        id: 'ghost-watchdog-loop',
        name: 'Ghost Watchdog Loop',
        type: 'component' as const,
        criticality: 'high' as const,
        dependencies: ['ghost-sentinel-guard'],
        dependents: ['ghost-lifecycle-governor']
      },
      {
        id: 'ghost-executor-unifier',
        name: 'Ghost Executor Unifier',
        type: 'component' as const,
        criticality: 'high' as const,
        dependencies: ['ghost-sentinel-guard'],
        dependents: ['ghost-self-check-core']
      },
      {
        id: 'ghost-self-check-core',
        name: 'Ghost Self Check Core',
        type: 'component' as const,
        criticality: 'medium' as const,
        dependencies: ['ghost-executor-unifier'],
        dependents: ['ghost-lifecycle-governor']
      },
      {
        id: 'ghost-lifecycle-governor',
        name: 'Ghost Lifecycle Governor',
        type: 'component' as const,
        criticality: 'critical' as const,
        dependencies: ['ghost-watchdog-loop', 'ghost-self-check-core'],
        dependents: []
      },
      {
        id: 'ghost-gpt-relay-core',
        name: 'Ghost GPT Relay Core',
        type: 'component' as const,
        criticality: 'high' as const,
        dependencies: [],
        dependents: ['cli-gpt-cmd-bridge', 'gpt-feedback-ingestion']
      },
      {
        id: 'cli-gpt-cmd-bridge',
        name: 'CLI GPT Command Bridge',
        type: 'component' as const,
        criticality: 'medium' as const,
        dependencies: ['ghost-gpt-relay-core'],
        dependents: []
      },
      {
        id: 'gpt-feedback-ingestion',
        name: 'GPT Feedback Ingestion',
        type: 'component' as const,
        criticality: 'medium' as const,
        dependencies: ['ghost-gpt-relay-core'],
        dependents: []
      }
    ];

    for (const component of ghostComponents) {
      const dependencyNode: DependencyNode = {
        ...component,
        health: this.createDefaultHealth(component.id, component.name),
        failureImpact: this.calculateFailureImpact(component.id, ghostComponents)
      };
      this.dependencyMap.set(component.id, dependencyNode);
    }
  }

  private createDefaultHealth(id: string, name: string): ComponentHealth {
    return {
      id,
      name,
      status: 'unknown',
      healthScore: 0,
      lastCheck: new Date().toISOString(),
      responseTime: 0,
      errorRate: 0,
      throughput: 0,
      resourceUsage: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: 0
      },
      metrics: {
        uptime: 0,
        requestCount: 0,
        errorCount: 0,
        avgResponseTime: 0
      },
      alerts: [],
      dependencies: [],
      dependents: []
    };
  }

  private calculateFailureImpact(componentId: string, allComponents: any[]): string[] {
    const impact: string[] = [];
    const component = allComponents.find(c => c.id === componentId);
    
    if (component) {
      // Direct dependents
      impact.push(...component.dependents);
      
      // Indirect dependents (recursive)
      for (const dependent of component.dependents) {
        const dependentComponent = allComponents.find(c => c.id === dependent);
        if (dependentComponent) {
          impact.push(...dependentComponent.dependents);
        }
      }
    }
    
    return [...new Set(impact)]; // Remove duplicates
  }

  private async performHealthCheck(componentId: string): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check if process is running
      const { stdout } = await execAsync(`ps aux | grep -E '${componentId}\\.ts|${componentId}\\.js' | grep -v grep | wc -l`);
      const isRunning = parseInt(stdout.trim()) > 0;

      if (!isRunning) {
        return {
          component: componentId,
          success: false,
          responseTime: Date.now() - startTime,
          error: 'Process not running',
          timestamp: new Date().toISOString()
        };
      }

      // Get process metrics
      const { stdout: psOutput } = await execAsync(`ps aux | grep '${componentId}' | grep -v grep | head -1`);
      const metrics = this.parseProcessMetrics(psOutput);

      return {
        component: componentId,
        success: true,
        responseTime: Date.now() - startTime,
        metrics,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        component: componentId,
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  private parseProcessMetrics(psOutput: string): any {
    try {
      const parts = psOutput.trim().split(/\s+/);
      if (parts.length >= 11) {
        return {
          cpu: parseFloat(parts[2]) || 0,
          memory: parseFloat(parts[3]) || 0,
          pid: parts[1],
          command: parts.slice(10).join(' ')
        };
      }
      return { cpu: 0, memory: 0, pid: 'unknown', command: 'unknown' };
    } catch (_error) {
      return { cpu: 0, memory: 0, pid: 'unknown', command: 'unknown' };
    }
  }

  private calculateHealthScore(component: ComponentHealth): number {
    if (!this.config.scoring.enabled) return 100;

    const weights = this.config.scoring.weights;
    let score = 0;

    // Response time score (lower is better)
    const responseTimeScore = Math.max(0, 100 - (component.responseTime / 1000) * 10);
    score += responseTimeScore * weights.responseTime;

    // Error rate score (lower is better)
    const errorRateScore = Math.max(0, 100 - component.errorRate * 100);
    score += errorRateScore * weights.errorRate;

    // Throughput score (higher is better)
    const throughputScore = Math.min(100, component.throughput / 10);
    score += throughputScore * weights.throughput;

    // Resource usage score (lower is better)
    const resourceScore = Math.max(0, 100 - (component.resourceUsage.cpu + component.resourceUsage.memory) / 2);
    score += resourceScore * weights.resourceUsage;

    // Uptime score (higher is better)
    const uptimeScore = Math.min(100, (component.metrics.uptime / 3600) * 10);
    score += uptimeScore * weights.uptime;

    return Math.round(score);
  }

  private determineStatus(healthScore: number): 'healthy' | 'degraded' | 'critical' | 'failed' {
    const thresholds = this.config.scoring.thresholds;
    
    if (healthScore >= thresholds.healthy) return 'healthy';
    if (healthScore >= thresholds.degraded) return 'degraded';
    if (healthScore >= thresholds.critical) return 'critical';
    return 'failed';
  }

  private async checkDependencies(componentId: string): Promise<string[]> {
    const dependencies: string[] = [];
    const node = this.dependencyMap.get(componentId);
    
    if (node) {
      for (const depId of node.dependencies) {
        const depHealth = this.healthChecks.get(depId);
        if (depHealth && depHealth.status !== 'healthy') {
          dependencies.push(depId);
        }
      }
    }
    
    return dependencies;
  }

  private async detectCascadingFailures(): Promise<void> {
    if (!this.config.dependencies.cascadeDetection) return;

    for (const [componentId, health] of this.healthChecks.entries()) {
      if (health.status === 'failed' || health.status === 'critical') {
        const node = this.dependencyMap.get(componentId);
        if (node) {
          // Check dependents for cascade effects
          for (const dependentId of node.dependents) {
            const dependentHealth = this.healthChecks.get(dependentId);
            if (dependentHealth && dependentHealth.status === 'healthy') {
              // Potential cascade - create alert
              this.createAlert(
                dependentId,
                'warning',
                `Potential cascade failure from ${componentId}`,
                'dependency',
                0,
                0
              );
            }
          }
        }
      }
    }
  }

  private async predictHealth(): Promise<void> {
    if (!this.config.prediction.enabled) return;

    for (const [componentId, health] of this.healthChecks.entries()) {
      const prediction = await this.predictComponentHealth(componentId, health);
      if (prediction) {
        this.healthPredictions.push(prediction);
      }
    }

    // Clean up old predictions
    const cutoffTime = Date.now() - this.config.prediction.predictionWindow;
    this.healthPredictions = this.healthPredictions.filter(p => 
      new Date(p.timestamp).getTime() > cutoffTime
    );
  }

  private async predictComponentHealth(componentId: string, health: ComponentHealth): Promise<HealthPrediction | null> {
    try {
      // Simple prediction based on trends
      const recentHealth = Array.from(this.healthChecks.values())
        .filter(h => h.id === componentId)
        .slice(-5);

      if (recentHealth.length < 3) return null;

      const scores = recentHealth.map(h => h.healthScore);
      const trend = this.calculateTrend(scores);
      
      let prediction: 'stable' | 'degrading' | 'failing' | 'recovering';
      let confidence = 0.5;
      let timeToFailure: number | undefined;
      const factors: string[] = [];

      if (trend > 0.1) {
        prediction = 'recovering';
        confidence = Math.min(0.9, 0.5 + trend * 2);
        factors.push('Improving health score trend');
      } else if (trend < -0.1) {
        prediction = 'degrading';
        confidence = Math.min(0.9, 0.5 + Math.abs(trend) * 2);
        factors.push('Declining health score trend');
        
        // Estimate time to failure
        if (health.healthScore > 0) {
          timeToFailure = Math.round(health.healthScore / Math.abs(trend) * 60000); // milliseconds
        }
      } else {
        prediction = 'stable';
        confidence = 0.8;
        factors.push('Stable health score trend');
      }

      // Add additional factors
      if (health.errorRate > 5) factors.push('High error rate');
      if (health.resourceUsage.cpu > 80) factors.push('High CPU usage');
      if (health.resourceUsage.memory > 80) factors.push('High memory usage');

      return {
        id: `pred_${componentId}_${Date.now()}`,
        component: componentId,
        prediction,
        confidence,
        timeToFailure,
        factors,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`[HealthCheckAggregator] Error predicting health for ${componentId}:`, error);
      return null;
    }
  }

  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumX2 = values.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  private createAlert(
    component: string,
    severity: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    metric: string,
    value: number,
    threshold: number
  ): void {
    const alert: HealthAlert = {
      id: `alert_${component}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      severity,
      message,
      component,
      metric,
      value,
      threshold,
      acknowledged: false
    };

    this.healthAlerts.push(alert);
    
    // Log alert
    const logEntry = `[${alert.timestamp}] ALERT: ${severity.toUpperCase()} | ${component} | ${message} | ${metric}: ${value}/${threshold}\n`;
    fs.appendFileSync(aggregatorLogPath, logEntry);
  }

  private async updateSystemHealth(): Promise<void> {
    // Calculate overall system health
    const components = Array.from(this.healthChecks.values());
    if (components.length === 0) return;

    const totalScore = components.reduce((sum, comp) => sum + comp.healthScore, 0);
    const avgScore = totalScore / components.length;

    this.systemHealth.overallScore = Math.round(avgScore);
    this.systemHealth.status = this.determineStatus(avgScore);
    this.systemHealth.timestamp = new Date().toISOString();
    this.systemHealth.components = this.healthChecks;
    this.systemHealth.alerts = this.healthAlerts;
    this.systemHealth.dependencies = this.dependencyMap;
    this.systemHealth.predictions = this.healthPredictions;

    // Generate recommendations
    this.systemHealth.recommendations = this.generateRecommendations();

    // Save health state
    await this.saveHealthState();
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const criticalComponents = Array.from(this.healthChecks.values())
      .filter(comp => comp.status === 'critical' || comp.status === 'failed');

    if (criticalComponents.length > 0) {
      recommendations.push(`Immediate attention required for ${criticalComponents.length} critical components`);
    }

    const degradingComponents = this.healthPredictions.filter(p => p.prediction === 'degrading');
    if (degradingComponents.length > 0) {
      recommendations.push(`Monitor ${degradingComponents.length} components showing degradation trends`);
    }

    const highErrorComponents = Array.from(this.healthChecks.values())
      .filter(comp => comp.errorRate > 10);
    if (highErrorComponents.length > 0) {
      recommendations.push(`Investigate high error rates in ${highErrorComponents.length} components`);
    }

    return recommendations;
  }

  private async saveHealthState(): Promise<void> {
    try {
      const healthState = {
        systemHealth: this.systemHealth,
        healthChecks: Object.fromEntries(this.healthChecks),
        dependencyMap: Object.fromEntries(this.dependencyMap),
        predictions: this.healthPredictions,
        alerts: this.healthAlerts,
        timestamp: new Date().toISOString()
      };

      fs.writeFileSync(healthStatePath, JSON.stringify(healthState, null, 2));
    } catch (error) {
      console.error('[HealthCheckAggregator] Error saving health state:', error);
    }
  }

  private async performAllHealthChecks(): Promise<void> {
    try {
      const componentIds = Array.from(this.dependencyMap.keys());
      const checkPromises = componentIds.map(id => this.performHealthCheck(id));
      
      const results = await Promise.all(checkPromises);
      
      for (const result of results) {
        const node = this.dependencyMap.get(result.component);
        if (node) {
          const health = node.health;
          
          // Update health metrics
          health.lastCheck = result.timestamp;
          health.responseTime = result.responseTime;
          
          if (result.success) {
            health.status = 'healthy';
            if (result.metrics) {
              health.resourceUsage.cpu = result.metrics.cpu || 0;
              health.resourceUsage.memory = result.metrics.memory || 0;
            }
          } else {
            health.status = 'failed';
            health.errorRate = 100;
          }

          // Calculate health score
          health.healthScore = this.calculateHealthScore(health);
          health.status = this.determineStatus(health.healthScore);

          // Check for alerts
          if (health.healthScore < this.config.scoring.thresholds.critical) {
            this.createAlert(
              result.component,
              'critical',
              `Health score critical: ${health.healthScore}`,
              'healthScore',
              health.healthScore,
              this.config.scoring.thresholds.critical
            );
          } else if (health.healthScore < this.config.scoring.thresholds.degraded) {
            this.createAlert(
              result.component,
              'warning',
              `Health score degraded: ${health.healthScore}`,
              'healthScore',
              health.healthScore,
              this.config.scoring.thresholds.degraded
            );
          }

          // Update health checks map
          this.healthChecks.set(result.component, health);
        }
      }

      // Update dependencies
      for (const [componentId, health] of this.healthChecks.entries()) {
        health.dependencies = await this.checkDependencies(componentId);
      }

      // Detect cascading failures
      await this.detectCascadingFailures();

      // Update system health
      await this.updateSystemHealth();

    } catch (error) {
      console.error('[HealthCheckAggregator] Error performing health checks:', error);
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[HealthCheckAggregator] Starting health check aggregator...');
    
    // Initial health check
    await this.performAllHealthChecks();
    
    // Start periodic health checks
    setInterval(async () => {
      if (this.isRunning) {
        await this.performAllHealthChecks();
      }
    }, this.checkInterval);

    // Start health predictions
    setInterval(async () => {
      if (this.isRunning) {
        await this.predictHealth();
      }
    }, this.predictionInterval);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[HealthCheckAggregator] Stopping health check aggregator...');
  }

  public getSystemHealth(): SystemHealth {
    return { ...this.systemHealth };
  }

  public getComponentHealth(componentId: string): ComponentHealth | undefined {
    return this.healthChecks.get(componentId);
  }

  public getAllComponents(): Map<string, ComponentHealth> {
    return new Map(this.healthChecks);
  }

  public getDependencyMap(): Map<string, DependencyNode> {
    return new Map(this.dependencyMap);
  }

  public getHealthPredictions(): HealthPrediction[] {
    return [...this.healthPredictions];
  }

  public getHealthAlerts(): HealthAlert[] {
    return [...this.healthAlerts];
  }

  public getConfig(): AggregatorConfig {
    return { ...this.config };
  }

  public updateConfig(newConfig: Partial<AggregatorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  public async forceHealthCheck(componentId: string): Promise<HealthCheckResult> {
    return await this.performHealthCheck(componentId);
  }

  public acknowledgeAlert(alertId: string): void {
    const alert = this.healthAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }
}

// Export singleton instance
export const healthCheckAggregator = new HealthCheckAggregator();

export async function startHealthCheckAggregator(): Promise<void> {
  await healthCheckAggregator.start();
}

export async function stopHealthCheckAggregator(): Promise<void> {
  await healthCheckAggregator.stop();
}

export function getHealthCheckAggregator(): HealthCheckAggregator {
  return healthCheckAggregator;
}

export { HealthCheckAggregator }; 