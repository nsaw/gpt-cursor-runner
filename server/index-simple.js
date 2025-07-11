// Simplified Express server for GPT-Cursor Runner
const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5051;

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

// API routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Simple dashboard endpoint
app.get('/dashboard', (req, res) => {
  const uptime = Math.floor(process.uptime());
  const memoryMB = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  const env = process.env.NODE_ENV || 'development';
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>GPT-Cursor Runner Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body class="bg-gray-900 text-white min-h-screen">
        <div class="container mx-auto px-4 py-8">
          <h1 class="text-4xl font-bold mb-8">🚀 GPT-Cursor Runner</h1>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg p-6">
              <h2 class="text-xl font-bold mb-2">System Status</h2>
              <p>Uptime: ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m</p>
              <p>Memory: ${memoryMB}MB</p>
              <p>Environment: ${env}</p>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
              <h2 class="text-xl font-bold mb-2">API Endpoints</h2>
              <ul class="space-y-2">
                <li><a href="/health" class="text-blue-400 hover:underline">/health</a></li>
                <li><a href="/api/plist-status" class="text-blue-400 hover:underline">/api/plist-status</a></li>
                <li><a href="/slack/test" class="text-blue-400 hover:underline">/slack/test</a></li>
              </ul>
            </div>
            
            <div class="bg-gray-800 rounded-lg p-6">
              <h2 class="text-xl font-bold mb-2">Quick Actions</h2>
              <button onclick="checkPlistStatus()" class="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 mb-2">
                Check Plist Status
              </button>
              <div id="plist-result" class="mt-4 text-sm"></div>
            </div>
          </div>
        </div>
        
        <script>
          async function checkPlistStatus() {
            try {
              const response = await fetch('/api/plist-status');
              const data = await response.json();
              document.getElementById('plist-result').innerHTML = 
                '<pre class="bg-gray-700 p-2 rounded text-xs">' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
              document.getElementById('plist-result').innerHTML = 
                '<div class="text-red-400">Error: ' + error.message + '</div>';
            }
          }
        </script>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
  console.log(`📋 API: http://localhost:${PORT}/api/plist-status`);
}); 