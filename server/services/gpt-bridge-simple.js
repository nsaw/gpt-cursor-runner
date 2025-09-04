const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class GPTBridge {
  constructor(port = 5054) {
    this.app = express();
    this.port = port;
    this.isRunning = false;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS middleware
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
    // Health endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'GPT Bridge',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: 'v2.3.61'
      });
    });

    // Main GPT command endpoint
    this.app.post('/gpt/commands', async (req, res) => {
      try {
        const command = req.body;
        
        if (!command.message) {
          return res.status(400).json({
            error: 'Message is required',
            timestamp: new Date().toISOString()
          });
        }

        const patchId = uuidv4();
        const domain = command.domain || 'CYOPS';
        const timestamp = new Date().toISOString();

        // Create patch file in writer root
        const patchData = {
          patchId,
          message: command.message,
          context: command.context || '',
          domain,
          priority: command.priority || 'normal',
          timestamp,
          status: 'queued'
        };

        const writerRoot = `/Users/sawyer/gitSync/.cursor-cache/${domain}/artifacts/patches`;
        await fs.mkdir(writerRoot, { recursive: true });
        
        const patchFile = path.join(writerRoot, `${patchId}.json`);
        await fs.writeFile(patchFile, JSON.stringify(patchData, null, 2));

        // Create status mirror
        const statusMirror = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/patches`;
        await fs.mkdir(statusMirror, { recursive: true });
        
        const statusFile = path.join(statusMirror, `${patchId}.json`);
        await fs.writeFile(statusFile, JSON.stringify({
          patchId,
          status: 'queued',
          timestamp,
          domain
        }, null, 2));

        const response = {
          patchId,
          status: 'queued',
          message: 'Command received and queued for processing',
          timestamp,
          domain
        };

        res.json(response);

        // Log the command
        console.log(`📨 GPT Command received: ${patchId} (${domain})`);
        console.log(`💬 Message: ${command.message.substring(0, 100)}...`);

      } catch (error) {
        console.error('❌ Error processing GPT command:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Patch status endpoint
    this.app.get('/gpt/patch/:id/status', async (req, res) => {
      try {
        const patchId = req.params.id;
        const statusFile = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/patches/${patchId}.json`;
        
        try {
          const statusData = await fs.readFile(statusFile, 'utf8');
          const status = JSON.parse(statusData);
          res.json(status);
        } catch (error) {
          res.status(404).json({
            error: 'Patch not found',
            patchId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Error getting patch status:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // List all patches
    this.app.get('/gpt/patches', async (req, res) => {
      try {
        const statusDir = '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/patches';
        
        try {
          const files = await fs.readdir(statusDir);
          const patches = [];
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(statusDir, file);
              const content = await fs.readFile(filePath, 'utf8');
              const patch = JSON.parse(content);
              patches.push(patch);
            }
          }
          
          res.json({
            patches,
            count: patches.length,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          res.json({
            patches: [],
            count: 0,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Error listing patches:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.port, () => {
          this.isRunning = true;
          console.log(`🌉 GPT Bridge started on port ${this.port}`);
          console.log(`📋 Available endpoints:`);
          console.log(`   • Health: http://localhost:${this.port}/health`);
          console.log(`   • Commands: http://localhost:${this.port}/gpt/commands`);
          console.log(`   • Status: http://localhost:${this.port}/gpt/patch/:id/status`);
          console.log(`   • List: http://localhost:${this.port}/gpt/patches`);
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop() {
    if (this.isRunning) {
      this.isRunning = false;
      console.log('🛑 GPT Bridge stopped');
    }
  }

  isHealthy() {
    return this.isRunning;
  }
}

module.exports = GPTBridge;

// Standalone execution
if (require.main === module) {
  const bridge = new GPTBridge();
  bridge.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down GPT Bridge...');
    await bridge.stop();
    process.exit(0);
  });
}
