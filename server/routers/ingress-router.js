const express = require('express');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

class IngressRouter {
  constructor() {
    this.router = express.Router();
    this.setupRoutes();
  }

  setupRoutes() {
    // Unified command endpoint (Slack + GPT → same queue)
    this.router.post('/commands', async (req, res) => {
      try {
        const { message, source, domain, priority, context } = req.body;
        
        if (!message) {
          return res.status(400).json({
            error: 'Message is required',
            timestamp: new Date().toISOString()
          });
        }

        const commandId = uuidv4();
        const timestamp = new Date().toISOString();
        const targetDomain = domain || 'CYOPS';
        const commandSource = source || 'unknown';

        // Create unified command object
        const command = {
          commandId,
          message,
          source: commandSource,
          domain: targetDomain,
          priority: priority || 'normal',
          context: context || '',
          timestamp,
          status: 'queued'
        };

        // Write to domain queue under writer root
        const queueDir = `/Users/sawyer/gitSync/.cursor-cache/${targetDomain}/artifacts/queue`;
        await fs.mkdir(queueDir, { recursive: true });
        
        const queueFile = path.join(queueDir, `${commandId}.json`);
        await fs.writeFile(queueFile, JSON.stringify(command, null, 2));

        // Create status mirror
        const statusDir = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/commands`;
        await fs.mkdir(statusDir, { recursive: true });
        
        const statusFile = path.join(statusDir, `${commandId}.json`);
        await fs.writeFile(statusFile, JSON.stringify({
          commandId,
          status: 'queued',
          source: commandSource,
          domain: targetDomain,
          timestamp
        }, null, 2));

        // Log to ingress router log
        const logDir = `/Users/sawyer/gitSync/gpt-cursor-runner/validations/logs`;
        await fs.mkdir(logDir, { recursive: true });
        
        const logFile = path.join(logDir, 'ingress-router.log');
        const logEntry = `${timestamp} [${commandSource.toUpperCase()}] ${targetDomain}: ${message.substring(0, 100)}...\n`;
        await fs.appendFile(logFile, logEntry);

        const response = {
          commandId,
          status: 'queued',
          message: 'Command received and queued for processing',
          source: commandSource,
          domain: targetDomain,
          timestamp
        };

        res.json(response);

        console.log(`📨 Command received: ${commandId} (${commandSource} → ${targetDomain})`);
        console.log(`💬 Message: ${message.substring(0, 100)}...`);

      } catch (error) {
        console.error('❌ Error processing command:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Command status endpoint
    this.router.get('/commands/:id/status', async (req, res) => {
      try {
        const commandId = req.params.id;
        const statusFile = `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/commands/${commandId}.json`;
        
        try {
          const statusData = await fs.readFile(statusFile, 'utf8');
          const status = JSON.parse(statusData);
          res.json(status);
        } catch (error) {
          res.status(404).json({
            error: 'Command not found',
            commandId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Error getting command status:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // List all commands
    this.router.get('/commands', async (req, res) => {
      try {
        const statusDir = '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/commands';
        
        try {
          const files = await fs.readdir(statusDir);
          const commands = [];
          
          for (const file of files) {
            if (file.endsWith('.json')) {
              const filePath = path.join(statusDir, file);
              const content = await fs.readFile(filePath, 'utf8');
              const command = JSON.parse(content);
              commands.push(command);
            }
          }
          
          res.json({
            commands,
            count: commands.length,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          res.json({
            commands: [],
            count: 0,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Error listing commands:', error);
        res.status(500).json({
          error: 'Internal server error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // Health endpoint
    this.router.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'Ingress Router',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: 'v2.3.61'
      });
    });
  }

  getRouter() {
    return this.router;
  }
}

module.exports = IngressRouter;

// Standalone execution
if (require.main === module) {
  const express = require('express');
  const IngressRouter = require('./ingress-router');
  
  const app = express();
  app.use(express.json());
  
  const ingressRouter = new IngressRouter();
  app.use('/ingress', ingressRouter.getRouter());
  
  const port = 5055;
  app.listen(port, () => {
    console.log(`🚦 Ingress Router started on port ${port}`);
    console.log(`📋 Available endpoints:`);
    console.log(`   • Health: http://localhost:${port}/ingress/health`);
    console.log(`   • Commands: http://localhost:${port}/ingress/commands`);
    console.log(`   • Status: http://localhost:${port}/ingress/commands/:id/status`);
    console.log(`   • List: http://localhost:${port}/ingress/commands`);
  });
}
