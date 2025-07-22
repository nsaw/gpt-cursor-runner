// ghost-unified-daemon.js: Unified daemon for ghost relay system monitoring and alerting
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');

const ROOT = '/Users/sawyer/gitSync/.cursor-cache/';
const GHOST_RELAY_URL = 'http://localhost:3001';
const GHOST_VIEWER_URL = 'http://localhost:7474';
const CLOUDFLARE_URL = 'https://webhook-thoughtmarks.THOUGHTMARKS.app/ghost';

// Alerting configuration
const ALERT_CONFIG = {
  slackWebhook: process.env.SLACK_WEBHOOK_URL,
  email: process.env.ALERT_EMAIL,
  retryAttempts: 3,
  retryDelay: 5000, // 5 seconds
  healthCheckInterval: 30000, // 30 seconds
  restartDelay: 10000, // 10 seconds
};

// Component definitions
const COMPONENTS = {
  ghostRelay: {
    name: 'ghost-relay',
    port: 3001,
    healthUrl: `${GHOST_RELAY_URL}/health`,
    pm2Name: 'ghost-relay',
    script: 'scripts/ghost/ghost-relay.js',
    critical: true
  },
  ghostViewer: {
    name: 'ghost-viewer',
    port: 7474,
    healthUrl: `${GHOST_VIEWER_URL}/ghost`,
    pm2Name: 'ghost-viewer',
    script: 'scripts/web/live-status-server.js',
    critical: true
  },
  ghostBridge: {
    name: 'ghost-bridge',
    port: 3000,
    healthUrl: 'http://localhost:3000/',
    pm2Name: 'ghost-bridge',
    script: 'scripts/hooks/ghost-bridge.js',
    critical: false
  },
  cloudflareTunnel: {
    name: 'cloudflare-tunnel',
    port: null,
    healthUrl: CLOUDFLARE_URL,
    pm2Name: null,
    script: null,
    critical: true,
    external: true
  }
};

// Alerting functions
class AlertManager {
  constructor() {
    this.alertHistory = new Map();
    this.alertCooldown = 300000; // 5 minutes
  }

  async sendAlert(component, message, level = 'warning') {
    const alertKey = `${component}-${level}`;
    const now = Date.now();
    
    // Check cooldown
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < this.alertCooldown) {
        return; // Skip alert due to cooldown
      }
    }
    
    this.alertHistory.set(alertKey, now);
    
    const alertMessage = `[GHOST-DAEMON] ${level.toUpperCase()}: ${component} - ${message}`;
    console.log(alertMessage);
    
    // Send to Slack if configured
    if (ALERT_CONFIG.slackWebhook) {
      await this.sendSlackAlert(component, message, level);
    }
    
    // Log to file
    this.logAlert(component, message, level);
  }

  async sendSlackAlert(component, message, level) {
    try {
      const color = level === 'critical' ? '#ff0000' : level === 'warning' ? '#ffaa00' : '#00ff00';
      const payload = {
        attachments: [{
          color: color,
          title: `Ghost Daemon Alert - ${level.toUpperCase()}`,
          text: `**Component**: ${component}\n**Message**: ${message}`,
          footer: 'Ghost Unified Daemon',
          ts: Math.floor(Date.now() / 1000)
        }]
      };
      
      await axios.post(ALERT_CONFIG.slackWebhook, payload, {
        timeout: 5000
      });
    } catch (error) {
      console.error('[ALERT] Failed to send Slack alert:', error.message);
    }
  }

  logAlert(component, message, level) {
    const logDir = path.join(ROOT, 'ROOT', '.logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'ghost-daemon-alerts.log');
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()} - ${component}: ${message}\n`;
    
    fs.appendFileSync(logFile, logEntry);
  }
}

// Health monitoring
class HealthMonitor {
  constructor(alertManager) {
    this.alertManager = alertManager;
    this.componentStatus = new Map();
    this.restartCounts = new Map();
  }

  async checkComponentHealth(componentName, component) {
    try {
      let healthy = false;
      
      if (component.external) {
        // External component (Cloudflare tunnel)
        healthy = await this.checkExternalHealth(component.healthUrl);
      } else {
        // Local component
        healthy = await this.checkLocalHealth(component.healthUrl, component.port);
      }
      
      const previousStatus = this.componentStatus.get(componentName);
      this.componentStatus.set(componentName, healthy);
      
      if (!healthy && previousStatus !== false) {
        await this.alertManager.sendAlert(componentName, 'Component is down', 'warning');
        await this.handleComponentFailure(componentName, component);
      } else if (healthy && previousStatus === false) {
        await this.alertManager.sendAlert(componentName, 'Component recovered', 'info');
      }
      
      return healthy;
    } catch (error) {
      console.error(`[HEALTH] Error checking ${componentName}:`, error.message);
      return false;
    }
  }

  async checkLocalHealth(url, port) {
    try {
      // Check if port is listening
      const isPortListening = await this.checkPort(port);
      if (!isPortListening) {
        return false;
      }
      
      // Check HTTP health
      const response = await axios.get(url, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  async checkExternalHealth(url) {
    try {
      // Use DNS resolution workaround for Cloudflare tunnel
      const response = await axios.get(url, { 
        timeout: 10000,
        headers: {
          'User-Agent': 'Ghost-Daemon/1.0'
        },
        // DNS resolution workaround for Cloudflare
        ...(url.includes('webhook-thoughtmarks.THOUGHTMARKS.app') && {
          httpsAgent: new (require('https').Agent)({
            rejectUnauthorized: false
          }),
          // Force DNS resolution to Cloudflare IP
          hostname: 'webhook-thoughtmarks.THOUGHTMARKS.app',
          host: '104.21.80.1'
        })
      });
      return response.status === 200;
    } catch (error) {
      // Try alternative DNS resolution method
      try {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        
        const result = await execAsync(`curl -s --resolve webhook-thoughtmarks.THOUGHTMARKS.app:443:104.21.80.1 ${url}`);
        return result.stdout.includes('GHOST STATUS');
      } catch (curlError) {
        return false;
      }
    }
  }

  async checkPort(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(3000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(port, 'localhost');
    });
  }

  async handleComponentFailure(componentName, component) {
    if (component.critical) {
      const restartCount = this.restartCounts.get(componentName) || 0;
      
      if (restartCount < ALERT_CONFIG.retryAttempts) {
        this.restartCounts.set(componentName, restartCount + 1);
        await this.alertManager.sendAlert(componentName, `Attempting restart (${restartCount + 1}/${ALERT_CONFIG.retryAttempts})`, 'warning');
        
        setTimeout(() => {
          this.restartComponent(componentName, component);
        }, ALERT_CONFIG.restartDelay);
      } else {
        await this.alertManager.sendAlert(componentName, 'Max restart attempts reached - manual intervention required', 'critical');
      }
    }
  }

  async restartComponent(componentName, component) {
    try {
      if (component.pm2Name) {
        // Restart via PM2
        await this.execCommand(`pm2 restart ${component.pm2Name}`);
        console.log(`[DAEMON] Restarted ${componentName} via PM2`);
      } else if (component.script) {
        // Start directly
        await this.execCommand(`node ${component.script} &`);
        console.log(`[DAEMON] Started ${componentName} directly`);
      }
      
      // Reset restart count after successful restart
      setTimeout(() => {
        this.restartCounts.set(componentName, 0);
      }, 60000); // Reset after 1 minute
      
    } catch (error) {
      console.error(`[DAEMON] Failed to restart ${componentName}:`, error.message);
      await this.alertManager.sendAlert(componentName, `Restart failed: ${error.message}`, 'critical');
    }
  }

  execCommand(command) {
    return new Promise((resolve, reject) => {
      exec(command, { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }
}

// Main daemon class
class GhostUnifiedDaemon {
  constructor() {
    this.alertManager = new AlertManager();
    this.healthMonitor = new HealthMonitor(this.alertManager);
    this.isRunning = false;
    this.healthCheckInterval = null;
  }

  async start() {
    console.log('[GHOST-DAEMON] Starting unified daemon...');
    this.isRunning = true;
    
    // Ensure all components are running
    await this.ensureComponentsRunning();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    // Start status reporting
    this.startStatusReporting();
    
    console.log('[GHOST-DAEMON] Unified daemon started successfully');
    
    // Handle shutdown gracefully
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  async ensureComponentsRunning() {
    console.log('[GHOST-DAEMON] Ensuring all components are running...');
    
    for (const [name, component] of Object.entries(COMPONENTS)) {
      if (component.pm2Name) {
        try {
          await this.healthMonitor.execCommand(`pm2 describe ${component.pm2Name}`);
        } catch (error) {
          console.log(`[DAEMON] Starting ${name} via PM2...`);
          await this.healthMonitor.execCommand(`pm2 start ecosystem.config.js --only ${component.pm2Name}`);
        }
      }
    }
  }

  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      const healthResults = [];
      
      for (const [name, component] of Object.entries(COMPONENTS)) {
        const healthy = await this.healthMonitor.checkComponentHealth(name, component);
        healthResults.push({ name, healthy, component });
      }
      
      // Update overall status
      const allHealthy = healthResults.every(result => result.healthy);
      if (!allHealthy) {
        const failedComponents = healthResults.filter(result => !result.healthy).map(r => r.name);
        await this.alertManager.sendAlert('SYSTEM', `Components down: ${failedComponents.join(', ')}`, 'warning');
      }
      
      // Log health status
      this.logHealthStatus(healthResults);
      
    }, ALERT_CONFIG.healthCheckInterval);
  }

  startStatusReporting() {
    setInterval(async () => {
      if (!this.isRunning) return;
      
      try {
        // Update ghost relay status
        const status = await this.getSystemStatus();
        const statusFile = path.join(ROOT, 'ROOT', '.logs', 'ghost-daemon-status.json');
        fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
        
        // Update heartbeat
        const heartbeat = {
          timestamp: new Date().toISOString(),
          daemon: 'ghost-unified',
          status: 'running',
          components: status.components
        };
        
        const heartbeatFile = path.join(ROOT, 'ROOT', 'summaries', '.heartbeat', 'ghost-unified-daemon.json');
        fs.writeFileSync(heartbeatFile, JSON.stringify(heartbeat, null, 2));
        
      } catch (error) {
        console.error('[DAEMON] Error updating status:', error.message);
      }
    }, 60000); // Every minute
  }

  async getSystemStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      daemon: 'ghost-unified',
      components: {}
    };
    
    for (const [name, component] of Object.entries(COMPONENTS)) {
      const healthy = await this.healthMonitor.checkComponentHealth(name, component);
      status.components[name] = {
        healthy,
        critical: component.critical,
        external: component.external || false
      };
    }
    
    return status;
  }

  logHealthStatus(healthResults) {
    const logDir = path.join(ROOT, 'ROOT', '.logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const logFile = path.join(logDir, 'ghost-daemon-health.log');
    const timestamp = new Date().toISOString();
    const status = healthResults.map(r => `${r.name}:${r.healthy ? 'OK' : 'FAIL'}`).join(' ');
    const logEntry = `[${timestamp}] HEALTH: ${status}\n`;
    
    fs.appendFileSync(logFile, logEntry);
  }

  async shutdown() {
    console.log('[GHOST-DAEMON] Shutting down unified daemon...');
    this.isRunning = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.alertManager.sendAlert('SYSTEM', 'Ghost unified daemon shutting down', 'info');
    process.exit(0);
  }
}

// Start daemon if run directly
if (require.main === module) {
  const daemon = new GhostUnifiedDaemon();
  daemon.start().catch(error => {
    console.error('[GHOST-DAEMON] Failed to start daemon:', error);
    process.exit(1);
  });
}

module.exports = { GhostUnifiedDaemon, AlertManager, HealthMonitor }; 