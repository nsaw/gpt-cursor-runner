#!/usr/bin/env node
/* eslint-disable complexity */
/**
 * Dual Monitor Server
 * Express server for GHOST monitor dashboard
 * Provides static file serving and API endpoints for rich dashboard UI
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use('/static', express.static('dashboard/static'));
app.use(express.json());

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve the rich dashboard UI
app.get('/', (_, res) => res.sendFile(path.join(__dirname, '../../dashboard/templates/index.html')));
app.get('/monitor', (_, res) => res.sendFile(path.join(__dirname, '../../dashboard/templates/index.html')));

// API endpoints for rich dashboard
app.get('/api/status', async (_, res) => {
  try {
    // Get comprehensive status data
    const statusData = await getComprehensiveStatus();
    res.json(statusData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/daemon-status', async (_, res) => {
  try {
    const daemonStatus = await getDaemonStatus();
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      daemon_status: daemonStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patch-status', async (_, res) => {
  try {
    const patchStatus = await getPatchStatus();
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      patchStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tunnel-status', async (_, res) => {
  try {
    const tunnelStatus = await getTunnelStatus();
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      tunnelStatus
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system-health', async (_, res) => {
  try {
    const systemHealth = await getSystemHealth();
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      resourceHealth: systemHealth
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/validate-process', async (req, res) => {
  try {
    const processName = req.query.name;
    if (!processName) {
      return res.status(400).json({ error: 'Process name required' });
    }
    
    const isRunning = await validateProcess(processName);
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      running: isRunning,
      process: processName
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/recent-logs', async (_, res) => {
  try {
    const recentLogs = await getRecentLogs();
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      recentLogs
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper functions
async function getComprehensiveStatus() {
  const [daemonStatus, patchStatus, tunnelStatus, systemHealth, recentLogs] = await Promise.all([
    getDaemonStatus(),
    getPatchStatus(),
    getTunnelStatus(),
    getSystemHealth(),
    getRecentLogs()
  ]);

  // Separate agent status
  const mainStatus = {
    pending: patchStatus.MAIN?.pending || 0,
    completed: patchStatus.MAIN?.completed || 0,
    summaries: patchStatus.MAIN?.summaries || [],
    patches: patchStatus.MAIN?.patches || [],
    processes: {
      'summary-monitor': daemonStatus['summary-monitor'] === 'running' ? 'HEALTHY' : 'STOPPED',
      'patch-executor': daemonStatus['patch-executor'] === 'running' ? 'HEALTHY' : 'STOPPED',
      'ghost-bridge': daemonStatus['ghost-bridge'] === 'running' ? 'HEALTHY' : 'STOPPED'
    }
  };

  const cyopsStatus = {
    pending: patchStatus.CYOPS?.pending || 0,
    completed: patchStatus.CYOPS?.completed || 0,
    summaries: patchStatus.CYOPS?.summaries || [],
    patches: patchStatus.CYOPS?.patches || [],
    processes: {
      'summary-monitor': daemonStatus['summary-monitor'] === 'running' ? 'HEALTHY' : 'STOPPED',
      'patch-executor': daemonStatus['patch-executor'] === 'running' ? 'HEALTHY' : 'STOPPED',
      'ghost-bridge': daemonStatus['ghost-bridge'] === 'running' ? 'HEALTHY' : 'STOPPED'
    }
  };

  return {
    timestamp: new Date().toISOString(),
    MAIN: mainStatus.pending > 0 ? '🔄' : '✅',
    CYOPS: cyopsStatus.pending > 0 ? '🔄' : '✅',
    PATCH_QUEUE: {
      MAIN: `${mainStatus.pending} pending`,
      CYOPS: `${cyopsStatus.pending} pending`,
      total: `${mainStatus.pending + cyopsStatus.pending} pending`
    },
    VALIDATORS: {
      summaryWatcher: daemonStatus['summary-monitor'] === 'running' ? 'OK' : 'ERROR',
      patchExecutor: daemonStatus['patch-executor'] === 'running' ? 'looping' : 'stopped',
      docDaemon: daemonStatus['doc-daemon'] === 'running' ? 'running' : 'stopped',
      ghostBridge: daemonStatus['ghost-bridge'] === 'running' ? 'active' : 'inactive'
    },
    patch_status: patchStatus,
    daemon_status: daemonStatus,
    agent_status: {
      MAIN: mainStatus,
      CYOPS: cyopsStatus
    },
    // Dashboard template expects these specific property names
    unified_monitor: {
      status: 'running',
      uptime: 0,
      systems: {
        resources: systemHealth
      }
    },
    process_health: Object.fromEntries(
      Object.entries(daemonStatus).map(([name, status]) => [
        name,
        {
          status: status === 'running' ? 'HEALTHY' : 'STOPPED',
          running: status === 'running'
        }
      ])
    ),
    tunnels: tunnelStatus,
    resource_health: systemHealth,
    tunnel_status: tunnelStatus,
    recent_logs: recentLogs
  };
}

async function getDaemonStatus() {
  const processes = ['summary-monitor', 'patch-executor', 'doc-daemon', 'dualMonitor', 'ghost-bridge'];
  const status = {};
  
  for (const process of processes) {
    try {
      const result = await new Promise((resolve, _reject) => {
        exec(`pgrep -f "${process}"`, { timeout: 5000 }, (error, stdout) => {
          if (error) {
            resolve({ running: false });
          } else {
            resolve({ running: stdout.trim().length > 0 });
          }
        });
      });
      status[process] = result.running ? 'running' : 'stopped';
    } catch (error) {
      status[process] = 'unknown';
    }
  }
  
  return status;
}

function getPatchStatus() {
  const systems = {
    MAIN: {
      patchesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
      completedPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed',
      failedPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.failed',
      summariesPath: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries'
    },
    CYOPS: {
      patchesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
      completedPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.completed',
      failedPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed',
      summariesPath: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
    }
  };

  const status = {};
  
  for (const [system, paths] of Object.entries(systems)) {
    try {
      // Get patches with timestamps (including completed and failed)
      const patches = [];
      const completedPatches = [];
      const failedPatches = [];
      
      // Check main patches directory
      if (fs.existsSync(paths.patchesPath)) {
        const patchFiles = fs.readdirSync(paths.patchesPath)
          .filter(f => f.endsWith('.json') && !f.startsWith('.'));
        
        for (const file of patchFiles) {
          const filePath = path.join(paths.patchesPath, file);
          const stats = fs.statSync(filePath);
          patches.push({
            name: file,
            timestamp: stats.mtime.toISOString(),
            size: stats.size,
            status: 'pending'
          });
        }
      }
      
      // Check completed patches
      if (fs.existsSync(paths.completedPath)) {
        const completedFiles = fs.readdirSync(paths.completedPath)
          .filter(f => f.endsWith('.json') && !f.startsWith('.'));
        
        for (const file of completedFiles) {
          const filePath = path.join(paths.completedPath, file);
          const stats = fs.statSync(filePath);
          completedPatches.push({
            name: file,
            timestamp: stats.mtime.toISOString(),
            size: stats.size,
            status: 'completed'
          });
        }
      }
      
      // Check failed patches
      if (fs.existsSync(paths.failedPath)) {
        const failedFiles = fs.readdirSync(paths.failedPath)
          .filter(f => f.endsWith('.json') && !f.startsWith('.'));
        
        for (const file of failedFiles) {
          const filePath = path.join(paths.failedPath, file);
          const stats = fs.statSync(filePath);
          failedPatches.push({
            name: file,
            timestamp: stats.mtime.toISOString(),
            size: stats.size,
            status: 'failed'
          });
        }
      }
      
      // Combine and sort all patches by modification time (newest first)
      const allPatches = [...patches, ...completedPatches, ...failedPatches];
      allPatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Get summaries with timestamps
      const summaries = [];
      if (fs.existsSync(paths.summariesPath)) {
        const summaryFiles = fs.readdirSync(paths.summariesPath)
          .filter(f => f.endsWith('.md') && !f.startsWith('.'));
        
        for (const file of summaryFiles) {
          const filePath = path.join(paths.summariesPath, file);
          const stats = fs.statSync(filePath);
          summaries.push({
            name: file,
            timestamp: stats.mtime.toISOString(),
            size: stats.size
          });
        }
        // Sort by modification time (newest first)
        summaries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      
      status[system] = {
        pending: patches.length,
        completed: completedPatches.length,
        failed: failedPatches.length,
        total: allPatches.length,
        patches: patches.slice(0, 5).map(p => p.name), // Show 5 most recent pending
        completed_patches: completedPatches.slice(0, 5).map(p => p.name), // Show 5 most recent completed
        failed_patches: failedPatches.slice(0, 5).map(p => p.name), // Show 5 most recent failed
        summaries: summaries.slice(0, 5).map(s => s.name), // Show 5 most recent
        patch_details: allPatches.slice(0, 10), // Full details for recent patches (all statuses)
        summary_details: summaries.slice(0, 5) // Full details for recent summaries
      };
    } catch (error) {
      console.error(`Error reading ${system} status:`, error.message);
      status[system] = { pending: 0, completed: 0, patches: [], summaries: [], patch_details: [], summary_details: [] };
    }
  }
  
  return status;
}

async function getTunnelStatus() {
  try {
    const tunnels = [];
    
    // Define known tunnels with their endpoints
    const knownTunnels = [
      {
        name: 'gpt-cursor-runner.thoughtmarks.app',
        type: 'cloudflare',
        url: 'https://gpt-cursor-runner.thoughtmarks.app/',
        expectedStatus: 200
      }
    ];
    
    // Check each tunnel's health in parallel
    const tunnelChecks = knownTunnels.map(async (tunnel) => {
      try {
        const response = await new Promise((resolve, reject) => {
          const http = require('http');
          const https = require('https');
          const url = require('url');
          
          const parsedUrl = url.parse(tunnel.url);
          const client = parsedUrl.protocol === 'https:' ? https : http;
          
          const req = client.get(parsedUrl, (res) => {
            resolve({ status: res.statusCode, headers: res.headers });
          });
          
          req.on('error', (err) => {
            reject(err);
          });
          
          req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });
        
        return {
          name: tunnel.name,
          type: tunnel.type,
          status: response.status === tunnel.expectedStatus ? 'ACTIVE' : 'DOWN',
          lastCheck: new Date().toISOString(),
          responseTime: Date.now()
        };
      } catch (error) {
        return {
          name: tunnel.name,
          type: tunnel.type,
          status: 'DOWN',
          lastCheck: new Date().toISOString(),
          error: error.message
        };
      }
    });
    
    // Wait for all tunnel checks to complete
    const results = await Promise.all(tunnelChecks);
    tunnels.push(...results);
    
    // Add ngrok tunnel if running
    try {
      const ngrokProcess = await new Promise((resolve, _reject) => {
        exec('pgrep -f "ngrok"', { timeout: 5000 }, (error, stdout) => {
          if (error) {
            resolve(false);
          } else {
            resolve(stdout.trim().length > 0);
          }
        });
      });
      
      if (ngrokProcess) {
        tunnels.push({
          name: 'ngrok-tunnel',
          type: 'ngrok',
          status: 'ACTIVE',
          lastCheck: new Date().toISOString()
        });
      }
    } catch (error) {
      // ngrok check failed, continue without it
    }
    
    return tunnels;
  } catch (error) {
    console.error('Error getting tunnel status:', error);
    return [];
  }
}

function getSystemHealth() {
  try {
    // Simple system health check - in production you'd want more sophisticated metrics
    const memory = Math.floor(Math.random() * 30) + 40; // Simulated 40-70%
    const cpu = Math.floor(Math.random() * 20) + 20; // Simulated 20-40%
    const disk = Math.floor(Math.random() * 15) + 25; // Simulated 25-40%
    
    return { memory, cpu, disk };
  } catch (error) {
    return { memory: 0, cpu: 0, disk: 0 };
  }
}

async function validateProcess(processName) {
  try {
    const result = await new Promise((resolve, _reject) => {
      exec(`pgrep -f "${processName}"`, { timeout: 5000 }, (error, stdout) => {
        if (error) {
          resolve(false);
        } else {
          resolve(stdout.trim().length > 0);
        }
      });
    });
    return result;
  } catch (error) {
    return false;
  }
}

function getRecentLogs() {
  try {
    const logFiles = [
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/summary-monitor.log',
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost-runner.log',
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-executor.log',
      '/Users/sawyer/gitSync/gpt-cursor-runner/logs/unified-monitor.log'
    ];
    
    // Also check for real-time logs from running processes
    const realTimeLogs = [];
    try {
      // Get logs from the dualMonitor process
      const dualMonitorLogs = execSync('ps aux | grep "dualMonitor.js" | grep -v grep', { encoding: 'utf8' });
      if (dualMonitorLogs.trim()) {
        realTimeLogs.push({
          file: 'dualMonitor-process.log',
          lines: [`[${new Date().toISOString()}] DualMonitor process: ${dualMonitorLogs.trim()}`],
          timestamp: new Date().toISOString(),
          size: dualMonitorLogs.length
        });
      }
      
      // Get current patch executor status
      const patchExecutorStatus = execSync('ps aux | grep "patch-executor-loop" | grep -v grep', { encoding: 'utf8' });
      if (patchExecutorStatus.trim()) {
        realTimeLogs.push({
          file: 'patch-executor-status.log',
          lines: [`[${new Date().toISOString()}] Patch Executor: ${patchExecutorStatus.trim()}`],
          timestamp: new Date().toISOString(),
          size: patchExecutorStatus.length
        });
      }
    } catch (error) {
      // Ignore if process not found
    }
    
    const logs = [];
    
    for (const logFile of logFiles) {
      if (fs.existsSync(logFile)) {
        try {
          const content = fs.readFileSync(logFile, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          // Filter logs to only show entries from the last hour
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recentLines = lines.filter(line => {
            try {
              // Try to parse timestamp from JSON logs
              const logData = JSON.parse(line);
              if (logData.timestamp) {
                return new Date(logData.timestamp) > oneHourAgo;
              }
            } catch (error) {
              // For non-JSON logs, check if file was modified recently
              const fileStats = fs.statSync(logFile);
              return fileStats.mtime > oneHourAgo;
            }
            return true; // Include if we can't determine timestamp
          }).slice(-10); // Last 10 recent lines
          
          if (recentLines.length > 0) {
            logs.push({
              file: path.basename(logFile),
              lines: recentLines,
              timestamp: fs.statSync(logFile).mtime.toISOString(),
              size: fs.statSync(logFile).size
            });
          }
        } catch (error) {
          logs.push({
            file: path.basename(logFile),
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Also check for recent activity in summary directories
    const summaryLogs = [];
    const summaryDirs = [
      '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries',
      '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries'
    ];
    
    for (const summaryDir of summaryDirs) {
      if (fs.existsSync(summaryDir)) {
        try {
          const files = fs.readdirSync(summaryDir)
            .filter(f => f.endsWith('.md') && !f.startsWith('.'))
            .map(f => {
              const filePath = path.join(summaryDir, f);
              const stats = fs.statSync(filePath);
              return {
                name: f,
                timestamp: stats.mtime.toISOString(),
                size: stats.size
              };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 3); // Last 3 summaries
          
          summaryLogs.push({
            system: path.basename(summaryDir),
            recent_summaries: files
          });
        } catch (error) {
          summaryLogs.push({
            system: path.basename(summaryDir),
            error: error.message
          });
        }
      }
    }
    
    // Combine real-time logs with file logs
    const allLogs = [...realTimeLogs, ...logs];
    
    return {
      log_files: allLogs,
      recent_activity: summaryLogs
    };
  } catch (error) {
    return { 
      log_files: [{ error: error.message, timestamp: new Date().toISOString() }],
      recent_activity: []
    };
  }
}

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  
  // Send initial data
  getComprehensiveStatus().then(data => {
    ws.send(JSON.stringify({ type: 'status', data }));
  });
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
});

// Broadcast updates to all connected clients
function broadcastUpdate(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'status', data }));
    }
  });
}

// Periodic updates every 30 seconds
setInterval(async () => {
  try {
    const data = await getComprehensiveStatus();
    broadcastUpdate(data);
  } catch (error) {
    console.error('Error broadcasting update:', error);
  }
}, 30000);

// Start server
const PORT = process.env.PORT || 8787;
server.listen(PORT, () => {
  console.log(`🚀 Dual monitor server live on port ${PORT}`);
  console.log(`📊 Monitor available at: http://localhost:${PORT}/monitor`);
  console.log(`🔗 API available at: http://localhost:${PORT}/api/status`);
  console.log(`🔌 WebSocket available at: ws://localhost:${PORT}`);
}); 