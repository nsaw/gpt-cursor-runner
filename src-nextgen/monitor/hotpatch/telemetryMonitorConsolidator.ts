// Telemetry Monitor Consolidator - Phase 8 HOT3
// Consolidates dashboard source of truth and triggers daemon lifecycle stress test

import { spawn, exec } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

interface MonitoringEndpoint {
  name: string;
  url: string;
  port: number;
  type: 'telemetry' | 'dashboard' | 'monitor';
  status: 'unknown' | 'healthy' | 'degraded' | 'failed';
  lastCheck: string;
  responseTime?: number;
}

interface DaemonProcess {
  name: string;
  script: string;
  status: 'running' | 'stopped' | 'restarting';
  pid?: number;
  restartCount: number;
  lastRestart: string;
}

interface ConsolidationReport {
  timestamp: string;
  endpoints: MonitoringEndpoint[];
  daemons: DaemonProcess[];
  consolidationActions: string[];
  stressTestResults: {
    cycles: number;
    successfulRestarts: number;
    failedRestarts: number;
    summaryEmission: boolean;
  };
  recommendations: string[];
}

class TelemetryMonitorConsolidator {
  private logPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/telemetry-monitor.log';
  private reportPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/consolidation-report.json';
  private endpoints: MonitoringEndpoint[] = [];
  private daemons: DaemonProcess[] = [];
  private report: ConsolidationReport;

  constructor() {
    this.ensureDirectories();
    this.initializeEndpoints();
    this.initializeDaemons();
    this.report = this.createInitialReport();
    this.logEvent('consolidator_started', 'Telemetry Monitor Consolidator initialized');
  }

  private ensureDirectories(): void {
    const dirs = [
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs',
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry'
    ];
    dirs.forEach(dir => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    });
  }

  private initializeEndpoints(): void {
    this.endpoints = [
      {
        name: 'Telemetry API',
        url: 'http://localhost:8788',
        port: 8788,
        type: 'telemetry',
        status: 'unknown',
        lastCheck: new Date().toISOString()
      },
      {
        name: 'Dual Monitor Server',
        url: 'http://localhost:5001',
        port: 5001,
        type: 'monitor',
        status: 'unknown',
        lastCheck: new Date().toISOString()
      },
      {
        name: 'Flask Dashboard',
        url: 'http://localhost:5001',
        port: 5001,
        type: 'dashboard',
        status: 'unknown',
        lastCheck: new Date().toISOString()
      }
    ];
  }

  private initializeDaemons(): void {
    this.daemons = [
      {
        name: 'ghost-bridge',
        script: 'ghost-bridge.js',
        status: 'running',
        restartCount: 0,
        lastRestart: new Date().toISOString()
      },
      {
        name: 'patch-executor',
        script: 'patch-executor-loop.js',
        status: 'running',
        restartCount: 0,
        lastRestart: new Date().toISOString()
      },
      {
        name: 'summary-monitor',
        script: 'summary-monitor-simple.js',
        status: 'running',
        restartCount: 0,
        lastRestart: new Date().toISOString()
      }
    ];
  }

  private createInitialReport(): ConsolidationReport {
    return {
      timestamp: new Date().toISOString(),
      endpoints: [...this.endpoints],
      daemons: [...this.daemons],
      consolidationActions: [],
      stressTestResults: {
        cycles: 0,
        successfulRestarts: 0,
        failedRestarts: 0,
        summaryEmission: false
      },
      recommendations: []
    };
  }

  private logEvent(event: string, message: string, data?: any): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      message,
      data
    };
    
    try {
      writeFileSync(this.logPath, JSON.stringify(logEntry) + '\n', { flag: 'a' });
    } catch (error) {
      console.error(`Failed to write log: ${error}`);
    }
  }

  private async pingEndpoint(endpoint: MonitoringEndpoint): Promise<MonitoringEndpoint> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const curl = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', endpoint.url]);
      
      let output = '';
      curl.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      curl.stderr.on('data', (data) => {
        this.logEvent('endpoint_error', `Failed to check ${endpoint.name}: ${data.toString()}`);
      });
      
      curl.on('close', (code) => {
        const responseTime = Date.now() - startTime;
        const statusCode = parseInt(output.trim());
        
        let status: 'healthy' | 'degraded' | 'failed' = 'failed';
        if (code === 0 && statusCode === 200) {
          status = responseTime < 1000 ? 'healthy' : 'degraded';
        }
        
        const updatedEndpoint: MonitoringEndpoint = {
          ...endpoint,
          status,
          lastCheck: new Date().toISOString(),
          responseTime
        };
        
        this.logEvent('endpoint_check', `${endpoint.name} → ${status} (${statusCode})`, {
          responseTime,
          statusCode
        });
        
        resolve(updatedEndpoint);
      });
    });
  }

  private async checkProcessStatus(daemon: DaemonProcess): Promise<DaemonProcess> {
    return new Promise((resolve) => {
      const ps = spawn('ps', ['aux']);
      let output = '';
      
      ps.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      ps.on('close', () => {
        const isRunning = output.includes(daemon.script);
        const updatedDaemon: DaemonProcess = {
          ...daemon,
          status: isRunning ? 'running' : 'stopped'
        };
        
        this.logEvent('process_check', `${daemon.name} → ${updatedDaemon.status}`);
        resolve(updatedDaemon);
      });
    });
  }

  private async restartDaemon(daemon: DaemonProcess): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      this.logEvent('daemon_restart_start', `Restarting ${daemon.name}`);
      
      // Kill existing process
      const kill = spawn('pkill', ['-f', daemon.script]);
      
      kill.on('close', (killCode) => {
        setTimeout(() => {
          // Check if process is still running
          const check = spawn('ps', ['aux']);
          let output = '';
          
          check.stdout.on('data', (data) => {
            output += data.toString();
          });
          
          check.on('close', () => {
            const stillRunning = output.includes(daemon.script);
            
            if (stillRunning) {
              this.logEvent('daemon_restart_success', `${daemon.name} restarted successfully`);
              resolve({ success: true });
            } else {
              this.logEvent('daemon_restart_failed', `${daemon.name} failed to restart`);
              resolve({ success: false, error: 'Process not found after restart' });
            }
          });
        }, 2000); // Wait 2 seconds for restart
      });
    });
  }

  private async checkSummaryEmission(): Promise<boolean> {
    try {
      const summaryDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';
      if (!existsSync(summaryDir)) {
        return false;
      }
      
             const files = readdirSync(summaryDir).filter(f => f.endsWith('.md'));
       const recentFiles = files.filter(f => {
         try {
           const stats = statSync(join(summaryDir, f));
           return Date.now() - stats.mtime.getTime() < 60000; // Last minute
         } catch {
           return false;
         }
       });
      
      return recentFiles.length > 0;
    } catch (error) {
      this.logEvent('summary_check_error', `Failed to check summary emission: ${error}`);
      return false;
    }
  }

  public async forceAuditAndConsolidateTelemetry(): Promise<void> {
    this.logEvent('audit_started', 'Starting telemetry audit and consolidation');
    
    // Step 1: Audit all endpoints
    console.log('[AUDIT] Checking all monitoring endpoints...');
    for (let i = 0; i < this.endpoints.length; i++) {
      this.endpoints[i] = await this.pingEndpoint(this.endpoints[i]);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }
    
    // Step 2: Check daemon status
    console.log('[AUDIT] Checking daemon process status...');
    for (let i = 0; i < this.daemons.length; i++) {
      this.daemons[i] = await this.checkProcessStatus(this.daemons[i]);
      await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
    }
    
    // Step 3: Analyze and recommend consolidation
    this.analyzeAndRecommend();
    
    // Step 4: Execute stress test
    console.log('[STRESS TEST] Starting daemon lifecycle stress test...');
    await this.executeStressTest();
    
    // Step 5: Generate final report
    this.generateFinalReport();
    
    this.logEvent('audit_completed', 'Telemetry audit and consolidation completed');
  }

  private analyzeAndRecommend(): void {
    const recommendations: string[] = [];
    const actions: string[] = [];
    
    // Check for endpoint conflicts
    const port5001Endpoints = this.endpoints.filter(e => e.port === 5001);
    if (port5001Endpoints.length > 1) {
      recommendations.push('Multiple services on port 5001 detected - consider consolidation');
      actions.push('Identified port conflict on 5001');
    }
    
    // Check for degraded endpoints
    const degradedEndpoints = this.endpoints.filter(e => e.status === 'degraded');
    if (degradedEndpoints.length > 0) {
      recommendations.push(`${degradedEndpoints.length} endpoints showing degraded performance`);
      actions.push('Detected degraded endpoint performance');
    }
    
    // Check for stopped daemons
    const stoppedDaemons = this.daemons.filter(d => d.status === 'stopped');
    if (stoppedDaemons.length > 0) {
      recommendations.push(`${stoppedDaemons.length} daemons are stopped and need restart`);
      actions.push('Detected stopped daemon processes');
    }
    
    this.report.consolidationActions = actions;
    this.report.recommendations = recommendations;
  }

  private async executeStressTest(): Promise<void> {
    const cycles = 3;
    let successfulRestarts = 0;
    let failedRestarts = 0;
    
    for (let cycle = 1; cycle <= cycles; cycle++) {
      this.logEvent('stress_test_cycle', `Starting stress test cycle ${cycle}/${cycles}`);
      console.log(`[STRESS TEST] Cycle ${cycle}/${cycles} - Restarting daemons...`);
      
      for (const daemon of this.daemons) {
        const result = await this.restartDaemon(daemon);
        if (result.success) {
          successfulRestarts++;
          daemon.restartCount++;
          daemon.lastRestart = new Date().toISOString();
        } else {
          failedRestarts++;
          this.logEvent('stress_test_failure', `${daemon.name} restart failed: ${result.error}`);
        }
        
        // Staggered recovery - wait between restarts
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Wait between cycles
      if (cycle < cycles) {
        console.log(`[STRESS TEST] Waiting 5 seconds before cycle ${cycle + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Check summary emission after stress test
    const summaryEmission = await this.checkSummaryEmission();
    
    this.report.stressTestResults = {
      cycles,
      successfulRestarts,
      failedRestarts,
      summaryEmission
    };
    
    this.logEvent('stress_test_completed', 'Stress test completed', this.report.stressTestResults);
  }

  private generateFinalReport(): void {
    this.report.timestamp = new Date().toISOString();
    this.report.endpoints = [...this.endpoints];
    this.report.daemons = [...this.daemons];
    
    try {
      writeFileSync(this.reportPath, JSON.stringify(this.report, null, 2));
      this.logEvent('report_generated', 'Consolidation report generated', { path: this.reportPath });
      
      console.log('\n=== TELEMETRY CONSOLIDATION REPORT ===');
      console.log(`Timestamp: ${this.report.timestamp}`);
      console.log(`Endpoints: ${this.endpoints.length} checked`);
      console.log(`Daemons: ${this.daemons.length} monitored`);
      console.log(`Stress Test: ${this.report.stressTestResults.successfulRestarts}/${this.report.stressTestResults.successfulRestarts + this.report.stressTestResults.failedRestarts} successful restarts`);
      console.log(`Summary Emission: ${this.report.stressTestResults.summaryEmission ? '✅' : '❌'}`);
      
      if (this.report.recommendations.length > 0) {
        console.log('\nRecommendations:');
        this.report.recommendations.forEach(rec => console.log(`- ${rec}`));
      }
      
      console.log('\n=== END REPORT ===\n');
      
    } catch (error) {
      this.logEvent('report_error', `Failed to generate report: ${error}`);
    }
  }

  public getReport(): ConsolidationReport {
    return { ...this.report };
  }

  public getEndpoints(): MonitoringEndpoint[] {
    return [...this.endpoints];
  }

  public getDaemons(): DaemonProcess[] {
    return [...this.daemons];
  }
}

// Export functions for external use
export function forceAuditAndConsolidateTelemetry(): void {
  const consolidator = new TelemetryMonitorConsolidator();
  consolidator.forceAuditAndConsolidateTelemetry().catch(error => {
    console.error('Consolidation failed:', error);
  });
}

export function getTelemetryConsolidator(): TelemetryMonitorConsolidator {
  return new TelemetryMonitorConsolidator();
}

// Auto-execute if this file is run directly
if (require.main === module) {
  console.log('🚀 Starting Telemetry Monitor Consolidation...');
  forceAuditAndConsolidateTelemetry();
} 