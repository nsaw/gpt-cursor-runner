import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const decisionLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/autonomous-decisions.log';
const logDir = path.dirname(decisionLogPath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  daemonHealth: { [key: string]: number };
  errorRate: number;
  responseTime: number;
  throughput: number;
}

interface DecisionContext {
  currentMetrics: SystemMetrics;
  historicalMetrics: SystemMetrics[];
  predictedMetrics: SystemMetrics;
  systemState: 'optimal' | 'degraded' | 'critical';
  recommendations: string[];
  confidence: number;
}

interface AutonomousDecision {
  id: string;
  timestamp: string;
  decisionType: 'optimization' | 'scaling' | 'healing' | 'prevention';
  action: string;
  reasoning: string;
  expectedImpact: string;
  confidence: number;
  executed: boolean;
  result?: 'success' | 'failure' | 'partial';
  executionTime?: number;
}

interface OptimizationRule {
  name: string;
  condition: (metrics: SystemMetrics) => boolean;
  action: (context: DecisionContext) => Promise<AutonomousDecision>;
  priority: number;
  enabled: boolean;
}

class AutonomousDecisionEngine {
  private metricsHistory: SystemMetrics[] = [];
  private decisions: AutonomousDecision[] = [];
  private optimizationRules: OptimizationRule[] = [];
  private isRunning = false;
  private decisionInterval = 30000; // 30 seconds

  constructor() {
    this.initializeOptimizationRules();
  }

  private initializeOptimizationRules(): void {
    // CPU Optimization Rule
    this.optimizationRules.push({
      name: 'cpu_optimization',
      priority: 1,
      enabled: true,
      condition: (metrics) => metrics.cpuUsage > 80,
      action: async (context) => {
        const decision: AutonomousDecision = {
          id: `cpu_opt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          decisionType: 'optimization',
          action: 'scale_cpu_intensive_processes',
          reasoning: `CPU usage at ${context.currentMetrics.cpuUsage}% exceeds optimal threshold`,
          expectedImpact: 'Reduce CPU usage by 15-20%',
          confidence: 0.85,
          executed: false
        };
        
        await this.executeDecision(decision);
        return decision;
      }
    });

    // Memory Optimization Rule
    this.optimizationRules.push({
      name: 'memory_optimization',
      priority: 2,
      enabled: true,
      condition: (metrics) => metrics.memoryUsage > 85,
      action: async (context) => {
        const decision: AutonomousDecision = {
          id: `mem_opt_${Date.now()}`,
          timestamp: new Date().toISOString(),
          decisionType: 'optimization',
          action: 'optimize_memory_allocation',
          reasoning: `Memory usage at ${context.currentMetrics.memoryUsage}% requires optimization`,
          expectedImpact: 'Free up 10-15% memory',
          confidence: 0.80,
          executed: false
        };
        
        await this.executeDecision(decision);
        return decision;
      }
    });

    // Predictive Healing Rule
    this.optimizationRules.push({
      name: 'predictive_healing',
      priority: 3,
      enabled: true,
      condition: (metrics) => metrics.errorRate > 5 || this.detectFailurePattern(metrics),
      action: async (context) => {
        const decision: AutonomousDecision = {
          id: `heal_${Date.now()}`,
          timestamp: new Date().toISOString(),
          decisionType: 'healing',
          action: 'preventive_daemon_restart',
          reasoning: 'Detected potential failure pattern, initiating preventive measures',
          expectedImpact: 'Prevent system failure and maintain stability',
          confidence: 0.75,
          executed: false
        };
        
        await this.executeDecision(decision);
        return decision;
      }
    });

    // Performance Scaling Rule
    this.optimizationRules.push({
      name: 'performance_scaling',
      priority: 4,
      enabled: true,
      condition: (metrics) => metrics.responseTime > 1000 || metrics.throughput < 50,
      action: async (context) => {
        const decision: AutonomousDecision = {
          id: `scale_${Date.now()}`,
          timestamp: new Date().toISOString(),
          decisionType: 'scaling',
          action: 'scale_system_resources',
          reasoning: `Performance metrics indicate need for scaling (RT: ${context.currentMetrics.responseTime}ms, TP: ${context.currentMetrics.throughput})`,
          expectedImpact: 'Improve response time by 30-40%',
          confidence: 0.90,
          executed: false
        };
        
        await this.executeDecision(decision);
        return decision;
      }
    });
  }

  private async collectSystemMetrics(): Promise<SystemMetrics> {
    try {
      // Collect CPU usage
      const { stdout: cpuOutput } = await execAsync("top -l 1 | grep 'CPU usage' | awk '{print $3}' | sed 's/%//'");
      const cpuUsage = parseFloat(cpuOutput.trim()) || 0;

      // Collect memory usage
      const { stdout: memOutput } = await execAsync("vm_stat | grep 'Pages free:' | awk '{print $3}' | sed 's/\\.//'");
      const freePages = parseInt(memOutput.trim()) || 0;
      const memoryUsage = Math.max(0, 100 - (freePages / 1000));

      // Collect disk usage
      const { stdout: diskOutput } = await execAsync("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
      const diskUsage = parseFloat(diskOutput.trim()) || 0;

      // Collect network latency
      const { stdout: pingOutput } = await execAsync("ping -c 1 8.8.8.8 | grep 'time=' | awk '{print $7}' | sed 's/time=//'");
      const networkLatency = parseFloat(pingOutput.trim()) || 0;

      // Collect daemon health scores
      const daemonHealth: { [key: string]: number } = {};
      const daemonNames = ['ghostSentinelGuard', 'ghostWatchdogLoop', 'ghostExecutorUnifier', 'ghostSelfCheckCore', 'ghostLifecycleGovernor'];
      
      for (const daemon of daemonNames) {
        try {
          const { stdout } = await execAsync(`ps aux | grep -E '${daemon}\\.ts|${daemon}\\.js' | grep -v grep | wc -l`);
          daemonHealth[daemon] = parseInt(stdout.trim()) > 0 ? 100 : 0;
        } catch {
          daemonHealth[daemon] = 0;
        }
      }

      // Calculate error rate from logs
      const errorRate = await this.calculateErrorRate();

      // Calculate response time and throughput
      const responseTime = await this.measureResponseTime();
      const throughput = await this.calculateThroughput();

      const metrics: SystemMetrics = {
        timestamp: new Date().toISOString(),
        cpuUsage,
        memoryUsage,
        diskUsage,
        networkLatency,
        daemonHealth,
        errorRate,
        responseTime,
        throughput
      };

      return metrics;
    } catch (error) {
      console.error('[AutonomousDecisionEngine] Error collecting metrics:', error);
      throw error;
    }
  }

  private async calculateErrorRate(): Promise<number> {
    try {
      const { stdout } = await execAsync(`grep -c 'ERROR\\|CRITICAL' ${logDir}/*.log 2>/dev/null || echo '0'`);
      const errorCount = parseInt(stdout.trim()) || 0;
      const { stdout: totalOutput } = await execAsync(`wc -l ${logDir}/*.log 2>/dev/null | tail -1 | awk '{print $1}' || echo '1'`);
      const totalLines = parseInt(totalOutput.trim()) || 1;
      return (errorCount / totalLines) * 100;
    } catch {
      return 0;
    }
  }

  private async measureResponseTime(): Promise<number> {
    try {
      const startTime = Date.now();
      await execAsync('curl -s http://localhost:8787/health > /dev/null', { timeout: 5000 });
      return Date.now() - startTime;
    } catch {
      return 9999; // High value indicates failure
    }
  }

  private async calculateThroughput(): Promise<number> {
    try {
      const { stdout } = await execAsync(`grep -c 'PATCH.*COMPLETED' ${logDir}/*.log 2>/dev/null || echo '0'`);
      const completedPatches = parseInt(stdout.trim()) || 0;
      return completedPatches; // Simplified throughput calculation
    } catch {
      return 0;
    }
  }

  private detectFailurePattern(metrics: SystemMetrics): boolean {
    // Analyze recent metrics for failure patterns
    if (this.metricsHistory.length < 5) return false;
    
    const recentMetrics = this.metricsHistory.slice(-5);
    const increasingErrors = recentMetrics.every((m, i) => 
      i === 0 || m.errorRate > recentMetrics[i - 1].errorRate
    );
    
    const degradingPerformance = recentMetrics.every((m, i) => 
      i === 0 || m.responseTime > recentMetrics[i - 1].responseTime
    );
    
    return increasingErrors || degradingPerformance;
  }

  private async executeDecision(decision: AutonomousDecision): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`[AutonomousDecisionEngine] Executing decision: ${decision.action}`);
      
      switch (decision.action) {
        case 'scale_cpu_intensive_processes':
          await this.scaleCPUIntensiveProcesses();
          break;
        case 'optimize_memory_allocation':
          await this.optimizeMemoryAllocation();
          break;
        case 'preventive_daemon_restart':
          await this.preventiveDaemonRestart();
          break;
        case 'scale_system_resources':
          await this.scaleSystemResources();
          break;
        default:
          throw new Error(`Unknown action: ${decision.action}`);
      }
      
      decision.executed = true;
      decision.result = 'success';
      decision.executionTime = Date.now() - startTime;
      
    } catch (error) {
      decision.executed = true;
      decision.result = 'failure';
      decision.executionTime = Date.now() - startTime;
      console.error(`[AutonomousDecisionEngine] Decision execution failed:`, error);
    }
    
    this.decisions.push(decision);
    await this.logDecision(decision);
  }

  private async scaleCPUIntensiveProcesses(): Promise<void> {
    // Implement CPU scaling logic
    await execAsync('pkill -f "node.*heavy" || true');
    await execAsync('nice -n 10 node src-nextgen/ghost/shell/ghostExecutorUnifier.ts &');
  }

  private async optimizeMemoryAllocation(): Promise<void> {
    // Implement memory optimization logic
    await execAsync('node --max-old-space-size=512 src-nextgen/ghost/shell/ghostSelfCheckCore.ts &');
  }

  private async preventiveDaemonRestart(): Promise<void> {
    // Implement preventive restart logic
    const daemons = ['ghostWatchdogLoop', 'ghostExecutorUnifier'];
    for (const daemon of daemons) {
      try {
        await execAsync(`pkill -f ${daemon} || true`);
        await execAsync(`node src-nextgen/ghost/shell/${daemon}.ts &`);
      } catch (error) {
        console.error(`[AutonomousDecisionEngine] Failed to restart ${daemon}:`, error);
      }
    }
  }

  private async scaleSystemResources(): Promise<void> {
    // Implement system resource scaling
    await execAsync('ulimit -n 4096');
    await execAsync('sysctl -w kern.maxfiles=65536');
  }

  private async logDecision(decision: AutonomousDecision): Promise<void> {
    const logEntry = `[${decision.timestamp}] ${decision.decisionType.toUpperCase()}: ${decision.action} - ${decision.reasoning} (Confidence: ${decision.confidence}) - Result: ${decision.result}\n`;
    
    try {
      fs.appendFileSync(decisionLogPath, logEntry);
    } catch (error) {
      console.error('[AutonomousDecisionEngine] Failed to log decision:', error);
    }
  }

  private async analyzeAndDecide(): Promise<void> {
    try {
      const currentMetrics = await this.collectSystemMetrics();
      this.metricsHistory.push(currentMetrics);
      
      // Keep only last 100 metrics
      if (this.metricsHistory.length > 100) {
        this.metricsHistory = this.metricsHistory.slice(-100);
      }

      const context: DecisionContext = {
        currentMetrics,
        historicalMetrics: this.metricsHistory,
        predictedMetrics: this.predictMetrics(currentMetrics),
        systemState: this.determineSystemState(currentMetrics),
        recommendations: [],
        confidence: 0.8
      };

      // Evaluate optimization rules
      const enabledRules = this.optimizationRules
        .filter(rule => rule.enabled)
        .sort((a, b) => a.priority - b.priority);

      for (const rule of enabledRules) {
        if (rule.condition(currentMetrics)) {
          try {
            const decision = await rule.action(context);
            console.log(`[AutonomousDecisionEngine] Executed rule: ${rule.name}`);
          } catch (error) {
            console.error(`[AutonomousDecisionEngine] Rule execution failed: ${rule.name}`, error);
          }
        }
      }

    } catch (error) {
      console.error('[AutonomousDecisionEngine] Analysis failed:', error);
    }
  }

  private predictMetrics(currentMetrics: SystemMetrics): SystemMetrics {
    // Simple linear prediction based on recent trends
    if (this.metricsHistory.length < 3) return currentMetrics;
    
    const recent = this.metricsHistory.slice(-3);
    const cpuTrend = (recent[2].cpuUsage - recent[0].cpuUsage) / 2;
    const memTrend = (recent[2].memoryUsage - recent[0].memoryUsage) / 2;
    
    return {
      ...currentMetrics,
      timestamp: new Date(Date.now() + 30000).toISOString(), // 30 seconds in future
      cpuUsage: Math.max(0, Math.min(100, currentMetrics.cpuUsage + cpuTrend)),
      memoryUsage: Math.max(0, Math.min(100, currentMetrics.memoryUsage + memTrend))
    };
  }

  private determineSystemState(metrics: SystemMetrics): 'optimal' | 'degraded' | 'critical' {
    const criticalThresholds = {
      cpu: 90,
      memory: 95,
      disk: 95,
      errorRate: 10
    };

    const warningThresholds = {
      cpu: 70,
      memory: 80,
      disk: 85,
      errorRate: 5
    };

    if (metrics.cpuUsage > criticalThresholds.cpu ||
        metrics.memoryUsage > criticalThresholds.memory ||
        metrics.diskUsage > criticalThresholds.disk ||
        metrics.errorRate > criticalThresholds.errorRate) {
      return 'critical';
    }

    if (metrics.cpuUsage > warningThresholds.cpu ||
        metrics.memoryUsage > warningThresholds.memory ||
        metrics.diskUsage > warningThresholds.disk ||
        metrics.errorRate > warningThresholds.errorRate) {
      return 'degraded';
    }

    return 'optimal';
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[AutonomousDecisionEngine] Starting autonomous decision engine...');
    
    // Initial analysis
    await this.analyzeAndDecide();
    
    // Start periodic analysis
    setInterval(async () => {
      if (this.isRunning) {
        await this.analyzeAndDecide();
      }
    }, this.decisionInterval);
  }

  public async stop(): Promise<void> {
    this.isRunning = false;
    console.log('[AutonomousDecisionEngine] Stopping autonomous decision engine...');
  }

  public getMetricsHistory(): SystemMetrics[] {
    return [...this.metricsHistory];
  }

  public getDecisions(): AutonomousDecision[] {
    return [...this.decisions];
  }

  public getSystemState(): 'optimal' | 'degraded' | 'critical' | 'unknown' {
    if (this.metricsHistory.length === 0) return 'unknown';
    return this.determineSystemState(this.metricsHistory[this.metricsHistory.length - 1]);
  }
}

// Export singleton instance
export const autonomousDecisionEngine = new AutonomousDecisionEngine();

export async function startAutonomousDecisionEngine(): Promise<void> {
  await autonomousDecisionEngine.start();
}

export async function stopAutonomousDecisionEngine(): Promise<void> {
  await autonomousDecisionEngine.stop();
}

export function getAutonomousDecisionEngine(): AutonomousDecisionEngine {
  return autonomousDecisionEngine;
}

export { AutonomousDecisionEngine };
