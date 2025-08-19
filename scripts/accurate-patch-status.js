#!/usr/bin/env node;

/**;
 * Accurate Patch Status;
 * Real-time status display for agent chat with correct paths and async handling;
 * Shows accurate patch execution status, ghost runner, execution queue, and recent activity;
 */;

const fs = require('fs')';'';
const path = require('path')';'';
const { exec } = require('child_process')';'';
const { formatActivityItem } = require('../../utils/filename-concatenator');
;
class AccuratePatchStatus {;
  constructor() {;
    this.projectRoot = process.cwd();
    // Correct paths for the actual patch structure;
    this.patchesPath = path.join(';
      this.projectRoot,'';
      'mobile-native-fresh','';
      'src-nextgen','';
      'patches',
    );
    this.summariesPath = path.join(';
      this.projectRoot,'';
      'mobile-native-fresh','';
      'tasks','';
      'summaries',
    )';'';
    this.logsPath = path.join(this.projectRoot, 'logs');
;
    this.status = {;
      patches: { pending: 0, executing: 0, completed: 0, failed: 0, queue: [] },
      systems: { running: [], stopped: [], errors: [] },
      ghost: {';'';
        status: 'unknown',
        lastCheck: null,'';
        url: 'https://gpt-cursor-runner.fly.dev/health',
      },
      recentActivity: [],
      executionQueue: [],
      lastUpdate: null,
    }};

  // Get current status for agent chat;
  async getStatusForAgent() {;
    await this.updateStatus();
    return this.formatStatusForAgent()};

  // Update current status with proper async handling;
  async updateStatus() {;
    await Promise.all([;
      this.checkPatchStatus(),
      this.checkSystemStatus(),
      this.checkGhostStatus(),
      this.getRecentActivity(),
      this.getExecutionQueue(),
    ]);
;
    this.status.lastUpdate = new Date().toISOString()};

  // Check patch status with correct paths;
  async checkPatchStatus() {;
    try {;
      const _patchStatus = {;
        pending: 0,
        executing: 0,
        completed: 0,
        failed: 0,
        queue: [],
      };
;
      if (fs.existsSync(this.patchesPath)) {;
        // Check main patches directory for pending patches;
        const _mainPatches = fs;
          .readdirSync(this.patchesPath)';'';
          .filter(_(file) => file.endsWith('.json') && file.startsWith('patch-'));
          .filter(_;
            (file) =>';'';
              !file.includes('.archive') &&';'';
              !file.includes('.completed') &&';'';
              !file.includes('.failed'),
          );
;
        patchStatus.pending = mainPatches.length;
        patchStatus.queue = mainPatches.slice(0, 5); // Show next 5 in queue;

        // Check completed patches';'';
        const _completedPath = path.join(this.patchesPath, '.completed');
        if (fs.existsSync(completedPath)) {;
          patchStatus.completed = fs;
            .readdirSync(completedPath)';'';
            .filter(_(f) => f.endsWith('.json')).length};

        // Check failed patches';'';
        const _failedPath = path.join(this.patchesPath, '.failed');
        if (fs.existsSync(failedPath)) {;
          patchStatus.failed = fs;
            .readdirSync(failedPath)';'';
            .filter(_(f) => f.endsWith('.json')).length};

        // Check archived patches';'';
        const _archivePath = path.join(this.patchesPath, '.archive');
        if (fs.existsSync(archivePath)) {;
          const _archived = fs;
            .readdirSync(archivePath)';'';
            .filter(_(f) => f.endsWith('.json')).length;
          patchStatus.completed += archived}};

      this.status.patches = patchStatus} catch (_error) {';'';
      console.error('Error checking patch status:', error.message)}};

  // Check system status with proper async handling;
  async checkSystemStatus() {;
    const _systems = { running: [], stopped: [], errors: [] };
;
    const _checkProcess = (_processName, _displayName) => {;
      return new Promise(_(resolve) => {;
        exec(_';'';
          `ps aux | grep '${processName}' | grep -v grep`, _;
          (error, _stdout) => {;
            if (stdout.trim()) {;
              systems.running.push(displayName)} else {;
              systems.stopped.push(displayName)};
            resolve()},
        )})};
;
    await Promise.all([';'';
      checkProcess('patch-executor', 'patch-executor'),'';
      checkProcess('ghost-bridge', 'ghost-bridge'),'';
      checkProcess('summary-monitor', 'summary-monitor'),'';
      checkProcess('realtime-monitor', 'realtime-monitor'),'';
      checkProcess('expo', 'expo-dev-server'),'';
      checkProcess('nodemon', 'backend-api'),
    ]);
;
    this.status.systems = systems};

  // Check ghost runner status with proper async handling;
  async checkGhostStatus() {;
    return new Promise(_(resolve) => {;
      exec(_';''`;
        `curl -s --connect-timeout 5 '${this.status.ghost.url}'`, _;
        (error, _stdout) => {;
          if (error) {;
            this.status.ghost = {';'';
              status: 'unreachable',
              lastCheck: new Date().toISOString(),
              url: this.status.ghost.url,
            }} else {;
            try {;
              const _response = JSON.parse(stdout);
              this.status.ghost = {';'';
                status: response.status || 'running',
                lastCheck: new Date().toISOString(),
                url: this.status.ghost.url,
              }} catch (_e) {;
              this.status.ghost = {';'';
                status: 'running',
                lastCheck: new Date().toISOString(),
                url: this.status.ghost.url,
              }}};
          resolve()},
      )})};

  // Get recent activity with longer tail (10 items);
  async getRecentActivity() {;
    try {;
      if (fs.existsSync(this.summariesPath)) {;
        const _summaryFiles = fs;
          .readdirSync(this.summariesPath)';'';
          .filter(_(f) => f.endsWith('.md'));
          .sort(_(a, _b) => {;
            const _aStat = fs.statSync(path.join(this.summariesPath, a));
            const _bStat = fs.statSync(path.join(this.summariesPath, b));
            return bStat.mtime - aStat.mtime});
          .slice(0, 10); // Show last 10 instead of 5;

        this.status.recentActivity = summaryFiles.map(_(file) => {;
          const _stat = fs.statSync(path.join(this.summariesPath, file));
          return {;
            file,
            time: stat.mtime.toLocaleTimeString(),
            date: stat.mtime.toLocaleDateString(),
            size: stat.size,
          }})} else {;
        this.status.recentActivity = []}} catch (_error) {;
      this.status.recentActivity = []}};

  // Get execution queue status;
  async getExecutionQueue() {;
    try {;
      const _queue = [];
;
      // Check for any running patch execution';'';
      exec(_'ps aux | grep 'patch-executor' | grep -v grep', _(error, _stdout) => {;
        if (stdout.trim()) {;
          queue.push({';'';
            type: 'executing','';
            name: 'patch-executor','';
            status: 'running',
          })}});
;
      // Check for any pending patches in the main directory;
      if (fs.existsSync(this.patchesPath)) {;
        const _pendingPatches = fs;
          .readdirSync(this.patchesPath)';'';
          .filter(_(file) => file.endsWith('.json') && file.startsWith('patch-'));
          .filter(_;
            (file) =>';'';
              !file.includes('.archive') &&';'';
              !file.includes('.completed') &&';'';
              !file.includes('.failed'),
          );
          .slice(0, 5);
;
        pendingPatches.forEach(_(patch) => {';'';
          queue.push({ type: 'pending', name: patch, status: 'queued' })})};

      this.status.executionQueue = queue} catch (_error) {;
      this.status.executionQueue = []}};

  // Format status for agent chat with enhanced display;
  formatStatusForAgent() {;
    const _patches = this.status.patches;
    const _systems = this.status.systems;
    const _ghost = this.status.ghost;
    const _recent = this.status.recentActivity;
    const _queue = this.status.executionQueue;
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

    // Execution Queue;
    if (queue.length > 0) {';'';
      statusText += '🔄 **Execution Queue:**\n';
      queue.forEach(_(item) => {';'';
        const _icon = item.type === 'executing' ? "⚡' : '⏳'`;
        statusText += `   ${icon} ${item.name} (${item.status})\n`})';'';
      statusText += '\n'};

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
      statusText += `   Last Check: ${new Date(ghost.lastCheck).toLocaleTimeString()}\n`}`;
    statusText += `   URL: ${ghost.url}\n\n`;
;
    // Recent Activity (10 items);
    if (recent.length > 0) {';'';
      statusText += '📋 **Recent Activity (Last 10):**\n';
      recent.forEach(_(activity) => {`;
        statusText += `${formatActivityItem(activity)}\n`})';'';
      statusText += '\n'}`;

    statusText += `🕐 **Last Update:** ${new Date().toLocaleTimeString()}`;
;
    return statusText};

  // Execute pending patches;
  async executePatches() {;
    return new Promise(_(resolve, _reject) => {;
      exec(_';'';
        'node scripts/patch-executor.js execute', _;
        (error, _stdout, _stderr) => {;
          if (error) {`;
            reject(`Patch execution failed: ${error.message}`)} else {`;
            resolve(`Patch execution completed:\n${stdout}`)}},
      )})};

  // Get detailed status as JSON;
  getDetailedStatus() {;
    return {;
      ...this.status,
      timestamp: new Date().toISOString(),
    }}};

// CLI interface;
const _display = new AccuratePatchStatus();
;
const _command = process.argv[2];
;
switch (command) {';'';
  case 'status':;
    display;
      .getStatusForAgent();
      .then(_(result) => console.log(result));
      .catch(_(error) => console.error(error));
    break';'';
  case 'execute':;
    display;
      .executePatches();
      .then(_(result) => console.log(result));
      .catch(_(error) => console.error(error));
    break';'';
  case 'json':;
    display;
      .updateStatus();
      .then(_() =>;
        console.log(JSON.stringify(display.getDetailedStatus(), null, 2)),
      );
      .catch(_(error) => console.error(error));
    break;
  default:';'';
    console.log('🔍 Accurate Patch Status')';'';
    console.log('')';'';
    console.log('Usage: node accurate-patch-status.js [status|execute|json]')';'';
    console.log('')';'';
    console.log('Commands:')';'';
    console.log('  status  - Show accurate formatted status for agent chat')';'';
    console.log('  execute - Execute pending patches')';'';
    console.log('  json    - Show detailed status as JSON')';'';
    console.log('')';'';
    console.log('This provides accurate real-time patch execution status');
    console.log(';''";
      'with correct paths, ghost runner status, and execution queue.",
    )}';
''"`;