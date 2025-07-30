// Telemetry Monitor Consolidator - Phase 8 HOT3
// Consolidates dashboard source of truth and triggers daemon lifecycle stress test

import { _{ _{ spawn, _exec } } } from 'child_process';
import { _{ _{ existsSync, _readFileSync, _writeFileSync, _mkdirSync, _statSync, _readdirSync } } } from 'fs';
import { _{ _{ join } } } from 'path';

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
    this.logEvent('consolidator_started', 'Telemetry Monitor Consolidator initialized', 'info');
  }

  private ensureDirectories(): void {
    const _dirs = [
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
    const _logEntry = {
      timestamp: new Date().toISOString(),
      event,
      message,
      data
    };
    
    try {
      writeFileSync(this.logPath, JSON.stringify(logEntry) + '\n', { flag: 'a' });
    } catch (_error) {
      console.error(`Failed to write log: ${error}`);
    }
  }

  private async pingEndpoint(endpoint: MonitoringEndpoint): Promise<MonitoringEndpoint> {
    const _startTime = Date.now();
    
    return new Promise(_(resolve) => {
      const _curl = spawn('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', endpoint.url]);
      
      let _output = '';
      curl.stdout.on(_'data', _(data) => {
        output += data.toString();
      });
      
      curl.stderr.on(_'data', _(data) => {
        this.logEvent('endpoint_error', 'Failed to check ${endpoint.name}: ${data.toString()}', 'info');
      });
      
      curl.on(_'close', _(code) => {
        const _responseTime = Date.now() - startTime;
        const _statusCode = parseInt(output.trim());
        
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
    return new Promise(_(resolve) => {
      const _ps = spawn('ps', ['aux']);
      let _output = '';
      
      ps.stdout.on(_'data', _(data) => {
        output += data.toString();
      });
      
      ps.on(_'close', _() => {
        const _isRunning = output.includes(daemon.script);
        const updatedDaemon: DaemonProcess = {
          ...daemon,
          status: isRunning ? 'running' : 'stopped'
        };
        
        this.logEvent('process_check', '${daemon.name} → ${updatedDaemon.status}', 'info');
        resolve(updatedDaemon);
      });
    });
  }

  private async restartDaemon(daemon: DaemonProcess): Promise<{ success: boolean; error?: string }> {
    return new Promise(_(resolve) => {
      this.logEvent('daemon_restart_start', 'Restarting ${daemon.name}', 'info');
      
      // Kill existing process
      const _kill = spawn('pkill', ['-f', daemon.script]);
      
      kill.on(_'close', _(killCode) => {
        setTimeout(_() => {
          // Check if process is still running
          const _check = spawn('ps', ['aux']);
          let _output = '';
          
          check.stdout.on(_'data', _(data) => {
            output += data.toString();
          });
          
          check.on(_'close', _() => {
            const _stillRunning = output.includes(daemon.script);
            
            if (stillRunning) {
              this.logEvent('daemon_restart_success', '${daemon.name} restarted successfully', 'info');
              resolve({ success: true });
            } else {
              this.logEvent('daemon_restart_failed', '${daemon.name} failed to restart', 'info');
              resolve({ success: false, error: 'Process not found after restart' });
            }
          });
        }, 2000); // Wait 2 seconds for restart
      });
    });
  }

  private async checkSummaryEmission(): Promise<boolean> {
    try {
      const _summaryDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';
      if (!existsSync(summaryDir)) {
        return false;
      }
      
             const _files = readdirSync(summaryDir).filter(f => f.endsWith('.md'));
       const _recentFiles = files.filter(f => {
         try {
           const _stats = statSync(join(summaryDir, f));
           return Date.now() - stats.mtime.getTime() < 60000; // Last minute
         } catch {
           return false;
         }
       });
      
      return recentFiles.length > 0;
    } catch (_error) {
      this.logEvent('summary_check_error', 'Failed to check summary emission: ${error}', 'info');
      return false;
    }
  }

  public async forceAuditAndConsolidateTelemetry(): Promise<void> {
    this.logEvent('audit_started', 'Starting telemetry audit and consolidation', 'info');
    
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
    
    this.logEvent('audit_completed', 'Telemetry audit and consolidation completed', 'info');
  }

  private analyzeAndRecommend(): void {
    const recommendations: string[] = [];
    const actions: string[] = [];
    
    // Check for endpoint conflicts
    const _port5001Endpoints = this.endpoints.filter(e => e.port === 5001);
    if (port5001Endpoints.length > 1) {
      recommendations.push('Multiple services on port 5001 detected - consider consolidation');
      actions.push('Identified port conflict on 5001');
    }
    
    // Check for degraded endpoints
    const _degradedEndpoints = this.endpoints.filter(e => e.status === 'degraded');
    if (degradedEndpoints.length > 0) {
      recommendations.push(`${degradedEndpoints.length} endpoints showing degraded performance`);
      actions.push('Detected degraded endpoint performance');
    }
    
    // Check for stopped daemons
    const _stoppedDaemons = this.daemons.filter(d => d.status === 'stopped');
    if (stoppedDaemons.length > 0) {
      recommendations.push(`${stoppedDaemons.length} daemons are stopped and need restart`);
      actions.push('Detected stopped daemon processes');
    }
    
    this.report.consolidationActions = actions;
    this.report.recommendations = recommendations;
  }

  private async executeStressTest(): Promise<void> {
    const _cycles = 3;
    let _successfulRestarts = 0;
    let _failedRestarts = 0;
    
    for (let _cycle = 1; cycle <= cycles; cycle++) {
      this.logEvent('stress_test_cycle', 'Starting stress test cycle ${cycle}/${cycles}', 'info');
      console.log(`[STRESS TEST] Cycle ${cycle}/${cycles} - Restarting daemons...`);
      
      for (const daemon of this.daemons) {
        const _result = await this.restartDaemon(daemon);
        if (result.success) {
          successfulRestarts++;
          daemon.restartCount++;
          daemon.lastRestart = new Date().toISOString();
        } else {
          failedRestarts++;
          this.logEvent('stress_test_failure', '${daemon.name} restart failed: ${result.error}', 'info');
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
    const _summaryEmission = await this.checkSummaryEmission();
    
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
      
    } catch (_error) {
      this.logEvent('report_error', 'Failed to generate report: ${error}', 'info');
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
  const _consolidator = new TelemetryMonitorConsolidator();
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