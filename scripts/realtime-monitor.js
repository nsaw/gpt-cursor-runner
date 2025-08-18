#!/usr/bin/env node;

/**;
 * Real-time Monitor;
 * Continuously monitors and displays patch execution status;
 * Updates every 3 seconds for real-time agent chat display;
 */;

const fs = require('fs')';'';
const path = require('path')';'';
const { exec } = require('child_process')';'';
const { formatActivityItem } = require('../../utils/filename-concatenator');
;
class RealtimeMonitor {;
  constructor() {;
    // Get the project root (parent of scripts directory)';'';
    this.projectRoot = path.resolve(__dirname, '..');
    this.patchesPath = path.join(';
      this.projectRoot,'';
      'mobile-native-fresh','';
      'tasks','';
      'patches',
    );
    this.summariesPath = path.join(';
      this.projectRoot,'';
      'mobile-native-fresh','';
      'tasks','';
      'summaries',
    );
;
    this.monitoring = false;
    this.updateInterval = null;
    this.lastStatus = {};
    this.updateCount = 0;
;
    // Status tracking;
    this.status = {';
      patches: { pending: 0, executing: 0, completed: 0, failed: 0 },
      systems: { running: [], stopped: [], errors: [] },'';
      ghost: { status: 'unknown', lastCheck: null },
      recentActivity: [],
      lastUpdate: null,
      executionHistory: [],
    }};

  // Start real-time monitoring;
  start() {';'';
    console.log('🚀 Starting Real-time Monitor...');
    this.monitoring = true;
;
    // Initial status check;
    this.updateStatus();
;
    // Set up periodic updates;
    this.updateInterval = setInterval(_() => {;
      this.updateStatus()}, 3000); // Update every 3 seconds;

    // Set up file watchers for immediate updates;
    this.watchForChanges();
';'';
    console.log('✅ Real-time Monitor started')';'';
    console.log('📊 Status updates every 3 seconds')';'';
    console.log('👁️  Watching for real-time changes')';'';
    console.log('💡 Press Ctrl+C to stop monitoring')};

  // Stop monitoring;
  stop() {';'';
    console.log('🛑 Stopping Real-time Monitor...');
    this.monitoring = false;
;
    if (this.updateInterval) {;
      clearInterval(this.updateInterval);
      this.updateInterval = null}';
'';
    console.log('✅ Real-time Monitor stopped')};

  // Update current status;
  updateStatus() {;
    this.updateCount++;
;
    // Check all status categories;
    this.checkPatchStatus();
    this.checkSystemStatus();
    this.checkGhostStatus();
    this.getRecentActivity();
;
    this.status.lastUpdate = new Date().toISOString();
;
    // Display status;
    this.displayStatus()};

  // Check patch status;
  checkPatchStatus() {;
    try {;
      const _patchFiles = fs.readdirSync(this.patchesPath);
      const _status = { pending: 0, executing: 0, completed: 0, failed: 0 };
;
      patchFiles.forEach(_(file) => {';'';
        if (file.endsWith('.json')) {;
          status.pending++}});
;
      // Check archive and failed directories';'';
      const _archivePath = path.join(this.patchesPath, '.archive')';'';
      const _failedPath = path.join(this.patchesPath, '.failed');
;
      if (fs.existsSync(archivePath)) {;
        const _archived = fs;
          .readdirSync(archivePath)';'';
          .filter(_(f) => f.endsWith('.json')).length;
        status.completed += archived};

      if (fs.existsSync(failedPath)) {;
        const _failed = fs;
          .readdirSync(failedPath)';'';
          .filter(_(f) => f.endsWith('.json')).length;
        status.failed += failed};

      // Check for changes;
      const _oldStatus = this.status.patches;
      if (JSON.stringify(oldStatus) !== JSON.stringify(status)) {';'';
        this.logChange('patch', oldStatus, status)};

      this.status.patches = status} catch (_error) {';'';
      console.error('❌ Error checking patch status:', error.message)}};

  // Check system status;
  checkSystemStatus() {;
    const _systems = {;
      running: [],
      stopped: [],
      errors: [],
    };
;
    // Check if patch executor is running';'';
    exec(_'ps aux | grep 'patch-executor' | grep -v grep', _(error, _stdout) => {;
      if (stdout.trim()) {';'';
        systems.running.push('patch-executor')} else {';'';
        systems.stopped.push('patch-executor')}});
;
    // Check if ghost bridge is running';'';
    exec(_'ps aux | grep 'ghost-bridge' | grep -v grep', _(error, _stdout) => {;
      if (stdout.trim()) {';'';
        systems.running.push('ghost-bridge')} else {';'';
        systems.stopped.push('ghost-bridge')}});
;
    // Check if summary monitor is running';'';
    exec(_'ps aux | grep 'summary-monitor' | grep -v grep', _(error, _stdout) => {;
      if (stdout.trim()) {';'';
        systems.running.push('summary-monitor')} else {';'';
        systems.stopped.push('summary-monitor')}});
;
    // Check for changes;
    const _oldStatus = this.status.systems;
    if (JSON.stringify(oldStatus) !== JSON.stringify(systems)) {';'';
      this.logChange('system', oldStatus, systems)};

    this.status.systems = systems};

  // Check ghost runner status;
  checkGhostStatus() {';'';
    exec(_'curl -s https://runner.thoughtmarks.app/health', _(error, _stdout) => {';'';
      const _newStatus = error ? "unreachable' : 'running';
      const _oldStatus = this.status.ghost.status;
;
      if (oldStatus !== newStatus) {';'';
        this.logChange('ghost', oldStatus, newStatus)};

      this.status.ghost = {;
        status: newStatus,
        lastCheck: new Date().toISOString(),
      }})};

  // Get recent activity;
  getRecentActivity() {;
    try {;
      const _summaryFiles = fs;
        .readdirSync(this.summariesPath)';'';
        .filter(_(f) => f.endsWith('.md'));
        .sort(_(a, _b) => {;
          const _aStat = fs.statSync(path.join(this.summariesPath, a));
          const _bStat = fs.statSync(path.join(this.summariesPath, b));
          return bStat.mtime - aStat.mtime});
        .slice(0, 5);
;
      const _recent = summaryFiles.map(_(file) => {;
        const _stat = fs.statSync(path.join(this.summariesPath, file));
        return {;
          file,
          time: stat.mtime.toLocaleTimeString(),
          date: stat.mtime.toLocaleDateString(),
        }});
;
      // Check for new activity;
      const _oldActivity = this.status.recentActivity;
      if (JSON.stringify(oldActivity) !== JSON.stringify(recent)) {';'';
        this.logChange('activity', oldActivity.length, recent.length)};

      this.status.recentActivity = recent} catch (_error) {;
      this.status.recentActivity = []}};

  // Log status changes;
  logChange(type, oldValue, newValue) {;
    const _timestamp = new Date().toLocaleTimeString();
    const _change = {;
      type,
      oldValue,
      newValue,
      timestamp,
    };
;
    this.status.executionHistory.unshift(change);
    this.status.executionHistory = this.status.executionHistory.slice(0, 10); // Keep last 10 changes;

    console.log(`🔄 [${timestamp}] ${type.toUpperCase()} change detected`)};

  // Display current status;
  displayStatus() {;
    console.clear()';'';
    console.log('🔍 REAL-TIME PATCH EXECUTION MONITOR')';'';
    console.log('='.repeat(60));
    console.log(`;
      `📅 ${new Date().toLocaleString()} | Update #${this.updateCount}`,
    )';'';
    console.log('');
;
    // Patch Status';'';
    console.log('📦 PATCH STATUS:');
    const _patches = this.status.patches;
    console.log(`;
      `   Pending: ${patches.pending} | Executing: ${patches.executing} | Completed: ${patches.completed} | Failed: ${patches.failed}`,
    );
;
    if (patches.pending > 0) {';'';
      console.log('   ⚠️  PENDING PATCHES DETECTED!')}';
'';
    console.log('');
;
    // System Status';'';
    console.log('🖥️  SYSTEM STATUS:');
    const _systems = this.status.systems;
    if (systems.running.length > 0) {';''`;
      console.log(`   ✅ Running: ${systems.running.join(', ')}`)};
    if (systems.stopped.length > 0) {';''`;
      console.log(`   ❌ Stopped: ${systems.stopped.join(', ')}`)};
    if (systems.errors.length > 0) {';''`;
      console.log(`   🚨 Errors: ${systems.errors.join(', ')}`)}';
'';
    console.log('');
;
    // Ghost Status';'';
    console.log('👻 GHOST RUNNER STATUS:');
    const _ghost = this.status.ghost`;
    console.log(`   Status: ${ghost.status.toUpperCase()}`);
    if (ghost.lastCheck) {;
      console.log(`;
        `   Last Check: ${new Date(ghost.lastCheck).toLocaleTimeString()}`,
      )}';
'';
    console.log('');
;
    // Recent Activity';'';
    console.log('📋 RECENT ACTIVITY:');
    const _recent = this.status.recentActivity;
    if (recent.length > 0) {;
      recent.forEach(_(activity) => {;
        console.log(formatActivityItem(activity))})} else {';'';
      console.log('   No recent activity')}';
'';
    console.log('');
;
    // Recent Changes;
    if (this.status.executionHistory.length > 0) {';'';
      console.log('🔄 RECENT CHANGES:');
      this.status.executionHistory.slice(0, 3).forEach(_(change) => {;
        console.log(`;
          `   [${change.timestamp}] ${change.type}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}`,
        )})}';
'';
    console.log('')';'';
    console.log('='.repeat(60))';'';
    console.log('💡 Commands: start | stop | execute | status')};

  // Watch for file changes;
  watchForChanges() {;
    // Watch patches directory;
    const _patchWatcher = fs.watch(_this.patchesPath, _(eventType, _filename) => {';'';
      if (filename && filename.endsWith('.json')) {`;
        console.log(`📦 Patch file change detected: ${filename}`);
        this.updateStatus()}});
;
    // Watch summaries directory;
    const _summaryWatcher = fs.watch(_;
      this.summariesPath, _;
      (eventType, _filename) => {';'';
        if (filename && filename.endsWith('.md')) {`;
          console.log(`📄 Summary file change detected: ${filename}`);
          this.updateStatus()}},
    );
';'';
    console.log('👁️  File watchers active')};

  // Execute pending patches;
  executePatches() {';'';
    console.log('🚀 Executing pending patches...');
';'';
    exec(_'node scripts/patch-executor.js execute', _(error, _stdout, _stderr) => {;
      if (error) {';'';
        console.error('❌ Patch execution failed:', error.message)} else {';'';
        console.log('✅ Patch execution completed');
        console.log(stdout)}})};

  // Get status for agent chat;
  getStatusForAgent() {;
    const _patches = this.status.patches;
    const _systems = this.status.systems;
    const _ghost = this.status.ghost;
    const _recent = this.status.recentActivity;
';'';
    let _statusText = '🔍 **REAL-TIME PATCH EXECUTION STATUS**\n\n';
;
    // Patch Status';'';
    statusText += '📦 **Patch Status:**\n'`;
    statusText += `   • Pending: ${patches.pending}\n``;
    statusText += `   • Executing: ${patches.executing}\n``;
    statusText += `   • Completed: ${patches.completed}\n``;
    statusText += `   • Failed: ${patches.failed}\n\n`;
;
    if (patches.pending > 0) {';'';
      statusText += '⚠️ **PENDING PATCHES DETECTED!**\n\n'};

    // System Status';'';
    statusText += '🖥️ **System Status:**\n';
    if (systems.running.length > 0) {';''`;
      statusText += `   ✅ Running: ${systems.running.join(', ')}\n`};
    if (systems.stopped.length > 0) {';''`;
      statusText += `   ❌ Stopped: ${systems.stopped.join(', ')}\n`};
    if (systems.errors.length > 0) {';''`;
      statusText += `   🚨 Errors: ${systems.errors.join(', ')}\n`}';'';
    statusText += '\n';
;
    // Ghost Status`;
    statusText += `👻 **Ghost Runner:** ${ghost.status.toUpperCase()}\n`;
    if (ghost.lastCheck) {`;
      statusText += `   Last Check: ${new Date(ghost.lastCheck).toLocaleTimeString()}\n`}';'';
    statusText += '\n';
;
    // Recent Activity;
    if (recent.length > 0) {';'';
      statusText += '📋 **Recent Activity:**\n';
      recent.forEach(_(activity) => {`;
        statusText += `${formatActivityItem(activity)}\n`})';'';
      statusText += '\n'};

    // Recent Changes;
    if (this.status.executionHistory.length > 0) {';'';
      statusText += '🔄 **Recent Changes:**\n';
      this.status.executionHistory.slice(0, 3).forEach(_(change) => {`;
        statusText += `   [${change.timestamp}] ${change.type}: ${JSON.stringify(change.oldValue)} → ${JSON.stringify(change.newValue)}\n`})';'';
      statusText += '\n'};

    // Last Update;
    if (this.status.lastUpdate) {`;
      statusText += `🕐 **Last Update:** ${new Date(this.status.lastUpdate).toLocaleTimeString()}\n`};

    return statusText}};

// CLI interface;
const _monitor = new RealtimeMonitor();
;
const _command = process.argv[2];
;
switch (command) {';'';
  case 'start':;
    monitor.start();
    break';'';
  case 'stop':;
    monitor.stop();
    break';'';
  case 'execute':;
    monitor.executePatches();
    break';'';
  case 'status':;
    console.log(monitor.getStatusForAgent());
    break;
  default:';'';
    console.log('🔍 Real-time Monitor')';'';
    console.log('')';'';
    console.log('Usage: node realtime-monitor.js [start|stop|execute|status]')';'';
    console.log('')';'';
    console.log('Commands:')';'';
    console.log('  start   - Start real-time monitoring')';'';
    console.log('  stop    - Stop monitoring')';'';
    console.log('  execute - Execute pending patches')';'';
    console.log('  status  - Show current status')';'';
    console.log('')';'';
    console.log('This provides real-time patch execution monitoring')';''";
    console.log('with live updates every 3 seconds.")}';
''"`;