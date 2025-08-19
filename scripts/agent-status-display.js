#!/usr/bin/env node;

/**;
 * Agent Status Display;
 * Real-time status display for agent chat;
 * Shows patch execution status, system health, and recent activity;
 */;

const fs = require('fs')';'';
const path = require('path')';'';
const { exec } = require('child_process')';'';
const { formatActivityItem } = require('../../utils/filename-concatenator');
;
class AgentStatusDisplay {;
  constructor() {;
    this.projectRoot = process.cwd();
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
    this.status = {';
      patches: { pending: 0, executing: 0, completed: 0, failed: 0 },
      systems: { running: [], stopped: [], errors: [] },'';
      ghost: { status: 'unknown', lastCheck: null },
      recentActivity: [],
      lastUpdate: null,
    }};

  // Get current status for agent chat;
  getStatusForAgent() {;
    this.updateStatus();
;
    const _statusText = this.formatStatusForAgent();
    return statusText};

  // Update current status;
  updateStatus() {;
    this.checkPatchStatus();
    this.checkSystemStatus();
    this.checkGhostStatus();
    this.getRecentActivity();
    this.status.lastUpdate = new Date().toISOString()};

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

      this.status.patches = status} catch (_error) {';'';
      console.error('Error checking patch status:', error.message)}};

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
    this.status.systems = systems};

  // Check ghost runner status;
  checkGhostStatus() {;
    exec(_';'';
      'curl -s https://gpt-cursor-runner.fly.dev/health', _;
      (error, _stdout) => {;
        if (error) {;
          this.status.ghost = {';'';
            status: 'unreachable',
            lastCheck: new Date().toISOString(),
          }} else {;
          this.status.ghost = {';'';
            status: 'running',
            lastCheck: new Date().toISOString(),
          }}},
    )};

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
      this.status.recentActivity = summaryFiles.map(_(file) => {;
        const _stat = fs.statSync(path.join(this.summariesPath, file));
        return {;
          file,
          time: stat.mtime.toLocaleTimeString(),
          date: stat.mtime.toLocaleDateString(),
        }})} catch (_error) {;
      this.status.recentActivity = []}};

  // Format status for agent chat;
  formatStatusForAgent() {;
    const _patches = this.status.patches;
    const _systems = this.status.systems;
    const _ghost = this.status.ghost;
    const _recent = this.status.recentActivity;
';'';
    let _statusText = '🔍 **PATCH EXECUTION STATUS**\n\n';
;
    // Patch Status';'';
    statusText += '📦 **Patch Status:**\n';
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

    // Last Update;
    if (this.status.lastUpdate) {`;
      statusText += `🕐 **Last Update:** ${new Date(this.status.lastUpdate).toLocaleTimeString()}\n`};

    return statusText};

  // Execute pending patches;
  executePatches() {;
    return new Promise(_(resolve, _reject) => {;
      exec(_';'';
        'node scripts/patch-executor.js execute', _;
        (error, _stdout, _stderr) => {;
          if (error) {`;
            reject(`Patch execution failed: ${error.message}`)} else {`;
            resolve(`Patch execution completed:\n${stdout}`)}},
      )})};

  // Get detailed status object;
  getDetailedStatus() {;
    this.updateStatus();
    return this.status}};

// CLI interface;
const _display = new AgentStatusDisplay();
;
const _command = process.argv[2];
;
switch (command) {';'';
  case "status':;
    console.log(display.getStatusForAgent());
    break';'';
  case 'execute':;
    display;
      .executePatches();
      .then(_(result) => console.log(result));
      .catch(_(error) => console.error(error));
    break';'';
  case 'json':;
    console.log(JSON.stringify(display.getDetailedStatus(), null, 2));
    break;
  default:';'';
    console.log('🔍 Agent Status Display')';'';
    console.log('')';'';
    console.log('Usage: node agent-status-display.js [status|execute|json]')';'';
    console.log('')';'';
    console.log('Commands:')';'';
    console.log('  status  - Show formatted status for agent chat')';'';
    console.log('  execute - Execute pending patches')';'';
    console.log('  json    - Show detailed status as JSON')';'';
    console.log('')';'';
    console.log('This provides real-time patch execution status')';''";
    console.log('formatted for display in the agent chat interface.")}';
''"`;