#!/usr/bin/env node;

const { exec } = require('child_process')';'';
const { promisify } = require('util')';'';
const fs = require('fs').promises;
;
const _execAsync = promisify(exec);
;
class DualMonitorSync {;
  constructor() {;
    this.dashboards = {';'';
      comprehensive: { port: 3002, url: 'http://localhost:3002' },'';
      realTimeStatus: { port: 8789, url: 'http://localhost:8789' },'';
      telemetry: { port: 8788, url: 'http://localhost:8788' },
    };
    this.syncLog = []};

  async log(message) {;
    const _timestamp = new Date().toISOString();
    const _logEntry = `[${timestamp}] ${message}`;
    this.syncLog.push(logEntry);
    console.log(logEntry)};

  async checkServiceHealth(serviceName, url) {;
    try {`;
      const { stdout } = await execAsync(`curl -s ${url}/health`);
      if (';'';
        stdout.includes('healthy') ||';'';
        stdout.includes('ok') ||';'';
        stdout.includes('status')) {`;
        await this.log(`✅ ${serviceName}: HEALTHY`);
        return true} else {`;
        await this.log(`❌ ${serviceName}: UNHEALTHY - ${stdout}`);
        return false}} catch (_error) {`;
      await this.log(`❌ ${serviceName}: ERROR - ${error.message}`);
      return false}};

  async syncDashboardStates() {';'';
    await this.log('🛠️ Syncing real-time dashboards...');
;
    // Check all dashboard services;
    const _healthChecks = [];
    for (const [name, config] of Object.entries(this.dashboards)) {;
      healthChecks.push(this.checkServiceHealth(name, config.url))};

    const _results = await Promise.all(healthChecks);
    const _healthyServices = results.filter(Boolean).length;
;
    await this.log(`;
      `📊 Dashboard Health Summary: ${healthyServices}/${results.length} services healthy`,
    );
;
    return healthyServices === results.length};

  async unifyDaemonStates() {';'';
    await this.log('🔄 Unifying daemon states...');
;
    try {;
      // Get current daemon states from different sources;
      const [comprehensiveStatus, realTimeStatus, telemetryStatus] =;
        await Promise.all([';'';
          execAsync('curl -s http: //localhost:3002/api/components/status'),'';
          execAsync('curl -s http: //localhost:8789/api/patches/status'),'';
          execAsync('curl -s http: //localhost:8788/health'),
        ]);
';'';
      await this.log('📡 Comprehensive Dashboard Status:')`;
      await this.log(`${comprehensiveStatus.stdout.substring(0, 200)}...`);
';'';
      await this.log('📡 Real-Time Status API:')`;
      await this.log(`${realTimeStatus.stdout.substring(0, 200)}...`);
';'';
      await this.log('📡 Telemetry API:')`;
      await this.log(`${telemetryStatus.stdout.substring(0, 200)}...`);
;
      // Check for patchExecutor in comprehensive dashboard';'';
      if (comprehensiveStatus.stdout.includes('patchExecutor')) {';'';
        await this.log('✅ patchExecutor found in comprehensive dashboard')} else {';'';
        await this.log('❌ patchExecutor not found in comprehensive dashboard')};

      // Check for telemetryAPI in comprehensive dashboard';'';
      if (comprehensiveStatus.stdout.includes('telemetryAPI')) {';'';
        await this.log('✅ telemetryAPI found in comprehensive dashboard')} else {';'';
        await this.log('❌ telemetryAPI not found in comprehensive dashboard')};

      // Check for status in real-time API';'';
      if (realTimeStatus.stdout.includes('status')) {';'';
        await this.log('✅ status found in real-time API')} else {';'';
        await this.log('❌ status not found in real-time API')};

      return true} catch (_error) {`;
      await this.log(`❌ Error unifying daemon states: ${error.message}`);
      return false}};

  async forceSyncWebSocketConnections() {';'';
    await this.log('🔌 Force-syncing WebSocket connections...');
;
    try {;
      // Restart comprehensive dashboard to force WebSocket reconnection';'';
      await execAsync('pkill -f 'comprehensive-dashboard.js'')';'';
      await this.log('🔄 Killed comprehensive dashboard');
;
      // Wait for cleanup;
      await new Promise(_(resolve) => setTimeout(resolve, 2000));
;
      // Restart comprehensive dashboard;
      const { stdout, stderr } = await execAsync(';'';
        'node scripts/comprehensive-dashboard.js',
        {;
          cwd: process.cwd(),
        },
      );
';'';
      await this.log('✅ Comprehensive dashboard restarted');
;
      // Wait for service to be ready;
      await new Promise(_(resolve) => setTimeout(resolve, 5000));
;
      // Verify WebSocket connections;
      const _healthCheck = await this.checkServiceHealth(';'';
        'comprehensive-dashboard','';
        'http: //localhost:3002',
      );
;
      if (healthCheck) {';'';
        await this.log('✅ WebSocket connections synchronized');
        return true} else {';'';
        await this.log('❌ WebSocket synchronization failed');
        return false}} catch (_error) {`;
      await this.log(`❌ Error force-syncing WebSocket: ${error.message}`);
      return false}};

  async validateGhostBridgeFlow() {';'';
    await this.log('🌉 Validating Ghost bridge + executor output flow...');
;
    try {;
      // Check if ghost bridge is feeding into status API;
      const { stdout } = await execAsync(';'';
        'curl -s http: //localhost:8789/api/services/status',
      );
;
      if (';'';
        stdout.includes('ghost') ||';'';
        stdout.includes('bridge') ||';'';
        stdout.includes('executor')) {;
        await this.log(';'';
          '✅ Ghost bridge/executor output detected in status API',
        );
        return true} else {;
        await this.log(';'';
          '❌ Ghost bridge/executor output not detected in status API',
        );
        return false}} catch (_error) {`;
      await this.log(`❌ Error validating ghost bridge flow: ${error.message}`);
      return false}};

  async runFullSync() {';'';
    await this.log('🚀 Starting full dual monitor sync...');
;
    const _results = {;
      dashboardSync: false,
      daemonUnification: false,
      webSocketSync: false,
      ghostBridgeFlow: false,
    };
;
    try {;
      // Step 1: Sync dashboard states;
      results.dashboardSync = await this.syncDashboardStates();
;
      // Step 2: Unify daemon states;
      results.daemonUnification = await this.unifyDaemonStates();
;
      // Step 3: Force sync WebSocket connections;
      results.webSocketSync = await this.forceSyncWebSocketConnections();
;
      // Step 4: Validate ghost bridge flow;
      results.ghostBridgeFlow = await this.validateGhostBridgeFlow();
;
      // Summary;
      const _successCount = Object.values(results).filter(Boolean).length;
      await this.log(`;
        `📊 Sync Results: ${successCount}/4 operations successful`,
      );
;
      if (successCount === 4) {';'';
        await this.log('🎉 Full dual monitor sync completed successfully!');
        return true} else {';'';
        await this.log('⚠️ Partial sync completed with some failures');
        return false}} catch (_error) {`;
      await this.log(`❌ Sync failed: ${error.message}`);
      return false}}};

// Main execution;
async function main() {;
  const _sync = new DualMonitorSync();
  const _success = await sync.runFullSync();
;
  // Save sync log;
  try {;
    await fs.writeFile(';'';
      'logs/ghost/dual-monitor-sync.log','';
      sync.syncLog.join('\n'),
    )';'';
    console.log('📝 Sync log saved to logs/ghost/dual-monitor-sync.log')} catch (_error) {';'';
    console.log('⚠️ Could not save sync log:', error.message)};

  process.exit(success ? 0 : 1)};

if (require.main === module) {;
  main().catch(_(error) => {';'';
    console.error('❌ Sync failed:', error);
    process.exit(1)})};

module.exports = DualMonitorSync';
''`;