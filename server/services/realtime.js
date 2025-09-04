const express = require('express');
const fs = require('fs').promises;
const path = require('path');

class RealtimeService {
  constructor() {
    this.app = express();
    this.connections = new Map(); // Store active SSE connections
    this.setupRoutes();
  }

  setupRoutes() {
    // Progress stream endpoint (SSE)
    this.app.get('/stream/:commandId', (req, res) => {
      const commandId = req.params.commandId;
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Store connection
      this.connections.set(commandId, res);

      // Send initial connection event
      res.write(`data: ${JSON.stringify({
        type: 'connected',
        commandId,
        timestamp: new Date().toISOString()
      })}\n\n`);

      // Keep connection alive
      const keepAlive = setInterval(() => {
        if (this.connections.has(commandId)) {
          res.write(`data: ${JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          })}\n\n`);
        } else {
          clearInterval(keepAlive);
        }
      }, 30000);

      // Cleanup on disconnect
      req.on('close', () => {
        this.connections.delete(commandId);
        clearInterval(keepAlive);
        console.log(`📡 SSE connection closed for command: ${commandId}`);
      });

      console.log(`📡 SSE stream started for command: ${commandId}`);
    });

    // Send progress update
    this.app.post('/progress/:commandId', async (req, res) => {
      try {
        const commandId = req.params.commandId;
        const { status, message, data } = req.body;

        const progressUpdate = {
          type: 'progress',
          commandId,
          status,
          message,
          data,
          timestamp: new Date().toISOString()
        };

        // Send to SSE connection if active
        const connection = this.connections.get(commandId);
        if (connection) {
          connection.write(`data: ${JSON.stringify(progressUpdate)}\n\n`);
        }

        // Update status mirror
        const statusFile = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/commands/${commandId}.json`;
        try {
          const existingStatus = await fs.readFile(statusFile, 'utf8');
          const statusData = JSON.parse(existingStatus);
          statusData.status = status;
          statusData.lastUpdate = new Date().toISOString();
          if (message) statusData.message = message;
          if (data) statusData.data = data;
          
          await fs.writeFile(statusFile, JSON.stringify(statusData, null, 2));
        } catch (error) {
          console.error(`❌ Error updating status file: ${error.message}`);
        }

        // Create stream status mirror
        const streamFile = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/patches/${commandId}-stream.json`;
        await fs.writeFile(streamFile, JSON.stringify(progressUpdate, null, 2));

        res.json({
          success: true,
          message: 'Progress update sent',
          timestamp: new Date().toISOString()
        });

        console.log(`📊 Progress update sent for command: ${commandId} (${status})`);

      } catch (error) {
        console.error('❌ Error sending progress update:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'Realtime Service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        activeConnections: this.connections.size,
        version: 'v2.3.61'
      });
    });
  }

  // Method to send progress updates programmatically
  async sendProgress(commandId, status, message, data = null) {
    const progressUpdate = {
      type: 'progress',
      commandId,
      status,
      message,
      data,
      timestamp: new Date().toISOString()
    };

    // Send to SSE connection if active
    const connection = this.connections.get(commandId);
    if (connection) {
      connection.write(`data: ${JSON.stringify(progressUpdate)}\n\n`);
    }

    // Update status files
    const statusFile = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/commands/${commandId}.json`;
    try {
      const existingStatus = await fs.readFile(statusFile, 'utf8');
      const statusData = JSON.parse(existingStatus);
      statusData.status = status;
      statusData.lastUpdate = new Date().toISOString();
      if (message) statusData.message = message;
      if (data) statusData.data = data;
      
      await fs.writeFile(statusFile, JSON.stringify(statusData, null, 2));
    } catch (error) {
      console.error(`❌ Error updating status file: ${error.message}`);
    }

    // Create stream status mirror
    const streamFile = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/patches/${commandId}-stream.json`;
    await fs.writeFile(streamFile, JSON.stringify(progressUpdate, null, 2));

    console.log(`📊 Progress sent: ${commandId} (${status})`);
  }

  getApp() {
    return this.app;
  }
}

module.exports = RealtimeService;

// Standalone execution
if (require.main === module) {
  const realtimeService = new RealtimeService();
  const port = 5056;
  
  realtimeService.getApp().listen(port, () => {
    console.log(`📡 Realtime Service started on port ${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   • Health: http://localhost:${port}/health`);
    console.log(`   • Stream: http://localhost:${port}/stream/:commandId`);
    console.log(`   • Progress: http://localhost:${port}/progress/:commandId`);
  });
}
