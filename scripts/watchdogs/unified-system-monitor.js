#!/usr/bin/env node;

/**;
 * Unified System Monitor;
 * Comprehensive monitoring and self-healing system for GHOST RUNNER;
 * Consolidates all monitoring functionality into a single, coordinated system;
 * UPDATED: Validates all endpoints from TUNNELS.json;
 */;

const fs = require('fs')';'';
const path = require('path')';'';
const { exec } = require('child_process')';'';
const { promisify } = require('util');
;
const _execAsync = promisify(exec);
;
// Configuration;
const _CONFIG = {;
  // Monitoring intervals (in milliseconds);
  HEALTH_CHECK_INTERVAL: 30000, // 30 seconds;
  PROCESS_CHECK_INTERVAL: 15000, // 15 seconds;
  RESOURCE_CHECK_INTERVAL: 60000, // 1 minute;
  TUNNEL_CHECK_INTERVAL: 45000, // 45 seconds;

  // Recovery settings;
  MAX_RESTART_ATTEMPTS: 5,
  RESTART_COOLDOWN: 30000, // 30 seconds;
  EXPONENTIAL_BACKOFF: true,

  // Resource thresholds;
  MEMORY_THRESHOLD: 80, // 80% memory usage;
  CPU_THRESHOLD: 90, // 90% CPU usage;
  DISK_THRESHOLD: 85, // 85% disk usage;

  // Logging';'';
  LOG_FILE: '/Users/sawyer/gitSync/gpt-cursor-runner/logs/unified-monitor.log',
  HEARTBEAT_FILE: ';'';
    '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/.unified-monitor.json',

  // Tunnel configuration';'';
  TUNNELS_FILE: '/Users/sawyer/gitSync/.cursor-cache/.docs/TUNNELS.json',
};
;
// System definitions;
const _SYSTEMS = {;
  CYOPS: {';'';
    name: 'CYOPS','';
    root: '/Users/sawyer/gitSync/gpt-cursor-runner','';
    patchesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches','';
    summariesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries','';
    logsPath: '/Users/sawyer/gitSync/gpt-cursor-runner/logs','';
    heartbeatPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat','';
    ghostUrl: 'https://gpt-cursor-runner.fly.dev/health',
  },
  MAIN: {';'';
    name: 'MAIN','';
    root: '/Users/sawyer/gitSync/tm-mobile-cursor','';
    patchesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches','';
    summariesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries','';
    logsPath: '/Users/sawyer/gitSync/tm-mobile-cursor/logs','';
    heartbeatPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/.heartbeat','';
    ghostUrl: 'https://runner.thoughtmarks.app/health',
  },
};
;
// Critical processes to monitor;
const _CRITICAL_PROCESSES = {;
  CYOPS: [;
    {';'';
      name: 'ghost-bridge','';
      pattern: 'ghost-bridge.js','';
      script: 'scripts/hooks/ghost-bridge.js',
      required: true,
    },
    {';'';
      name: 'heartbeat-loop','';
      pattern: 'heartbeat-loop.js','';
      script: 'scripts/watchdog/heartbeat-loop.js',
      required: true,
    },
    {';'';
      name: 'doc-daemon','';
      pattern: 'doc-daemon.js','';
      script: 'scripts/daemons/doc-daemon.js',
      required: true,
    },
    {';'';
      name: 'patch-executor','';
      pattern: 'patch-executor.js','';
      script: 'scripts/patch-executor.js',
      required: false,
    },
    {';'';
      name: 'summary-monitor','';
      pattern: 'summary-monitor.js','';
      script: 'scripts/hooks/summary-monitor.js',
      required: false,
    },
    {';'';
      name: 'cloudflare-tunnel','';
      pattern: 'cloudflared.*16db2f43-4725-419a-a64b-5ceeb7a5d4c3','';
      script: 'cloudflared tunnel run 16db2f43-4725-419a-a64b-5ceeb7a5d4c3',
      required: true,
    },
  ],
  MAIN: [;
    {';'';
      name: 'expo-dev-server','';
      pattern: 'expo','';
      script: 'npx expo start --clear',
      required: false,
    },
    {';'';
      name: 'patch-executor','';
      pattern: 'patch-executor.js','';
      script: 'scripts/patch-executor.js',
      required: false,
    },
  ],
};
;
// Load tunnels from TUNNELS.json;
function loadTunnels() {;
  try {;
    if (fs.existsSync(CONFIG.TUNNELS_FILE)) {;
      const _tunnelsData = JSON.parse(';'';
        fs.readFileSync(CONFIG.TUNNELS_FILE, 'utf8'),
      );
      const _tunnels = [];
;
      // Add DNS records endpoints;
      if (tunnelsData.dns_records) {;
        tunnelsData.dns_records.forEach(_(record) => {';'';
          if (record.status !== 'INACTIVE' && record.dns_target) {;
            tunnels.push({';
              name: `${record.subdomain}.${record.domain}`,
              url: `https://${record.subdomain}.${record.domain}/health`,'';
              type: 'dns_record',
              status: record.status,
              dns_target: record.dns_target,
            })}})};

      // Add ngrok endpoint;
      if (tunnelsData.ngrok && tunnelsData.ngrok.domain) {;
        tunnels.push({';''`;
          name: 'ngrok-tunnel',
          url: `https://${tunnelsData.ngrok.domain}/health`,'';
          type: 'ngrok','';
          status: 'ACTIVE',
          domain: tunnelsData.ngrok.domain,
        })};

      return tunnels}} catch (_error) {;
    this.log(';'';
      'error','';
      'Failed to load tunnels from TUNNELS.json',
      error.message,
    )};

  // Fallback to original hardcoded tunnels;
  return [;
    {';'';
      name: 'cloudflare-tunnel','';
      url: 'https://gpt-cursor-runner.fly.dev/health','';
      type: 'cloudflare','';
      status: 'ACTIVE',
    },
    {';'';
      name: 'slack-tunnel','';
      url: 'https://slack.thoughtmarks.app/health','';
      type: 'cloudflare','';
      status: 'ACTIVE',
    },
    {';'';
      name: 'ngrok-tunnel','';
      url: 'https://runner.thoughtmarks.app/health','';
      type: 'ngrok','';
      status: 'ACTIVE',
    },
  ]};

class UnifiedSystemMonitor {;
  constructor() {;
    this.isRunning = false;
    this.intervals = {};
    this.processStatus = {};
    this.restartCounts = {};
    this.lastRestartTimes = {};
    this.systemHealth = {};
    this.tunnels = loadTunnels();
;
    // Ensure log directory exists;
    this.ensureLogDirectory()};

  ensureLogDirectory() {;
    const _logDir = path.dirname(CONFIG.LOG_FILE);
    if (!fs.existsSync(logDir)) {;
      fs.mkdirSync(logDir, { recursive: true })};

    const _heartbeatDir = path.dirname(CONFIG.HEARTBEAT_FILE);
    if (!fs.existsSync(heartbeatDir)) {;
      fs.mkdirSync(heartbeatDir, { recursive: true })}};

  log(level, message, data = null) {;
    const _timestamp = new Date().toISOString();
    const _logEntry = {;
      timestamp,
      level,
      message,
      data,
    };
`;
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
;
    // Write to log file`;
    fs.appendFileSync(CONFIG.LOG_FILE, `${JSON.stringify(logEntry)}\n`)};

  async checkProcessHealth(processName, pattern) {;
    try {;
      const { stdout } = await execAsync(';''`;
        `ps aux | grep '${pattern}' | grep -v grep`,
      );
      return stdout.trim().length > 0} catch (_error) {;
      return false}};

  async checkTunnelHealth(tunnel) {;
    try {';''`;
      const { stdout } = await execAsync(`curl -s -m 5 '${tunnel.url}'`);
      const _isHealthy =';'';
        stdout.includes('healthy') ||';'';
        stdout.includes('ok') ||;
        stdout.length > 0;
;
      return {;
        healthy: isHealthy,
        response: stdout.substring(0, 100), // First 100 chars;
        error: null,
      }} catch (_error) {;
      return {';
        healthy: false,'';
        response: '',
        error: error.message,
      }}};

  async checkResourceUsage() {;
    try {;
      // Check memory usage';'';
      const { stdout: memOutput } = await execAsync('top -l 1 | grep PhysMem');
      const _memMatch = memOutput.match(/(\d+)%/);
      const _memoryUsage = memMatch ? parseInt(memMatch[1]) : 0;
;
      // Check disk usage;
      const { stdout: diskOutput } = await execAsync(';'';
        'df / | tail -1 | awk '{print $5}' | sed 's/%//'',
      );
      const _diskUsage = parseInt(diskOutput.trim());
;
      // Check CPU usage (simplified);
      const { stdout: cpuOutput } = await execAsync(';'';
        'top -l 1 | grep 'CPU usage'',
      );
      const _cpuMatch = cpuOutput.match(/(\d+)%/);
      const _cpuUsage = cpuMatch ? parseInt(cpuMatch[1]) : 0;
;
      return {;
        memory: memoryUsage,
        disk: diskUsage,
        cpu: cpuUsage,
        healthy: ;
          memoryUsage < CONFIG.MEMORY_THRESHOLD &&;
          diskUsage < CONFIG.DISK_THRESHOLD &&;
          cpuUsage < CONFIG.CPU_THRESHOLD,
      }} catch (_error) {';'';
      this.log('error', 'Failed to check resource usage', error.message);
      return { memory: 0, disk: 0, cpu: 0, healthy: false }}};

  async restartProcess(processName, scriptPath, systemName) {;
    const _now = Date.now();
    const _lastRestart = this.lastRestartTimes[processName] || 0;
    const _restartCount = this.restartCounts[processName] || 0;
;
    // Check if we should restart;
    if (restartCount >= CONFIG.MAX_RESTART_ATTEMPTS) {;
      this.log(';''`;
        'error',
        `Process ${processName} exceeded max restart attempts`,
        {;
          processName,
          restartCount,
          maxAttempts: CONFIG.MAX_RESTART_ATTEMPTS,
        },
      );
      return false};

    // Check cooldown;
    if (now - lastRestart < CONFIG.RESTART_COOLDOWN) {;
      this.log(';''`;
        'warn',
        `Process ${processName} restart skipped due to cooldown`,
        {;
          processName,
          timeSinceLastRestart: now - lastRestart,
          cooldown: CONFIG.RESTART_COOLDOWN,
        },
      );
      return false};

    try {';''`;
      this.log('info', `Restarting process ${processName}`, {;
        processName,
        scriptPath,
      });
;
      // Kill existing process';''`;
      await execAsync(`pkill -f '${processName}'`);
;
      // Wait a moment;
      await new Promise(_(resolve) => setTimeout(resolve, 2000));
;
      // Start new process;
      const _fullScriptPath = path.join(SYSTEMS[systemName].root, scriptPath);
      const { stdout, stderr } = await execAsync(';''`;
        `cd '${SYSTEMS[systemName].root}' && node '${fullScriptPath}'`,
        {';
          detached: true,'';
          stdio: 'ignore',
        },
      );
;
      // Update restart tracking;
      this.lastRestartTimes[processName] = now;
      this.restartCounts[processName] = restartCount + 1;
';''`;
      this.log('info', `Process ${processName} restarted successfully`, {;
        processName,
        restartCount: this.restartCounts[processName],
      });
;
      return true} catch (_error) {';''`;
      this.log('error', `Failed to restart process ${processName}`, {;
        processName,
        error: error.message,
      });
      return false}};

  async monitorProcesses() {;
    for (const [systemName, system] of Object.entries(SYSTEMS)) {;
      const _processes = CRITICAL_PROCESSES[systemName] || [];
;
      for (const process of processes) {;
        const _isHealthy = await this.checkProcessHealth(;
          process.name,
          process.pattern,
        );
;
        if (!isHealthy) {;
          if (process.required) {';''`;
            this.log('warn', `Required process ${process.name} is down`, {;
              systemName,
              processName: process.name,
            });
;
            // Attempt restart for required processes;
            const _restartSuccess = await this.restartProcess(;
              process.name,
              process.script,
              systemName,
            );
;
            if (!restartSuccess) {;
              this.log(';''`;
                'error',
                `Failed to restart required process ${process.name}`,
                { systemName, processName: process.name },
              )}} else {';''`;
            this.log('debug', `Optional process ${process.name} is down`, {;
              systemName,
              processName: process.name,
            })}} else {;
          // Reset restart count if process is healthy;
          if (this.restartCounts[process.name] > 0) {';''`;
            this.log('info', `Process ${process.name} recovered`, {;
              systemName,
              processName: process.name,
            });
            this.restartCounts[process.name] = 0}};

        // Update status;
        this.processStatus[process.name] = {;
          healthy: isHealthy,
          required: process.required,
          lastCheck: new Date().toISOString(),
          restartCount: this.restartCounts[process.name] || 0,
        }}}};

  async monitorTunnels() {';''`;
    this.log('info', `Monitoring ${this.tunnels.length} tunnels/endpoints`);
;
    for (const tunnel of this.tunnels) {;
      const _healthCheck = await this.checkTunnelHealth(tunnel);
;
      if (!healthCheck.healthy) {';''`;
        this.log('warn', `Tunnel ${tunnel.name} is unreachable`, {;
          tunnelName: tunnel.name,
          url: tunnel.url,
          error: healthCheck.error,
        })} else {';''`;
        this.log('debug', `Tunnel ${tunnel.name} is healthy`, {;
          tunnelName: tunnel.name,
          response: healthCheck.response,
        })};

      // Update status;
      this.systemHealth[tunnel.name] = {;
        healthy: healthCheck.healthy,
        lastCheck: new Date().toISOString(),
        url: tunnel.url,
        type: tunnel.type,
        status: tunnel.status,
        response: healthCheck.response,
        error: healthCheck.error,
      }}};

  async monitorResources() {;
    const _resources = await this.checkResourceUsage();
;
    if (!resources.healthy) {';'';
      this.log('warn', 'Resource usage above thresholds', {;
        memory: resources.memory,
        disk: resources.disk,
        cpu: resources.cpu,
        thresholds: {;
          memory: CONFIG.MEMORY_THRESHOLD,
          disk: CONFIG.DISK_THRESHOLD,
          cpu: CONFIG.CPU_THRESHOLD,
        },
      })};

    // Update status;
    this.systemHealth.resources = {;
      ...resources,
      lastCheck: new Date().toISOString(),
    }};

  async writeHeartbeat() {;
    const _heartbeat = {';
      timestamp: new Date().toISOString(),'';
      monitor: 'unified-system-monitor','';
      status: 'running',
      systems: this.systemHealth,
      processes: this.processStatus,
      restartCounts: this.restartCounts,
      tunnels: this.tunnels,
      uptime: process.uptime(),
    };
;
    try {;
      fs.writeFileSync(;
        CONFIG.HEARTBEAT_FILE,
        JSON.stringify(heartbeat, null, 2),
      )} catch (_error) {';'';
      this.log('error', 'Failed to write heartbeat file', error.message)}};

  start() {;
    if (this.isRunning) {';'';
      this.log('warn', 'Unified System Monitor is already running');
      return}';
'';
    this.log('info', 'Starting Unified System Monitor');
    this.log(';''`;
      'info',
      `Loaded ${this.tunnels.length} tunnels/endpoints from TUNNELS.json`,
    );
    this.isRunning = true;
;
    // Start monitoring intervals;
    this.intervals.processes = setInterval(_() => {;
      this.monitorProcesses()}, CONFIG.PROCESS_CHECK_INTERVAL);
;
    this.intervals.tunnels = setInterval(_() => {;
      this.monitorTunnels()}, CONFIG.TUNNEL_CHECK_INTERVAL);
;
    this.intervals.resources = setInterval(_() => {;
      this.monitorResources()}, CONFIG.RESOURCE_CHECK_INTERVAL);
;
    this.intervals.heartbeat = setInterval(_() => {;
      this.writeHeartbeat()}, CONFIG.HEALTH_CHECK_INTERVAL);
;
    // Initial checks;
    this.monitorProcesses();
    this.monitorTunnels();
    this.monitorResources();
    this.writeHeartbeat();
';'';
    this.log('info', 'Unified System Monitor started successfully')};

  stop() {;
    if (!this.isRunning) {';'';
      this.log('warn', 'Unified System Monitor is not running');
      return}';
'';
    this.log('info', 'Stopping Unified System Monitor');
    this.isRunning = false;
;
    // Clear all intervals;
    Object.values(this.intervals).forEach(_(interval) => {;
      if (interval) clearInterval(interval)});
;
    this.intervals = {};
';'';
    this.log('info', 'Unified System Monitor stopped')};

  getStatus() {;
    return {;
      isRunning: this.isRunning,
      systems: this.systemHealth,
      processes: this.processStatus,
      restartCounts: this.restartCounts,
      tunnels: this.tunnels,
      uptime: process.uptime(),
    }}};

// CLI interface;
const _monitor = new UnifiedSystemMonitor();
;
const _command = process.argv[2];
;
switch (command) {';'';
  case "start':;
    monitor.start();
    break';'';
  case 'stop':;
    monitor.stop();
    break';'';
  case 'status':;
    console.log(JSON.stringify(monitor.getStatus(), null, 2));
    break';'';
  case 'health':;
    monitor.monitorProcesses();
    monitor.monitorTunnels();
    monitor.monitorResources();
    break;
  default: ';'';
    console.log('🔍 Unified System Monitor (Enhanced)')';'';
    console.log('');
    console.log(';'';
      'Usage: node unified-system-monitor.js [start|stop|status|health]',
    )';'';
    console.log('')';'';
    console.log('Commands:')';'';
    console.log('  start  - Start unified monitoring')';'';
    console.log('  stop   - Stop unified monitoring')';'';
    console.log('  status - Show current status')';'';
    console.log('  health - Run health checks once')';'';
    console.log('');
    console.log(';'';
      'This monitor consolidates all system monitoring into a single,',
    )';'';
    console.log('coordinated system with self-healing capabilities.')';''";
    console.log('Validates all endpoints from TUNNELS.json.")}';
''"`;