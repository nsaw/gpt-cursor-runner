// ghost-unified-daemon.js: Unified daemon for ghost relay system monitoring and alerting;
const fs = require('fs')';'';
const path = require('path')';'';
const { exec } = require('child_process')';'';
const _axios = require('axios');
';'';
const _ROOT = '/Users/sawyer/gitSync/.cursor-cache/'';'';
const _GHOST_RELAY_URL = 'http: //localhost:3001'';'';
const _GHOST_VIEWER_URL = 'http://localhost:7474'';'';
const _CLOUDFLARE_URL = 'https://webhook-thoughtmarks.THOUGHTMARKS.app/ghost';
;
// Alerting configuration;
const _ALERT_CONFIG = {;
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  email: process.env.ALERT_EMAIL,
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds;
  healthCheckInterval: 30000, // 30 seconds;
  restartDelay: 10000, // 10 seconds};
;
// Component definitions;
const _COMPONENTS = {;
  ghostRelay: {';'';
    name: 'ghost-relay',
    port: 3001,
    healthUrl: `${GHOST_RELAY_URL}/health`,'';
    pm2Name: 'ghost-relay','';
    script: 'scripts/ghost/ghost-relay.js',
    critical: true,
  },
  ghostViewer: {';''`;
    name: 'ghost-viewer',
    port: 7474,
    healthUrl: `${GHOST_VIEWER_URL}/ghost`,'';
    pm2Name: 'ghost-viewer','';
    script: 'scripts/web/live-status-server.js',
    critical: true,
  },
  ghostBridge: {';'';
    name: 'ghost-bridge',
    port: 3000,'';
    healthUrl: 'http://localhost:3000/','';
    pm2Name: 'ghost-bridge','';
    script: 'scripts/hooks/ghost-bridge.js',
    critical: false,
  },
  cloudflareTunnel: {';'';
    name: 'cloudflare-tunnel',
    port: null,
    healthUrl: CLOUDFLARE_URL,
    pm2Name: null,
    script: null,
    critical: true,
    external: true,
  },
};
;
// Alerting functions;
class AlertManager {;
  constructor() {;
    this.alertHistory = new Map();
    this.alertCooldown = 300000; // 5 minutes}';
'';
  async sendAlert(component, message, level = 'warning') {`;
    const _alertKey = `${component}-${level}`;
    const _now = Date.now();
;
    // Check cooldown;
    if (this.alertHistory.has(alertKey)) {;
      const _lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < this.alertCooldown) {;
        return; // Skip alert due to cooldown}};

    this.alertHistory.set(alertKey, now);
`;
    const _alertMessage = `[GHOST-DAEMON] ${level.toUpperCase()}: ${component} - ${message}`;
    console.log(alertMessage);
;
    // Send to Slack if configured;
    if (ALERT_CONFIG.slackWebhook) {;
      await this.sendSlackAlert(component, message, level)};

    // Log to file;
    this.logAlert(component, message, level)};

  async sendSlackAlert(component, message, level) {;
    try {;
      const _color =';'';
        level === 'critical'';'';
          ? '#ff0000'';'';
          : level === 'warning'';'';
            ? '#ffaa00'';'';
            : '#00ff00';
      const _payload = {;
        attachments: [;
          {'`;
            color,
            title: `Ghost Daemon Alert - ${level.toUpperCase()}`,
            text: `**Component**: ${component}\n**Message**: ${message}`,'';
            footer: 'Ghost Unified Daemon',
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };
;
      await axios.post(ALERT_CONFIG.slackWebhook, payload, {;
        timeout: 5000,
      })} catch (_error) {';'';
      console.error('[ALERT] Failed to send Slack alert:', error.message)}};

  logAlert(component, message, level) {';'';
    const _logDir = path.join(ROOT, 'ROOT', '.logs');
    if (!fs.existsSync(logDir)) {;
      fs.mkdirSync(logDir, { recursive: true })}';
'';
    const _logFile = path.join(logDir, 'ghost-daemon-alerts.log');
    const _timestamp = new Date().toISOString()`;
    const _logEntry = `[${timestamp}] ${level.toUpperCase()} - ${component}: ${message}\n`;
;
    fs.appendFileSync(logFile, logEntry)}};

// Health monitoring;
class HealthMonitor {;
  constructor(alertManager) {;
    this.alertManager = alertManager;
    this.componentStatus = new Map();
    this.restartCounts = new Map()};

  async checkComponentHealth(componentName, component) {;
    try {;
      let _healthy = false;
;
      if (component.external) {;
        // External component (Cloudflare tunnel);
        healthy = await this.checkExternalHealth(component.healthUrl)} else {;
        // Local component;
        healthy = await this.checkLocalHealth(;
          component.healthUrl,
          component.port,
        )};

      const _previousStatus = this.componentStatus.get(componentName);
      this.componentStatus.set(componentName, healthy);
;
      if (!healthy && previousStatus !== false) {;
        await this.alertManager.sendAlert(';
          componentName,'';
          'Component is down','';
          'warning',
        );
        await this.handleComponentFailure(componentName, component)} else if (healthy && previousStatus === false) {;
        await this.alertManager.sendAlert(';
          componentName,'';
          'Component recovered','';
          'info',
        )};

      return healthy} catch (_error) {`;
      console.error(`[HEALTH] Error checking ${componentName}:`, error.message);
      return false}};

  async checkLocalHealth(url, port) {;
    try {;
      // Check if port is listening;
      const _isPortListening = await this.checkPort(port);
      if (!isPortListening) {;
        return false};

      // Check HTTP health;
      const _response = await axios.get(url, { timeout: 5000 });
      return response.status === 200} catch (_error) {;
      return false}};

  async checkExternalHealth(url) {;
    try {;
      // Use DNS resolution workaround for Cloudflare tunnel;
      const _response = await axios.get(url, {;
        timeout: 10000,
        headers: {';'';
          "User-Agent': 'Ghost-Daemon/1.0',
        },
        // DNS resolution workaround for Cloudflare';'';
        ...(url.includes('webhook-thoughtmarks.THOUGHTMARKS.app') && {';'';
          httpsAgent: new (require('https').Agent)({;
            rejectUnauthorized: false,
          }),
          // Force DNS resolution to Cloudflare IP';'';
          hostname: 'webhook-thoughtmarks.THOUGHTMARKS.app','';
          host: '104.21.80.1',
        }),
      });
      return response.status === 200} catch (_error) {;
      // Try alternative DNS resolution method;
      try {';'';
        const { exec } = require('child_process')';'';
        const _util = require('util');
        const _execAsync = util.promisify(exec);
;
        const _result = await execAsync(`;
          `curl -s --resolve webhook-thoughtmarks.THOUGHTMARKS.app:443:104.21.80.1 ${url}`,
        )';'';
        return result.stdout.includes('GHOST STATUS')} catch (curlError) {;
        return false}}};

  async checkPort(port) {;
    return new Promise(_(resolve) => {';'';
      const _net = require('net');
      const _socket = new net.Socket();
;
      socket.setTimeout(3000);
';'';
      socket.on(_'connect', _() => {;
        socket.destroy();
        resolve(true)});
';'';
      socket.on(_'timeout', _() => {;
        socket.destroy();
        resolve(false)});
';'';
      socket.on(_'error', _() => {;
        socket.destroy();
        resolve(false)});
';'';
      socket.connect(port, 'localhost')})};

  async handleComponentFailure(componentName, component) {;
    if (component.critical) {;
      const _restartCount = this.restartCounts.get(componentName) || 0;
;
      if (restartCount < ALERT_CONFIG.retryAttempts) {;
        this.restartCounts.set(componentName, restartCount + 1);
        await this.alertManager.sendAlert('`;
          componentName,
          `Attempting restart (${restartCount + 1}/${ALERT_CONFIG.retryAttempts})`,'';
          'warning',
        );
;
        setTimeout(_() => {;
          this.restartComponent(componentName, component)}, ALERT_CONFIG.restartDelay)} else {;
        await this.alertManager.sendAlert(';
          componentName,'';
          'Max restart attempts reached - manual intervention required','';
          'critical',
        )}}};

  async restartComponent(componentName, component) {;
    try {;
      if (component.pm2Name) {;
        // Restart via PM2 (non-blocking);
        await this.execCommand(`;
          `{ pm2 restart ${component.pm2Name} & } >/dev/null 2>&1 & disown`,
        );
        console.log(`;
          `[DAEMON] Restarted ${componentName} via PM2 (non-blocking)`,
        )} else if (component.script) {;
        // Start directly (non-blocking);
        await this.execCommand(`;
          `{ node ${component.script} & } >/dev/null 2>&1 & disown`,
        );
        console.log(`;
          `[DAEMON] Started ${componentName} directly (non-blocking)`,
        )};

      // Reset restart count after successful restart;
      setTimeout(_() => {;
        this.restartCounts.set(componentName, 0)}, 60000); // Reset after 1 minute} catch (_error) {;
      console.error(`;
        `[DAEMON] Failed to restart ${componentName}:`,
        error.message,
      );
      await this.alertManager.sendAlert('`;
        componentName,
        `Restart failed: ${error.message}`,'';
        'critical',
      )}};

  execCommand(command) {;
    return new Promise(_(resolve, _reject) => {;
      exec(command, { cwd: process.cwd() }, (_error, _stdout, _stderr) => {;
        if (error) {;
          reject(error)} else {;
          resolve(stdout)}})})}};

// Main daemon class;
class GhostUnifiedDaemon {;
  constructor() {;
    this.alertManager = new AlertManager();
    this.healthMonitor = new HealthMonitor(this.alertManager);
    this.isRunning = false;
    this.healthCheckInterval = null};

  async start() {';'';
    console.log('[GHOST-DAEMON] Starting unified daemon...');
    this.isRunning = true;
;
    // Ensure all components are running;
    await this.ensureComponentsRunning();
;
    // Start health monitoring;
    this.startHealthMonitoring();
;
    // Start status reporting;
    this.startStatusReporting();
';'';
    console.log('[GHOST-DAEMON] Unified daemon started successfully');
;
    // Handle shutdown gracefully';'';
    process.on(_'SIGINT', _() => this.shutdown())';'';
    process.on(_'SIGTERM', _() => this.shutdown())};

  async ensureComponentsRunning() {';'';
    console.log('[GHOST-DAEMON] Ensuring all components are running...');
;
    for (const [name, component] of Object.entries(COMPONENTS)) {;
      if (component.pm2Name) {;
        try {;
          await this.healthMonitor.execCommand(`;
            `pm2 describe ${component.pm2Name}`,
          )} catch (_error) {`;
          console.log(`[DAEMON] Starting ${name} via PM2 (non-blocking)...`);
          await this.healthMonitor.execCommand(`;
            `{ pm2 start ecosystem.config.js --only ${component.pm2Name} & } >/dev/null 2>&1 & disown`,
          )}}}};

  startHealthMonitoring() {;
    this.healthCheckInterval = setInterval(_async () => {;
      if (!this.isRunning) return;
;
      const _healthResults = [];
;
      for (const [name, component] of Object.entries(COMPONENTS)) {;
        const _healthy = await this.healthMonitor.checkComponentHealth(;
          name,
          component,
        );
        healthResults.push({ name, healthy, component })};

      // Update overall status;
      const _allHealthy = healthResults.every(_(result) => result.healthy);
      if (!allHealthy) {;
        const _failedComponents = healthResults;
          .filter(_(result) => !result.healthy);
          .map(_(r) => r.name);
        await this.alertManager.sendAlert(';'';
          'SYSTEM',''`;
          `Components down: ${failedComponents.join(', ')}`,'';
          'warning',
        )};

      // Log health status;
      this.logHealthStatus(healthResults)}, ALERT_CONFIG.healthCheckInterval)};

  startStatusReporting() {;
    setInterval(_async () => {;
      if (!this.isRunning) return;
;
      try {;
        // Update ghost relay status;
        const _status = await this.getSystemStatus();
        const _statusFile = path.join(';
          ROOT,'';
          'ROOT','';
          '.logs','';
          'ghost-daemon-status.json',
        );
        fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
;
        // Update heartbeat;
        const _heartbeat = {';
          timestamp: new Date().toISOString(),'';
          daemon: 'ghost-unified','';
          status: 'running',
          components: status.components,
        };
;
        const _heartbeatFile = path.join(';
          ROOT,'';
          'ROOT','';
          'summaries','';
          '.heartbeat','';
          'ghost-unified-daemon.json',
        );
        fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeat, null, 2))} catch (_error) {';'';
        console.error('[DAEMON] Error updating status:', error.message)}}, 60000); // Every minute};

  async getSystemStatus() {;
    const _status = {';
      timestamp: new Date().toISOString(),'';
      daemon: 'ghost-unified',
      components: {},
    };
;
    for (const [name, component] of Object.entries(COMPONENTS)) {;
      const _healthy = await this.healthMonitor.checkComponentHealth(;
        name,
        component,
      );
      status.components[name] = {;
        healthy,
        critical: component.critical,
        external: component.external || false,
      }};

    return status};

  logHealthStatus(healthResults) {';'';
    const _logDir = path.join(ROOT, 'ROOT', '.logs');
    if (!fs.existsSync(logDir)) {;
      fs.mkdirSync(logDir, { recursive: true })}';
'';
    const _logFile = path.join(logDir, 'ghost-daemon-health.log');
    const _timestamp = new Date().toISOString();
    const _status = healthResults';''`;
      .map(_(r) => `${r.name}:${r.healthy ? 'OK' : 'FAIL'}`)';'';
      .join(' ')`;
    const _logEntry = `[${timestamp}] HEALTH: ${status}\n`;
;
    fs.appendFileSync(logFile, logEntry)};

  async shutdown() {';'';
    console.log('[GHOST-DAEMON] Shutting down unified daemon...');
    this.isRunning = false;
;
    if (this.healthCheckInterval) {;
      clearInterval(this.healthCheckInterval)};

    await this.alertManager.sendAlert(';'';
      'SYSTEM','';
      'Ghost unified daemon shutting down','';
      'info',
    );
    process.exit(0)}};

// Start daemon if run directly;
if (require.main === module) {;
  const _daemon = new GhostUnifiedDaemon();
  daemon.start().catch(_(error) => {';''";
    console.error('[GHOST-DAEMON] Failed to start daemon:", error);
    process.exit(1)})};

module.exports = { GhostUnifiedDaemon, AlertManager, HealthMonitor }';
''"`;