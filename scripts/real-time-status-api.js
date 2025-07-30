#!/usr/bin/env node
/**
 * Real-Time Status API
 * Provides real-time patch execution status and WebSocket support for live updates
 * Integrates with GPT interface for autonomous patch monitoring
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const fs = require('fs/promises');
const path = require('path');
const { EventEmitter } = require('events');

class RealTimeStatusAPI extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.port = options.port || 8789;
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocket.Server({ server: this.server });
    
    // Status tracking
    this.patchStatus = new Map();
    this.serviceStatus = new Map();
    this.connectionStatus = new Map();
    
    // Configuration
    this.patchDirectories = {
      CYOPS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
      MAIN: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches'
    };
    
    this.summaryDirectories = {
      CYOPS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries',
      MAIN: '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries'
    };
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupWebSocket();
    this.setupStatusMonitoring();
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        connections: this.wss.clients.size
      });
    });

    // Get all patch status
    this.app.get('/api/patches/status', async (req, res) => {
      try {
        const status = await this.getAllPatchStatus();
        res.json({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: status
        });
      } catch (_error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // Get specific patch status
    this.app.get('/api/patches/:patchId/status', async (req, res) => {
      try {
        const { patchId } = req.params;
        const status = await this.getPatchStatus(patchId);
        
        if (!status) {
          return res.status(404).json({
            status: 'error',
            error: 'Patch not found'
          });
        }
        
        res.json({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: status
        });
      } catch (_error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // Get service status
    this.app.get('/api/services/status', async (req, res) => {
      try {
        const status = await this.getServiceStatus();
        res.json({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: status
        });
      } catch (_error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // Update patch status (for internal use)
    this.app.post('/api/patches/:patchId/status', async (req, res) => {
      try {
        const { patchId } = req.params;
        const { status, details } = req.body;
        
        await this.updatePatchStatus(patchId, status, details);
        
        res.json({
          status: 'success',
          message: 'Patch status updated'
        });
      } catch (_error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // Webhook for patch execution events
    this.app.post('/api/webhooks/patch-event', async (req, res) => {
      try {
        const { patchId, event, data } = req.body;
        
        await this.handlePatchEvent(patchId, event, data);
        
        res.json({
          status: 'success',
          message: 'Event processed'
        });
      } catch (_error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });

    // Comprehensive status endpoint
    this.app.get('/api/unified-status', async (req, res) => {
      try {
        const status = await this.getUnifiedStatus();
        res.json({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: status
        });
      } catch (_error) {
        res.status(500).json({
          status: 'error',
          error: error.message
        });
      }
    });
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      this.connectionStatus.set(clientId, {
        connected: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        userAgent: req.headers['user-agent']
      });

      console.log(`🔌 [STATUS-API] WebSocket client connected: ${clientId}`);

      // Send initial status
      this.sendInitialStatus(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleWebSocketMessage(clientId, data);
        } catch (_error) {
          console.error('❌ [STATUS-API] WebSocket message error:', error.message);
        }
      });

      ws.on('close', () => {
        this.connectionStatus.delete(clientId);
        console.log(`🔌 [STATUS-API] WebSocket client disconnected: ${clientId}`);
      });

      ws.on('error', (error) => {
        console.error('❌ [STATUS-API] WebSocket error:', error.message);
        this.connectionStatus.delete(clientId);
      });
    });
  }

  setupStatusMonitoring() {
    // Monitor patch directories for changes
    this.startDirectoryMonitoring();
    
    // Periodic status updates
    setInterval(() => {
      this.broadcastStatusUpdate();
    }, 5000); // Every 5 seconds
  }

  async startDirectoryMonitoring() {
    for (const [system, patchDir] of Object.entries(this.patchDirectories)) {
      try {
        await this.monitorPatchDirectory(system, patchDir);
      } catch (_error) {
        console.error(`❌ [STATUS-API] Failed to monitor ${system} directory:`, error.message);
      }
    }
  }

  async monitorPatchDirectory(system, patchDir) {
    try {
      const files = await fs.readdir(patchDir);
      const patchFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));
      
      for (const file of patchFiles) {
        const patchId = path.basename(file, '.json');
        const filePath = path.join(patchDir, file);
        
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const patchData = JSON.parse(content);
          
          await this.updatePatchStatus(patchId, 'pending', {
            system,
            file,
            timestamp: new Date().toISOString(),
            data: patchData
          });
        } catch (_error) {
          console.error(`❌ [STATUS-API] Error reading patch ${file}:`, error.message);
        }
      }
    } catch (_error) {
      console.error(`❌ [STATUS-API] Error monitoring directory ${patchDir}:`, error.message);
    }
  }

  async getAllPatchStatus() {
    const status = {};
    
    for (const [patchId, patchData] of this.patchStatus) {
      status[patchId] = patchData;
    }
    
    return status;
  }

  async getPatchStatus(patchId) {
    return this.patchStatus.get(patchId);
  }

  async updatePatchStatus(patchId, status, details = {}) {
    const currentStatus = this.patchStatus.get(patchId) || {};
    
    const updatedStatus = {
      ...currentStatus,
      status,
      lastUpdated: new Date().toISOString(),
      ...details
    };
    
    this.patchStatus.set(patchId, updatedStatus);
    
    // Emit event for WebSocket broadcasting
    this.emit('patchStatusUpdate', { patchId, status: updatedStatus });
    
    console.log(`📊 [STATUS-API] Patch ${patchId} status updated to: ${status}`);
  }

  async getServiceStatus() {
    const services = [
      { name: 'patch-executor', port: 5051 },
      { name: 'telemetry-api', port: 8788 },
      { name: 'dual-monitor', port: 3001 },
      { name: 'status-api', port: this.port }
    ];
    
    const status = {};
    
    for (const service of services) {
      try {
        const isHealthy = await this.checkServiceHealth(service);
        status[service.name] = {
          port: service.port,
          healthy: isHealthy,
          lastChecked: new Date().toISOString()
        };
      } catch (_error) {
        status[service.name] = {
          port: service.port,
          healthy: false,
          error: error.message,
          lastChecked: new Date().toISOString()
        };
      }
    }
    
    return status;
  }

  async checkServiceHealth(service) {
    return new Promise((resolve) => {
      const http = require('http');
      const req = http.request({
        hostname: 'localhost',
        port: service.port,
        path: '/health',
        method: 'GET',
        timeout: 5000
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    });
  }

  async handlePatchEvent(patchId, event, data) {
    console.log(`📊 [STATUS-API] Processing patch event: ${patchId} - ${event}`);
    
    switch (event) {
    case 'created':
      await this.updatePatchStatus(patchId, 'created', data);
      break;
    case 'executing':
      await this.updatePatchStatus(patchId, 'executing', data);
      break;
    case 'completed':
      await this.updatePatchStatus(patchId, 'completed', data);
      break;
    case 'failed':
      await this.updatePatchStatus(patchId, 'failed', data);
      break;
    case 'validating':
      await this.updatePatchStatus(patchId, 'validating', data);
      break;
    default:
      console.warn(`⚠️ [STATUS-API] Unknown patch event: ${event}`);
    }
  }

  async getUnifiedStatus() {
    const [patchStatus, serviceStatus] = await Promise.all([
      this.getAllPatchStatus(),
      this.getServiceStatus()
    ]);
    
    return {
      patches: patchStatus,
      services: serviceStatus,
      connections: this.wss.clients.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async sendInitialStatus(ws) {
    try {
      const status = await this.getUnifiedStatus();
      ws.send(JSON.stringify({
        type: 'initial_status',
        data: status
      }));
    } catch (_error) {
      console.error('❌ [STATUS-API] Error sending initial status:', error.message);
    }
  }

  handleWebSocketMessage(clientId, data) {
    const connection = this.connectionStatus.get(clientId);
    if (connection) {
      connection.lastActivity = new Date().toISOString();
    }
    
    switch (data.type) {
    case 'subscribe_patch':
      this.handlePatchSubscription(clientId, data.patchId);
      break;
    case 'unsubscribe_patch':
      this.handlePatchUnsubscription(clientId, data.patchId);
      break;
    case 'ping':
      this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
      break;
    default:
      console.warn(`⚠️ [STATUS-API] Unknown WebSocket message type: ${data.type}`);
    }
  }

  handlePatchSubscription(clientId, patchId) {
    // Store subscription for targeted updates
    if (!this.patchSubscriptions) {
      this.patchSubscriptions = new Map();
    }
    
    if (!this.patchSubscriptions.has(patchId)) {
      this.patchSubscriptions.set(patchId, new Set());
    }
    
    this.patchSubscriptions.get(patchId).add(clientId);
    console.log(`📊 [STATUS-API] Client ${clientId} subscribed to patch ${patchId}`);
  }

  handlePatchUnsubscription(clientId, patchId) {
    if (this.patchSubscriptions && this.patchSubscriptions.has(patchId)) {
      this.patchSubscriptions.get(patchId).delete(clientId);
      console.log(`📊 [STATUS-API] Client ${clientId} unsubscribed from patch ${patchId}`);
    }
  }

  sendToClient(clientId, data) {
    this.wss.clients.forEach((client) => {
      if (client.clientId === clientId) {
        client.send(JSON.stringify(data));
      }
    });
  }

  broadcastStatusUpdate() {
    const message = {
      type: 'status_update',
      timestamp: new Date().toISOString(),
      data: {
        connections: this.wss.clients.size,
        uptime: process.uptime()
      }
    };
    
    this.broadcast(message);
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Listen for patch status updates and broadcast to subscribed clients
  onPatchStatusUpdate(patchId, status) {
    const message = {
      type: 'patch_status_update',
      patchId,
      data: status,
      timestamp: new Date().toISOString()
    };
    
    // Broadcast to all clients
    this.broadcast(message);
    
    // Send targeted update to subscribed clients
    if (this.patchSubscriptions && this.patchSubscriptions.has(patchId)) {
      const subscribers = this.patchSubscriptions.get(patchId);
      subscribers.forEach(clientId => {
        this.sendToClient(clientId, message);
      });
    }
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`🚀 [STATUS-API] Real-time status API started on port ${this.port}`);
      console.log('📊 [STATUS-API] WebSocket server ready for connections');
    });
    
    // Listen for patch status updates
    this.on('patchStatusUpdate', ({ patchId, status }) => {
      this.onPatchStatusUpdate(patchId, status);
    });
  }

  stop() {
    this.server.close(() => {
      console.log('🛑 [STATUS-API] Real-time status API stopped');
    });
  }
}

// Export for use in other modules
module.exports = RealTimeStatusAPI;

// CLI interface
if (require.main === module) {
  const api = new RealTimeStatusAPI();
  api.start();
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 [STATUS-API] Shutting down...');
    api.stop();
    process.exit(0);
  });
} 