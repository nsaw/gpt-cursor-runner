const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.ORCHESTRATOR_PORT || 4001;

// Middleware
app.use(express.json());

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'orchestrator-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
  });
});

// Monitor endpoint
app.get('/monitor', (req, res) => {
  try {
    const registryFile = path.join(
      __dirname,
      '../registry/process-registry.json',
    );
    const statusPath = path.resolve(
      __dirname,
      '../../.cursor-cache/CYOPS/ghost/status.json',
    );

    const registry = fs.existsSync(registryFile)
      ? JSON.parse(fs.readFileSync(registryFile))
      : {};
    const status = fs.existsSync(statusPath)
      ? JSON.parse(fs.readFileSync(statusPath))
      : {};

    res.json({
      service: 'orchestrator-server',
      status: 'running',
      port: PORT,
      timestamp: new Date().toISOString(),
      registry,
      ghostStatus: status,
      endpoints: ['/health', '/monitor', '/status'],
    });
  } catch (_error) {
    res.status(500).json({
      error: 'Failed to get monitor data',
      details: error.message,
    });
  }
});

// Status endpoint (same as monitor but more detailed)
app.get('/status', (req, res) => {
  try {
    const registryFile = path.join(
      __dirname,
      '../registry/process-registry.json',
    );
    const diagFile = path.join(
      __dirname,
      '../registry/orchestrator.diagnostic.json',
    );
    const statusPath = path.resolve(
      __dirname,
      '../../.cursor-cache/CYOPS/ghost/status.json',
    );

    const registry = fs.existsSync(registryFile)
      ? JSON.parse(fs.readFileSync(registryFile))
      : {};
    const diagnostics = fs.existsSync(diagFile)
      ? JSON.parse(fs.readFileSync(diagFile))
      : {};
    const status = fs.existsSync(statusPath)
      ? JSON.parse(fs.readFileSync(statusPath))
      : {};

    res.json({
      orchestrator: {
        service: 'orchestrator-server',
        status: 'running',
        port: PORT,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
      processes: registry,
      diagnostics,
      ghostStatus: status,
    });
  } catch (_error) {
    res.status(500).json({
      error: 'Failed to get status data',
      details: error.message,
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'orchestrator-server',
    status: 'running',
    port: PORT,
    endpoints: ['/health', '/monitor', '/status'],
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Orchestrator Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Monitor: http://localhost:${PORT}/monitor`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
});

module.exports = app;
