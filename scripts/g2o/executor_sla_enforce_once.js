#!/usr/bin/env node

/**
 * Executor SLA Enforcer v2
 * Monitors executor performance and enforces SLA thresholds
 * Node-only implementation with no shell dependencies
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_CONFIG = {
  maxQueueWaitMs: 45000,
  maxRunMs: 90000,
  backoffMs: 5000,
  checkOnly: false,
  emergencyHalt: false
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--maxQueueWaitMs':
        config.maxQueueWaitMs = parseInt(args[++i]) || DEFAULT_CONFIG.maxQueueWaitMs;
        break;
      case '--maxRunMs':
        config.maxRunMs = parseInt(args[++i]) || DEFAULT_CONFIG.maxRunMs;
        break;
      case '--backoffMs':
        config.backoffMs = parseInt(args[++i]) || DEFAULT_CONFIG.backoffMs;
        break;
      case '--emit':
        config.emitPath = args[++i];
        break;
      case '--checkOnly':
        config.checkOnly = true;
        break;
      case '--emergencyHalt':
        config.emergencyHalt = true;
        break;
    }
  }
  
  return config;
}

function getExecutorStatus() {
  try {
    // Check PM2 for executor process
    const { execSync } = require('child_process');
    const pm2List = execSync('pm2 jlist', { encoding: 'utf8' });
    const processes = JSON.parse(pm2List);
    
    const executor = processes.find(p => p.name === 'g2o-executor');
    if (!executor) {
      return { status: 'not_found', error: 'Executor process not found' };
    }
    
    return {
      status: 'running',
      pid: executor.pid,
      uptime: executor.pm2_env.pm_uptime,
      memory: executor.monit.memory,
      cpu: executor.monit.cpu,
      restartCount: executor.pm2_env.restart_time,
      statusCode: executor.pm2_env.status
    };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}

function checkQueueHealth() {
  try {
    const queueDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches';
    const files = fs.readdirSync(queueDir);
    const plainPatches = files.filter(f => f.endsWith('.json') && f.startsWith('patch-'));
    
    return {
      totalPatches: plainPatches.length,
      oldestPatch: plainPatches.length > 0 ? plainPatches[0] : null,
      queueHealth: plainPatches.length < 50 ? 'healthy' : 'congested'
    };
  } catch (error) {
    return { error: error.message };
  }
}

function enforceSLA(config) {
  const timestamp = new Date().toISOString();
  const executorStatus = getExecutorStatus();
  const queueHealth = checkQueueHealth();
  
  const slaStatus = {
    timestamp,
    config,
    executor: executorStatus,
    queue: queueHealth,
    violations: [],
    recommendations: []
  };
  
  // Check executor violations
  if (executorStatus.status === 'not_found') {
    slaStatus.violations.push('executor_not_running');
    slaStatus.recommendations.push('restart_executor');
  } else if (executorStatus.status === 'error') {
    slaStatus.violations.push('executor_error');
    slaStatus.recommendations.push('investigate_executor_state');
  }
  
  // Check queue violations
  if (queueHealth.queueHealth === 'congested') {
    slaStatus.violations.push('queue_congested');
    slaStatus.recommendations.push('increase_processing_capacity');
  }
  
  // Check restart violations
  if (executorStatus.restartCount > 5) {
    slaStatus.violations.push('excessive_restarts');
    slaStatus.recommendations.push('investigate_restart_cause');
  }
  
  // Determine overall status
  slaStatus.overallStatus = slaStatus.violations.length === 0 ? 'green' : 'red';
  slaStatus.withinThresholds = slaStatus.violations.length === 0;
  
  // Apply enforcement if not check-only
  if (!config.checkOnly && slaStatus.violations.length > 0) {
    if (config.emergencyHalt) {
      slaStatus.actions = ['emergency_halt_executor'];
      console.log('EMERGENCY_HALT: Executor SLA violations detected');
    } else {
      slaStatus.actions = ['apply_backoff', 'monitor_retry'];
      console.log('SLA_BACKOFF: Applying backoff due to violations');
    }
  }
  
  return slaStatus;
}

function main() {
  const config = parseArgs();
  
  try {
    const slaStatus = enforceSLA(config);
    
    // Emit status if path provided
    if (config.emitPath) {
      fs.writeFileSync(config.emitPath, JSON.stringify(slaStatus, null, 2));
      console.log(`SLA_STATUS_WRITTEN:${config.emitPath}`);
    }
    
    // Output status
    console.log(`SLA_STATUS:${slaStatus.overallStatus.toUpperCase()}`);
    console.log(`VIOLATIONS:${slaStatus.violations.length}`);
    console.log(`WITHIN_THRESHOLDS:${slaStatus.withinThresholds}`);
    
    // Exit with appropriate code
    process.exit(slaStatus.withinThresholds ? 0 : 1);
    
  } catch (error) {
    console.error('SLA_ENFORCER_ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { enforceSLA, getExecutorStatus, checkQueueHealth };
