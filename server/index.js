// Main Express server for GPT-Cursor Runner
const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5555;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint for Fly.io
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Slack test endpoint
app.get('/slack/test', (req, res) => {
  res.status(200).json({
    message: 'Slack integration ready',
    timestamp: new Date().toISOString()
  });
});

// Serve static files
app.use('/public', express.static(path.join(__dirname, '../public')));

// Slack commands router
const slackRouter = require('./routes/slack');
app.use('/slack', slackRouter);

// Dashboard endpoint
app.get('/dashboard', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>GPT-Cursor Runner Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; }
          .status { padding: 20px; border-radius: 8px; margin: 20px 0; }
          .healthy { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
          .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
          .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        </style>
      </head>
      <body>
        <h1>🚀 GPT-Cursor Runner Dashboard</h1>
        <div class="status healthy">
          <h2>✅ System Status: Healthy</h2>
          <p>Runner is operational and ready to process GPT patches.</p>
        </div>
        <div class="status warning">
          <h3>📊 Quick Stats</h3>
          <ul>
            <li>Uptime: ${Math.floor(process.uptime())} seconds</li>
            <li>Environment: ${process.env.NODE_ENV || 'development'}</li>
            <li>Port: ${PORT}</li>
            <li>Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</li>
          </ul>
        </div>
        <div class="status">
          <h3>🔗 Endpoints</h3>
          <ul>
            <li><a href="/health">Health Check</a></li>
            <li><a href="/slack/test">Slack Test</a></li>
            <li><a href="/public/runner_fallback.html">Fallback Page</a></li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Fallback route
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GPT-Cursor Runner started on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Slack Test: http://localhost:${PORT}/slack/test`);
});

module.exports = app; 