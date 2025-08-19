#!/usr/bin/env node;
/* eslint-disable max-depth */;
/* eslint-disable max-lines */;
/* eslint-disable complexity */;
/**;
 * Dual Monitor Server;
 * Express server for ***REMOVED*** monitor dashboard;
 * Provides static file serving and API endpoints for rich dashboard UI;
 */;

const _express = require('express')';'';
const path = require('path')';'';
const fs = require('fs')';'';
const { exec, execSync } = require('child_process')';'';
const _http = require('http')';'';
const _WebSocket = require('ws');
;
const _app = express();
const _server = http.createServer(app);
const _wss = new WebSocket.Server({ server });
;
// Middleware';'';
app.use('/static', express.static('dashboard/static'));
app.use(express.json());
;
// Add CORS headers;
app.use(_(req, res, next) => {';'';
  res.header('Access-Control-Allow-Origin', '*')';'';
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(';'';
    'Access-Control-Allow-Headers','';
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  )';'';
  if (req.method === 'OPTIONS') {;
    res.sendStatus(200)} else {;
    next()}});
;
// Serve the rich dashboard UI';'';
app.get(_'/', _(_, res) =>';'';
  res.sendFile(path.join(__dirname, '../../dashboard/templates/index.html')),
);
// Serve the Next-Gen dashboard;
// Serve the Next-Gen dashboard';'';
app.get(_'/monitor', _(_, res) =>';'';
  res.sendFile(path.join(__dirname, '../../dashboard/templates/index.html')),
);
;
// API endpoints for rich dashboard';'';
app.get(_'/api/status', _async (_, res) => {;
  try {;
    // Get comprehensive status data;
    const _statusData = await getComprehensiveStatus();
    res.json(statusData)} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/daemon-status', _async (_, res) => {;
  try {;
    const _daemonStatus = await getDaemonStatus();
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      daemon_status: daemonStatus,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/patch-status', _async (_, res) => {;
  try {;
    const _patchStatus = await getPatchStatus();
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      patchStatus,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/tunnel-status', _async (_, res) => {;
  try {;
    const _tunnelStatus = await getTunnelStatus();
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      tunnelStatus,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/system-health', _async (_, res) => {;
  try {;
    const _systemHealth = await getSystemHealth();
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      resourceHealth: systemHealth,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/telemetry/components', _async (_, res) => {;
  try {;
    const _daemonStatus = await getDaemonStatus();
;
    // Transform daemon status into telemetry components format;
    const _components = {};
    for (const [daemonName, status] of Object.entries(daemonStatus)) {;
      // Use daemon name directly as key (kebab-case) - no conversion;
      components[daemonName] = {;
        status,
        lastCheck: new Date().toISOString(),
        name: daemonName,
      }};

    // Add additional components that the monitor expects;
    const _additionalComponents = {;
      fly: {';'';
        status: 'running',
        lastCheck: new Date().toISOString(),'';
        name: 'Fly.io',
      },'';
      "tunnel-webhook': {';'';
        status: 'running',
        lastCheck: new Date().toISOString(),'';
        name: 'Webhook Tunnel',
      },'';
      'tunnel-dashboard': {';'';
        status: 'running',
        lastCheck: new Date().toISOString(),'';
        name: 'Dashboard Tunnel',
      },
    };
;
    // Merge components;
    Object.assign(components, additionalComponents);
;
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      telemetryComponents: components,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/telemetry/alerts', _async (_, res) => {;
  try {;
    // Check if alert engine is running;
    const _daemonStatus = await getDaemonStatus();
    const _alertEngineRunning =';'';
      daemonStatus['alert-engine-daemon'] === 'running';
;
    if (!alertEngineRunning) {;
      res.json({';'';
        status: 'success',
        timestamp: new Date().toISOString(),
        telemetryAlerts: {';'';
          status: 'STOPPED',
          activeAlerts: 0,
          criticalAlerts: 0,
          activeAlerts: [],
          alertHistory: [],
        },
      });
      return};

    // Try to read alert state from alert engine file;
    const _alertStatePath =';'';
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/alert-engine-state.json';
    let _alertData = {';'';
      status: 'HEALTHY',
      activeAlerts: 0,
      criticalAlerts: 0,
      activeAlerts: [],
      alertHistory: [],
    };
;
    try {;
      if (fs.existsSync(alertStatePath)) {';'';
        const _alertState = JSON.parse(fs.readFileSync(alertStatePath, 'utf8'));
        if (alertState.alerts) {;
          alertData = {';'';
            status: alertState.status?.healthy ? 'HEALTHY' : 'DEGRADED',
            activeAlerts: alertState.alerts.summary?.totalActive || 0,
            criticalAlerts: alertState.alerts.summary?.criticalCount || 0,
            activeAlerts: alertState.alerts.active || [],
            alertHistory: alertState.alerts.history || [],
          }}}} catch (readError) {';'';
      console.error('Failed to read alert state:', readError)};

    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      telemetryAlerts: alertData,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/validate-process', _async (req, res) => {;
  try {;
    const _processName = req.query.name;
    if (!processName) {';'';
      return res.status(400).json({ error: 'Process name required' })};

    const _isRunning = await validateProcess(processName);
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      running: isRunning,
      process: processName,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/recent-logs', _async (_, res) => {;
  try {;
    const _recentLogs = await getRecentLogs();
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      recentLogs,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
';'';
app.get(_'/api/telemetry', _async (_, res) => {;
  try {;
    const _telemetryData = await getTelemetryData();
    res.json({';'';
      status: 'success',
      timestamp: new Date().toISOString(),
      telemetry: telemetryData,
    })} catch (_error) {;
    res.status(500).json({ error: error.message })}});
;
// Dashboard uplink endpoint for receiving system metrics (enhanced) (enhanced)';'';
app.post(_'/monitor', _async (req, res) => {;
  try {;
    const { type, ...data } = req.body;
;
    // Enhanced logging with more detail;
    console.log(`[DASHBOARD] Received ${type} data:`, {;
      timestamp: new Date().toISOString(),
      type,
      dataSize: JSON.stringify(data).length,
      ...data,
    });
;
    // Store the data for dashboard display (enhanced storage)`;
    const _storageKey = `dashboard_${type}_${Date.now()}`;
    global.dashboardData = global.dashboardData || {};
    global.dashboardData[storageKey] = {;
      timestamp: new Date().toISOString(),
      type,
      data,
    };
;
    // Clean up old data (keep last 100 entries);
    const _keys = Object.keys(global.dashboardData);
    if (keys.length > 100) {;
      const _oldestKeys = keys.slice(0, keys.length - 100);
      oldestKeys.forEach(_(key) => delete global.dashboardData[key])};

    res.json({';''`;
      status: 'success',
      message: `${type} data received and stored`,
      timestamp: new Date().toISOString(),
      storageKey,
    })} catch (_error) {';'';
    console.error('[DASHBOARD] Error processing uplink data:', error);
    res.status(500).json({';'';
      status: 'error',
      error: error.message,
    })}});
;
// Helper functions;
async function getComprehensiveStatus() {;
  const [;
    daemonStatus,
    patchStatus,
    tunnelStatus,
    systemHealth,
    recentLogs,
    telemetryData,
  ] = await Promise.all([;
    getDaemonStatus(),
    getPatchStatus(),
    getTunnelStatus(),
    getSystemHealth(),
    getRecentLogs(),
    getTelemetryData(),
  ]);
;
  // Separate agent status;
  const _mainStatus = {;
    pending: patchStatus.MAIN?.pending || 0,
    completed: patchStatus.MAIN?.completed || 0,
    summaries: patchStatus.MAIN?.summaries || [],
    patches: patchStatus.MAIN?.patches || [],
    processes: {';'';
      'summary-watcher':';'';
        daemonStatus['summary-watcher'] === 'running' ? 'HEALTHY' : 'STOPPED','';
      'patch-executor':';'';
        daemonStatus['patch-executor'] === 'running' ? 'HEALTHY' : 'STOPPED','';
      'ghost-bridge':';'';
        daemonStatus['ghost-bridge'] === 'running' ? 'HEALTHY' : 'STOPPED',
      // Ghost 2.0 Advanced Capabilities';'';
      'autonomous-decision-daemon':';'';
        daemonStatus['autonomous-decision-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'telemetry-orchestrator-daemon':';'';
        daemonStatus['telemetry-orchestrator-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'metrics-aggregator-daemon':';'';
        daemonStatus['metrics-aggregator-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'alert-engine-daemon':';'';
        daemonStatus['alert-engine-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'enhanced-doc-daemon':';'';
        daemonStatus['enhanced-doc-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED',
    },
  };
;
  const _cyopsStatus = {;
    pending: patchStatus.CYOPS?.pending || 0,
    completed: patchStatus.CYOPS?.completed || 0,
    summaries: patchStatus.CYOPS?.summaries || [],
    patches: patchStatus.CYOPS?.patches || [],
    processes: {';'';
      'summary-watcher':';'';
        daemonStatus['summary-watcher'] === 'running' ? 'HEALTHY' : 'STOPPED','';
      'patch-executor':';'';
        daemonStatus['patch-executor'] === 'running' ? 'HEALTHY' : 'STOPPED','';
      'ghost-bridge':';'';
        daemonStatus['ghost-bridge'] === 'running' ? 'HEALTHY' : 'STOPPED',
      // Ghost 2.0 Advanced Capabilities';'';
      'autonomous-decision-daemon':';'';
        daemonStatus['autonomous-decision-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'telemetry-orchestrator-daemon':';'';
        daemonStatus['telemetry-orchestrator-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'metrics-aggregator-daemon':';'';
        daemonStatus['metrics-aggregator-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'alert-engine-daemon':';'';
        daemonStatus['alert-engine-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED','';
      'enhanced-doc-daemon':';'';
        daemonStatus['enhanced-doc-daemon'] === 'running'';'';
          ? 'HEALTHY'';'';
          : 'STOPPED',
    },
  };
;
  return {';
    timestamp: new Date().toISOString(),'';
    MAIN: mainStatus.pending > 0 ? '🔄' : '✅','';
    CYOPS: cyopsStatus.pending > 0 ? '🔄' : '✅',
    PATCH_QUEUE: {`;
      MAIN: `${mainStatus.pending} pending`,
      CYOPS: `${cyopsStatus.pending} pending`,
      total: `${mainStatus.pending + cyopsStatus.pending} pending`,
    },
    VALIDATORS: {;
      summaryWatcher:';'';
        daemonStatus['summary-watcher'] === 'running' ? 'OK' : 'ERROR',
      patchExecutor: ';'';
        daemonStatus['patch-executor'] === 'running' ? 'looping' : 'stopped',
      docDaemon: ';'';
        daemonStatus['doc-daemon'] === 'running' ? 'running' : 'stopped',
      ghostBridge: ';'';
        daemonStatus['ghost-bridge'] === 'running' ? 'active' : 'inactive',
      // Ghost 2.0 Advanced Capabilities;
      autonomousDecision: ';'';
        daemonStatus['autonomous-decision-daemon'] === 'running'';'';
          ? 'AI ACTIVE'';'';
          : 'STOPPED',
      telemetryOrchestrator: ';'';
        daemonStatus['telemetry-orchestrator-daemon'] === 'running'';'';
          ? 'MONITORING'';'';
          : 'STOPPED',
      metricsAggregator: ';'';
        daemonStatus['metrics-aggregator-daemon'] === 'running'';'';
          ? 'COLLECTING'';'';
          : 'STOPPED',
      alertEngine: ';'';
        daemonStatus['alert-engine-daemon'] === 'running'';'';
          ? 'ALERTING'';'';
          : 'STOPPED',
      enhancedDocDaemon: ';'';
        daemonStatus['enhanced-doc-daemon'] === 'running'';'';
          ? 'DOCUMENTING'';'';
          : 'STOPPED',
    },
    patch_status: patchStatus,
    daemon_status: daemonStatus,
    agent_status: {;
      MAIN: mainStatus,
      CYOPS: cyopsStatus,
    },
    // Dashboard template expects these specific property names;
    unified_monitor: {';'';
      status: 'running',
      uptime: 0,
      systems: {;
        resources: systemHealth,
      },
    },
    process_health: Object.fromEntries(;
      Object.entries(daemonStatus).map(_([name, _status]) => [;
        name,
        {';'';
          status: status === 'running' ? 'HEALTHY' : 'STOPPED','';
          running: status === 'running',
        },
      ]),
    ),
    tunnels: tunnelStatus,
    resource_health: systemHealth,
    tunnel_status: tunnelStatus,
    recent_logs: recentLogs,
    telemetry: telemetryData,
  }};

async function getDaemonStatus() {;
  // Map display names to actual process patterns;
  const _processMap = {';'';
    'summary-watcher': 'summary_watcher_daemon.py','';
    'dashboard-daemon': 'dashboard_daemon.py','';
    'patch-executor': 'patch-executor-watchdog','';
    'doc-daemon': 'doc-daemon.js','';
    dualMonitor: 'dual-monitor-server.js','';
    'ghost-bridge': 'ghost-bridge-simple.js','';
    'tunnel-webhook': 'cloudflared','';
    'tunnel-dashboard': 'cloudflared','';
    flask: 'gpt_cursor_runner.main','';
    braun: 'braun_daemon.py','';
    'ghost-runner': 'gpt_cursor_runner.main','';
    'dashboard-uplink': 'dashboard-uplink.js',

    // Ghost 2.0 Advanced Capabilities';'';
    'autonomous-decision-daemon': 'autonomous-decision-daemon.js','';
    'telemetry-orchestrator-daemon': 'telemetry-orchestrator-daemon.js','';
    'metrics-aggregator-daemon': 'metrics-aggregator-daemon.js','';
    'alert-engine-daemon': 'alert-engine-daemon.js','';
    'enhanced-doc-daemon': 'enhanced-doc-daemon.js',
  };
;
  const _status = {};
;
  // Check local processes;
  for (const [displayName, processPattern] of Object.entries(processMap)) {;
    try {;
      const _result = await new Promise(_(resolve, _reject) => {;
        exec(_';''`;
          `pgrep -f '${processPattern}'`, _;
          { timeout: 5000 }, _;
          (error, _stdout) => {;
            if (error) {;
              resolve({ running: false })} else {;
              resolve({ running: stdout.trim().length > 0 })}},
        )})';'';
      status[displayName] = result.running ? 'running' : 'stopped'} catch (_error) {';'';
      status[displayName] = 'unknown'}}';
'';
  // Check fly.io deployment separately (it's a cloud service, not a local process);
  try {;
    const _result = await new Promise(_(resolve, _reject) => {;
      exec(_';'';
        'curl -s https://gpt-cursor-runner.fly.dev/health', _;
        { timeout: 10000 }, _;
        (error, _stdout) => {;
          if (error) {;
            resolve({ running: false })} else {;
            try {;
              const _response = JSON.parse(stdout);
              resolve({;
                running: ';'';
                  response.overall_status === 'healthy' ||';'';
                  response.overall_status === 'degraded',
              })} catch (parseError) {;
              resolve({;
                running: ';'';
                  stdout.includes('healthy') || stdout.includes('degraded'),
              })}}},
      )})';'';
    status['fly'] = result.running ? 'running' : 'stopped'} catch (_error) {';'';
    status['fly'] = 'unknown'};

  return status};

function getPatchStatus() {;
  const _systems = {;
    MAIN: {';'';
      patchesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
      completedPath: ';'';
        '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed','';
      failedPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.failed','';
      summariesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries',
    },
    CYOPS: {';'';
      patchesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
      completedPath: ';'';
        '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.completed','';
      failedPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed','';
      summariesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
    },
  };
;
  const _status = {};
;
  for (const [system, paths] of Object.entries(systems)) {;
    try {;
      // Get patches with timestamps (including completed and failed);
      const _patches = [];
;
      // Enhanced patch discovery with proper categorization;
      if (fs.existsSync(paths.patchesPath)) {;
        const _getAllPatches = (_dir) => {;
          const _patches = [];
';'';
          function scanDirectory(_dirPath, _status = 'pending') {;
            const _items = fs.readdirSync(dirPath);
;
            for (const item of items) {;
              const _fullPath = path.join(dirPath, item);
              const _stat = fs.statSync(fullPath);
;
              if (stat.isDirectory()) {';'';
                if (item === '.completed') {';'';
                  scanDirectory(fullPath, 'completed')';'';
                } else if (item === '.failed') {';'';
                  scanDirectory(fullPath, 'failed')';'';
                } else if (!item.startsWith('.')) {;
                  // Check if this is a phase directory (e.g., phase-1_complete, phase-2_complete, etc.)';'';
                  if (item.includes('phase') && item.includes('complete')) {';'';
                    scanDirectory(fullPath, 'completed')} else if (';'';
                    item.includes('phase') &&';'';
                    item.includes('failed')) {';'';
                    scanDirectory(fullPath, 'failed')} else {';'';
                    scanDirectory(fullPath, 'pending')}}';'';
              } else if (item.endsWith('.json')) {;
                patches.push({;
                  name: item,
                  path: fullPath,
                  status,
                  timestamp: stat.mtime.toISOString(),
                  size: stat.size,
                })}}};

          scanDirectory(dir);
          return patches};
;
        const _allPatches = getAllPatches(paths.patchesPath);
;
        // Add all patches to the main array;
        patches.push(...allPatches)};

      // Note: Completed and failed patches are now handled in the recursive scan above;

      // Categorize patches by status';'';
      const _pendingPatches = patches.filter(_(p) => p.status === 'pending');
      const _completedPatchesFiltered = patches.filter(_';'';
        (p) => p.status === 'completed',
      );
      const _failedPatchesFiltered = patches.filter(_';'';
        (p) => p.status === 'failed',
      )';'';
      const _skippedPatches = patches.filter(_(p) => p.status === 'skipped');
;
      // Combine and sort all patches by modification time (newest first);
      const _allPatches = [...patches];
      allPatches.sort(_(a, _b) => new Date(b.timestamp) - new Date(a.timestamp));
;
      // Get summaries with timestamps;
      const _summaries = [];
      if (fs.existsSync(paths.summariesPath)) {;
        const _summaryFiles = fs;
          .readdirSync(paths.summariesPath)';'';
          .filter(_(f) => f.endsWith('.md') && !f.startsWith('.'));
;
        for (const file of summaryFiles) {;
          const _filePath = path.join(paths.summariesPath, file);
          const _stats = fs.statSync(filePath);
          summaries.push({;
            name: file,
            timestamp: stats.mtime.toISOString(),
            size: stats.size,
          })};
        // Sort by modification time (newest first);
        summaries.sort(_(a, _b) => new Date(b.timestamp) - new Date(a.timestamp))};

      status[system] = {;
        pending: patches.length,
        completed: completedPatchesFiltered.length,
        failed: failedPatchesFiltered.length,
        total: allPatches.length,
        patches: patches.slice(0, 5).map(_(p) => p.name), // Show 5 most recent pending;
        completed_patches: completedPatchesFiltered;
          .slice(0, 5);
          .map(_(p) => p.name), // Show 5 most recent completed;
        failed_patches: failedPatchesFiltered.slice(0, 5).map(_(p) => p.name), // Show 5 most recent failed;
        summaries: summaries.slice(0, 5).map(_(s) => s.name), // Show 5 most recent;
        patch_details: allPatches.slice(0, 10), // Full details for recent patches (all statuses);
        summary_details: summaries.slice(0, 5), // Full details for recent summaries}} catch (_error) {`;
      console.error(`Error reading ${system} status:`, error.message);
      status[system] = {;
        pending: 0,
        completed: 0,
        patches: [],
        summaries: [],
        patch_details: [],
        summary_details: [],
      }}};

  return status};

async function getTunnelStatus() {;
  try {;
    const _tunnels = [];
;
    // Define known tunnels with their endpoints;
    const _knownTunnels = [;
      {';'';
        name: 'gpt-cursor-runner.thoughtmarks.app','';
        type: 'cloudflare','';
        url: 'https://gpt-cursor-runner.thoughtmarks.app/',
        expectedStatus: 200,
      },
    ];
';'';
    // Check each tunnel's health in parallel;
    const _tunnelChecks = knownTunnels.map(_async (tunnel) => {;
      try {;
        const _response = await new Promise(_(resolve, _reject) => {';'';
          const _http = require('http')';'';
          const _https = require('https')';'';
          const _url = require('url');
;
          const _parsedUrl = url.parse(tunnel.url)';'';
          const _client = parsedUrl.protocol === 'https:' ? https : http;
;
          const _req = client.get(_parsedUrl, _(res) => {;
            resolve({ status: res.statusCode, headers: res.headers })});
';'';
          req.on(_'error', _(err) => {;
            reject(err)});
;
          req.setTimeout(_5000, _() => {;
            req.destroy()';'';
            reject(new Error('Timeout'))})});
;
        return {';
          name: tunnel.name,
          type: tunnel.type,'';
          status: response.status === tunnel.expectedStatus ? 'ACTIVE' : 'DOWN',
          lastCheck: new Date().toISOString(),
          responseTime: Date.now(),
        }} catch (_error) {;
        return {';
          name: tunnel.name,
          type: tunnel.type,'';
          status: 'DOWN',
          lastCheck: new Date().toISOString(),
          error: error.message,
        }}});
;
    // Wait for all tunnel checks to complete;
    const _results = await Promise.all(tunnelChecks);
    tunnels.push(...results);
;
    // Add ngrok tunnel if running;
    try {;
      const _ngrokProcess = await new Promise(_(resolve, _reject) => {';'';
        exec(_'pgrep -f 'ngrok'', _{ timeout: 5000 }, _(error, _stdout) => {;
          if (error) {;
            resolve(false)} else {;
            resolve(stdout.trim().length > 0)}})});
;
      if (ngrokProcess) {;
        tunnels.push({';'';
          name: 'ngrok-tunnel','';
          type: 'ngrok','';
          status: 'ACTIVE',
          lastCheck: new Date().toISOString(),
        })}} catch (_error) {;
      // ngrok check failed, continue without it};

    return tunnels} catch (_error) {';'';
    console.error('Error getting tunnel status:', error);
    return []}};

function getSystemHealth() {;
  try {';'';
    // Simple system health check - in production you'd want more sophisticated metrics;
    const _memory = Math.floor(Math.random() * 30) + 40; // Simulated 40-70%;
    const _cpu = Math.floor(Math.random() * 20) + 20; // Simulated 20-40%;
    const _disk = Math.floor(Math.random() * 15) + 25; // Simulated 25-40%;

    return { memory, cpu, disk }} catch (_error) {;
    return { memory: 0, cpu: 0, disk: 0 }}};

async function validateProcess(_processName) {;
  try {;
    const _result = await new Promise(_(resolve, _reject) => {';''`;
      exec(_`pgrep -f '${processName}'`, _{ timeout: 5000 }, _(error, _stdout) => {;
        if (error) {;
          resolve(false)} else {;
          resolve(stdout.trim().length > 0)}})});
    return result} catch (_error) {;
    return false}};

function getRecentLogs() {;
  try {;
    const _logFiles = [';'';
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/summary-monitor.log','';
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost-runner.log','';
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-executor.log','';
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/unified-monitor.log',
    ];
;
    // Also check for real-time logs from running processes;
    const _realTimeLogs = [];
    try {;
      // Get logs from the dualMonitor process;
      const _dualMonitorLogs = execSync(';'';
        'ps aux | grep 'dualMonitor.js' | grep -v grep','';
        { encoding: 'utf8' },
      );
      if (dualMonitorLogs.trim()) {;
        realTimeLogs.push({';'';
          file: 'dualMonitor-process.log',
          lines: [`;
            `[${new Date().toISOString()}] DualMonitor process: ${dualMonitorLogs.trim()}`,
          ],
          timestamp: new Date().toISOString(),
          size: dualMonitorLogs.length,
        })};

      // Get current patch executor status;
      const _patchExecutorStatus = execSync(';'';
        'ps aux | grep 'patch_executor_daemon.py' | grep -v grep','';
        { encoding: 'utf8' },
      );
      if (patchExecutorStatus.trim()) {;
        realTimeLogs.push({';'';
          file: 'patch-executor-status.log',
          lines: [`;
            `[${new Date().toISOString()}] Patch Executor: ${patchExecutorStatus.trim()}`,
          ],
          timestamp: new Date().toISOString(),
          size: patchExecutorStatus.length,
        })}} catch (_error) {;
      // Ignore if process not found};

    const _logs = [];
;
    for (const logFile of logFiles) {;
      if (fs.existsSync(logFile)) {;
        try {';'';
          const _content = fs.readFileSync(logFile, 'utf8')';'';
          const _lines = content.split('\n').filter(_(line) => line.trim());
;
          // Filter logs to only show entries from the last hour;
          const _oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const _recentLines = lines;
            .filter(_(line) => {;
              try {;
                // Try to parse timestamp from JSON logs;
                const _logData = JSON.parse(line);
                if (logData.timestamp) {;
                  return new Date(logData.timestamp) > oneHourAgo}} catch (_error) {;
                // For non-JSON logs, check if file was modified recently;
                const _fileStats = fs.statSync(logFile);
                return fileStats.mtime > oneHourAgo}';';
              return true'; // Include if we can't determine timestamp});
            .slice(-10); // Last 10 recent lines;

          if (recentLines.length > 0) {;
            logs.push({;
              file: path.basename(logFile),
              lines: recentLines,
              timestamp: fs.statSync(logFile).mtime.toISOString(),
              size: fs.statSync(logFile).size,
            })}} catch (_error) {;
          logs.push({;
            file: path.basename(logFile),
            error: error.message,
            timestamp: new Date().toISOString(),
          })}}};

    // Also check for recent activity in summary directories;
    const _summaryLogs = [];
    const _summaryDirs = [';'';
      '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries','';
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
    ];
;
    for (const summaryDir of summaryDirs) {;
      if (fs.existsSync(summaryDir)) {;
        try {;
          const _files = fs;
            .readdirSync(summaryDir)';'';
            .filter(_(f) => f.endsWith('.md') && !f.startsWith('.'));
            .map(_(f) => {;
              const _filePath = path.join(summaryDir, f);
              const _stats = fs.statSync(filePath);
              return {;
                name: f,
                timestamp: stats.mtime.toISOString(),
                size: stats.size,
              }});
            .sort(_(a, _b) => new Date(b.timestamp) - new Date(a.timestamp));
            .slice(0, 3); // Last 3 summaries;

          summaryLogs.push({;
            system: path.basename(summaryDir),
            recent_summaries: files,
          })} catch (_error) {;
          summaryLogs.push({;
            system: path.basename(summaryDir),
            error: error.message,
          })}}};

    // Combine real-time logs with file logs;
    const _allLogs = [...realTimeLogs, ...logs];
;
    return {;
      log_files: allLogs,
      recent_activity: summaryLogs,
    }} catch (_error) {;
    return {;
      log_files: [;
        { error: error.message, timestamp: new Date().toISOString() },
      ],
      recent_activity: [],
    }}};

async function getTelemetryData() {;
  try {;
    // Get telemetry data from the orchestrator state file;
    const _orchestratorStatePath =';'';
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/telemetry/orchestrator-state.json';
;
    if (!fs.existsSync(orchestratorStatePath)) {;
      return {';'';
        status: 'no_data','';
        message: 'Telemetry orchestrator state not found',
        timestamp: new Date().toISOString(),
      }};

    const _stateData = JSON.parse(';'';
      fs.readFileSync(orchestratorStatePath, 'utf8'),
    );
;
    // Extract key telemetry metrics;
    const _telemetry = {;
      systemHealth: stateData.systemHealth || {},
      components: (stateData.components || []).map(_(comp) => ({;
        id: comp.id,
        name: comp.name,
        type: comp.type,
        status: comp.status,
        health: comp.health,
        uptime: comp.uptime,
        lastHeartbeat: comp.lastHeartbeat,
      })),
      recentEvents: (stateData.events || []).slice(-10).map(_(event) => ({;
        timestamp: event.timestamp,
        eventType: event.eventType,
        componentName: event.componentName,
        severity: event.severity,
        message: event.message,
      })),
      metrics: {;
        totalComponents: stateData.components?.length || 0,
        healthyComponents: ';'';
          stateData.components?.filter(_(c) => c.health === 'healthy').length ||;
          0,
        degradedComponents: ';'';
          stateData.components?.filter(_(c) => c.health === 'degraded').length ||;
          0,
        unhealthyComponents: ';'';
          stateData.components?.filter(_(c) => c.health === 'unhealthy');
            .length || 0,
        criticalComponents: ';'';
          stateData.components?.filter(_(c) => c.health === 'critical').length ||;
          0,
      },
    };
;
    return telemetry} catch (_error) {';'';
    console.error('Error fetching telemetry data:', error);
    return {';'';
      status: 'error','';
      message: 'Failed to fetch telemetry data',
      error: error.message,
      timestamp: new Date().toISOString(),
    }}};

// WebSocket connection handling';'';
wss.on(_'connection', _(ws) => {';'';
  console.log('🔌 WebSocket client connected');
;
  // Send initial data;
  getComprehensiveStatus().then(_(data) => {';'';
    ws.send(JSON.stringify({ type: 'status', data }))});
';'';
  ws.on(_'close', _() => {';'';
    console.log('🔌 WebSocket client disconnected')})});
;
// Broadcast updates to all connected clients;
function broadcastUpdate(_data) {;
  wss.clients.forEach(_(client) => {;
    if (client.readyState === WebSocket.OPEN) {';'';
      client.send(JSON.stringify({ type: 'status', data }))}})};

// Periodic updates every 30 seconds;
setInterval(_async () => {;
  try {;
    const _data = await getComprehensiveStatus();
    broadcastUpdate(data)} catch (_error) {';''";
    console.error('Error broadcasting update:", error)}}, 30000);
;
// Start server;
// NOTE: This is the UI monitor server; use dedicated env var to avoid port conflicts with Telemetry API (8788);
const _PORT = process.env.MONITOR_PORT || process.env.PORT || 3002;
server.listen(_PORT, _() => {`;
  console.log(`🚀 Dual monitor server live on port ${PORT}`)`;
  console.log(`📊 Monitor available at: http://localhost:${PORT}/monitor`)`;
  console.log(`🔗 API available at: http://localhost:${PORT}/api/status`)`;
  console.log(`🔌 WebSocket available at: ws://localhost:${PORT}`)})';
''"`;