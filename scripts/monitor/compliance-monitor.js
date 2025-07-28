const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const ValidationRunner = require('../validate/validation-runner');
const AgentTraining = require('../compliance/agent-training');

class ComplianceMonitor {
  constructor() {
    this.monitoringInterval = 24 * 60 * 60 * 1000; // 24 hours
    this.violationThreshold = 3; // Max violations before alert
    this.monitoringActive = false;
    this.violationLog = [];
    this.performanceMetrics = {
      validationRuns: 0,
      violationsDetected: 0,
      averageValidationTime: 0,
      lastRun: null
    };
  }

  async startMonitoring() {
    if (this.monitoringActive) {
      console.log('⚠️  Monitoring already active');
      return;
    }

    console.log('🚀 Starting Compliance Monitoring System...');
    this.monitoringActive = true;

    // Initial validation run
    await this.runValidationCycle();

    // Schedule regular monitoring
    this.scheduleNextRun();
  }

  async stopMonitoring() {
    console.log('🛑 Stopping Compliance Monitoring System...');
    this.monitoringActive = false;
  }

  scheduleNextRun() {
    if (!this.monitoringActive) return;

    setTimeout(async () => {
      if (this.monitoringActive) {
        await this.runValidationCycle();
        this.scheduleNextRun();
      }
    }, this.monitoringInterval);
  }

  async runValidationCycle() {
    const startTime = Date.now();
    console.log(`\n🔍 Starting validation cycle at ${new Date().toISOString()}`);

    try {
      // Run comprehensive validation
      const validationRunner = new ValidationRunner();
      const results = await validationRunner.runFullValidation();

      // Update performance metrics
      this.performanceMetrics.validationRuns++;
      this.performanceMetrics.lastRun = new Date().toISOString();
      this.performanceMetrics.averageValidationTime = 
        (this.performanceMetrics.averageValidationTime * (this.performanceMetrics.validationRuns - 1) + 
         (Date.now() - startTime)) / this.performanceMetrics.validationRuns;

      // Check for violations
      await this.checkForViolations(results);

      // Generate monitoring report
      await this.generateMonitoringReport(results);

      console.log(`✅ Validation cycle completed in ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('❌ Validation cycle failed:', error.message);
      await this.recordViolation('VALIDATION_FAILURE', error.message);
    }
  }

  async checkForViolations(results) {
    const violations = [];

    // Check command validation violations
    if (results.commandValidation?.failed > 0) {
      violations.push({
        type: 'COMMAND_PATTERN_VIOLATION',
        severity: 'HIGH',
        count: results.commandValidation.failed,
        details: results.commandValidation.details.filter(d => d.status === 'FAIL')
      });
    }

    // Check runtime validation violations
    if (results.runtimeValidation?.failed > 0) {
      violations.push({
        type: 'RUNTIME_VIOLATION',
        severity: 'MEDIUM',
        count: results.runtimeValidation.failed,
        details: results.runtimeValidation.details.filter(d => d.status === 'FAIL')
      });
    }

    // Check compliance violations
    if (results.complianceCheck?.failed > 0) {
      violations.push({
        type: 'COMPLIANCE_VIOLATION',
        severity: 'HIGH',
        count: results.complianceCheck.failed,
        details: results.complianceCheck.details.filter(d => d.status === 'FAIL')
      });
    }

    // Record violations
    for (const violation of violations) {
      await this.recordViolation(violation.type, violation);
    }

    // Check if threshold exceeded
    if (this.violationLog.length >= this.violationThreshold) {
      await this.triggerAlert();
    }
  }

  async recordViolation(type, details) {
    const violation = {
      type,
      details,
      timestamp: new Date().toISOString(),
      severity: details.severity || 'MEDIUM'
    };

    this.violationLog.push(violation);
    this.performanceMetrics.violationsDetected++;

    // Keep only recent violations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.violationLog = this.violationLog.filter(v => 
      new Date(v.timestamp) > thirtyDaysAgo
    );

    console.log(`⚠️  Violation recorded: ${type} (${violation.severity})`);
  }

  async triggerAlert() {
    console.log('🚨 VIOLATION THRESHOLD EXCEEDED - TRIGGERING ALERT');
    
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'VIOLATION_THRESHOLD_EXCEEDED',
      violations: this.violationLog.slice(-this.violationThreshold),
      performanceMetrics: this.performanceMetrics
    };

    // Save alert
    const alertDir = './logs/alerts';
    await fs.mkdir(alertDir, { recursive: true });
    
    const alertFile = path.join(alertDir, `alert-${Date.now()}.json`);
    await fs.writeFile(alertFile, JSON.stringify(alert, null, 2));

    // Send notification (placeholder for actual notification system)
    await this.sendNotification(alert);

    console.log(`📢 Alert saved to: ${alertFile}`);
  }

  async sendNotification(alert) {
    // Placeholder for actual notification system
    // This could integrate with Slack, email, or other notification systems
    console.log('📢 SENDING ALERT NOTIFICATION');
    console.log(`🚨 ${alert.violations.length} violations detected`);
    console.log(`📊 Performance metrics: ${JSON.stringify(alert.performanceMetrics)}`);
  }

  async generateMonitoringReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      performanceMetrics: this.performanceMetrics,
      currentValidation: results,
      violationSummary: {
        total: this.violationLog.length,
        byType: this.groupViolationsByType(),
        bySeverity: this.groupViolationsBySeverity()
      },
      recommendations: await this.generateRecommendations()
    };

    const reportDir = './logs/monitoring';
    await fs.mkdir(reportDir, { recursive: true });
    
    const reportFile = path.join(reportDir, `monitoring-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));

    console.log(`📄 Monitoring report saved to: ${reportFile}`);
    return report;
  }

  groupViolationsByType() {
    const grouped = {};
    this.violationLog.forEach(violation => {
      grouped[violation.type] = (grouped[violation.type] || 0) + 1;
    });
    return grouped;
  }

  groupViolationsBySeverity() {
    const grouped = {};
    this.violationLog.forEach(violation => {
      grouped[violation.severity] = (grouped[violation.severity] || 0) + 1;
    });
    return grouped;
  }

  async generateRecommendations() {
    const recommendations = [];

    // Check for training compliance
    const training = new AgentTraining();
    const complianceReport = await training.generateComplianceReport();
    
    if (complianceReport.complianceRate < 100) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Complete agent training for untrained agents',
        details: `Compliance rate: ${complianceReport.complianceRate.toFixed(1)}%`
      });
    }

    // Check for performance issues
    if (this.performanceMetrics.averageValidationTime > 30000) { // 30 seconds
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Optimize validation performance',
        details: `Average validation time: ${this.performanceMetrics.averageValidationTime.toFixed(0)}ms`
      });
    }

    // Check for frequent violations
    if (this.violationLog.length > 10) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review and fix recurring violations',
        details: `${this.violationLog.length} violations in last 30 days`
      });
    }

    return recommendations;
  }

  async getMonitoringStatus() {
    return {
      active: this.monitoringActive,
      performanceMetrics: this.performanceMetrics,
      violationCount: this.violationLog.length,
      nextRun: this.monitoringActive ? 
        new Date(Date.now() + this.monitoringInterval).toISOString() : null
    };
  }

  async updateMonitoringInterval(newInterval) {
    this.monitoringInterval = newInterval;
    console.log(`⏰ Monitoring interval updated to ${newInterval}ms`);
  }

  async updateViolationThreshold(newThreshold) {
    this.violationThreshold = newThreshold;
    console.log(`🎯 Violation threshold updated to ${newThreshold}`);
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new ComplianceMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
  case 'start':
    monitor.startMonitoring().catch(console.error);
    break;
  case 'stop':
    monitor.stopMonitoring();
    break;
  case 'status':
    monitor.getMonitoringStatus().then(console.log).catch(console.error);
    break;
  case 'validate':
    monitor.runValidationCycle().catch(console.error);
    break;
  default:
    console.log('Usage: node compliance-monitor.js [start|stop|status|validate]');
  }
}

module.exports = ComplianceMonitor; 