// Main Express server for GPT-Cursor Runner
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

// Dashboard endpoint with modern UI
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
        <script>
          tailwind.config = {
            theme: {
              extend: {
                colors: {
                  'thoughtmarks': {
                    50: '#f8fafc',
                    100: '#f1f5f9',
                    200: '#e2e8f0',
                    300: '#cbd5e1',
                    400: '#94a3b8',
                    500: '#64748b',
                    600: '#475569',
                    700: '#334155',
                    800: '#1e293b',
                    900: '#0f172a',
                    950: '#020617'
                  }
                }
              }
            }
          }
        </script>
        <style>
          .gradient-bg { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
          .card-hover { transition: all 0.3s ease; }
          .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
          .status-indicator { animation: pulse 2s infinite; }
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        </style>
      </head>
      <body class="gradient-bg min-h-screen text-gray-100">
        <div class="container mx-auto px-4 py-8">
          <!-- Header -->
          <div class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-2">🚀 GPT-Cursor Runner</h1>
            <p class="text-gray-300 text-lg">Control Center & Command Hub</p>
            <div class="flex justify-center items-center mt-4 space-x-4">
              <span class="status-indicator inline-block w-3 h-3 bg-green-400 rounded-full"></span>
              <span class="text-green-400 font-medium">System Operational</span>
              <span class="text-gray-400">•</span>
              <span class="text-gray-300">Port ${PORT}</span>
              <span class="text-gray-400">•</span>
              <span class="text-gray-300">${env}</span>
            </div>
          </div>

          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div class="bg-thoughtmarks-800 rounded-lg p-6 card-hover">
              <div class="flex items-center">
                <div class="p-2 bg-blue-500 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-gray-400 text-sm">Uptime</p>
                  <p class="text-2xl font-bold">${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m</p>
                </div>
              </div>
            </div>
            
            <div class="bg-thoughtmarks-800 rounded-lg p-6 card-hover">
              <div class="flex items-center">
                <div class="p-2 bg-green-500 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-gray-400 text-sm">Memory</p>
                  <p class="text-2xl font-bold">${memoryMB}MB</p>
                </div>
              </div>
            </div>
            
            <div class="bg-thoughtmarks-800 rounded-lg p-6 card-hover">
              <div class="flex items-center">
                <div class="p-2 bg-purple-500 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-gray-400 text-sm">Commands</p>
                  <p class="text-2xl font-bold">35</p>
                </div>
              </div>
            </div>
            
            <div class="bg-thoughtmarks-800 rounded-lg p-6 card-hover">
              <div class="flex items-center">
                <div class="p-2 bg-yellow-500 rounded-lg">
                  <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                </div>
                <div class="ml-4">
                  <p class="text-gray-400 text-sm">Active</p>
                  <p class="text-2xl font-bold">38</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Command Sections -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <!-- Slack-Registered Commands -->
            <div class="bg-thoughtmarks-800 rounded-lg p-6">
              <h2 class="text-xl font-bold mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
                Slack-Registered Commands (38)
              </h2>
              <div class="space-y-2 max-h-96 overflow-y-auto">
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/dashboard</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/patch-approve</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/status-runner</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/pause-runner</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/toggle-runner-auto</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/theme</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/whoami</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/proceed</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/troubleshoot</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="flex items-center justify-between p-2 bg-thoughtmarks-700 rounded">
                  <span class="text-sm">/gpt-slack-dispatch</span>
                  <span class="text-xs text-green-400">Active</span>
                </div>
                <div class="text-xs text-gray-400 mt-2">+ 20 more commands...</div>
              </div>
            </div>

            <!-- Dashboard-Only Commands -->
            <div class="bg-thoughtmarks-800 rounded-lg p-6">
              <h2 class="text-xl font-bold mb-4 flex items-center">
                <svg class="w-5 h-5 mr-2 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                Dashboard-Only Commands (5)
              </h2>
              <div class="space-y-2">
                <button onclick="testCommand('/gpt-ping')" class="w-full text-left p-2 bg-thoughtmarks-700 rounded hover:bg-thoughtmarks-600 transition-colors">
                  <span class="text-sm">/gpt-ping</span>
                  <span class="text-xs text-green-400 ml-2">Active</span>
                </button>
                <button onclick="testCommand('/approve-screenshot')" class="w-full text-left p-2 bg-thoughtmarks-700 rounded hover:bg-thoughtmarks-600 transition-colors">
                  <span class="text-sm">/approve-screenshot</span>
                  <span class="text-xs text-green-400 ml-2">Active</span>
                </button>
                <button onclick="testCommand('/command-center')" class="w-full text-left p-2 bg-thoughtmarks-700 rounded hover:bg-thoughtmarks-600 transition-colors">
                  <span class="text-sm">/command-center</span>
                  <span class="text-xs text-green-400 ml-2">Active</span>
                </button>
                <button onclick="testCommand('/continue-runner')" class="w-full text-left p-2 bg-thoughtmarks-700 rounded hover:bg-thoughtmarks-600 transition-colors">
                  <span class="text-sm">/continue-runner</span>
                  <span class="text-xs text-green-400 ml-2">Active</span>
                </button>
                <button onclick="testCommand('/patch-status')" class="w-full text-left p-2 bg-thoughtmarks-700 rounded hover:bg-thoughtmarks-600 transition-colors">
                  <span class="text-sm">/patch-status</span>
                  <span class="text-xs text-green-400 ml-2">Active</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="mt-8 bg-thoughtmarks-800 rounded-lg p-6">
            <h2 class="text-xl font-bold mb-4">Quick Actions</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button onclick="testCommand('/status-runner')" class="p-4 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                <div class="text-center">
                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                  </svg>
                  <span class="text-sm font-medium">Status</span>
                </div>
              </button>
              
              <button onclick="testCommand('/gpt-ping')" class="p-4 bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                <div class="text-center">
                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                  </svg>
                  <span class="text-sm font-medium">Ping</span>
                </div>
              </button>
              
              <button onclick="testCommand('/troubleshoot')" class="p-4 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors">
                <div class="text-center">
                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  </svg>
                  <span class="text-sm font-medium">Troubleshoot</span>
                </div>
              </button>
              
              <button onclick="window.open('/health', '_blank')" class="p-4 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors">
                <div class="text-center">
                  <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path>
                  </svg>
                  <span class="text-sm font-medium">Health</span>
                </div>
              </button>
            </div>
          </div>

          <!-- Live Queue Controls and Patch View -->
          <div class="mt-8 bg-thoughtmarks-800 rounded-lg p-6">
            <h2 class="text-xl font-bold mb-4 flex items-center">
              <svg class="w-5 h-5 mr-2 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Live Runner Queue & Patch Controls
            </h2>
            
            <!-- Patch Watchdog Status -->
            <div class="mb-6 p-4 bg-thoughtmarks-700 rounded-lg">
              <h3 class="text-lg font-semibold mb-3 text-purple-300">Patch Watchdog Status</h3>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-400" id="total-patches">0</div>
                  <div class="text-sm text-gray-400">Total Patches</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-400" id="delivered-patches">0</div>
                  <div class="text-sm text-gray-400">Delivered</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-red-400" id="failed-patches">0</div>
                  <div class="text-sm text-gray-400">Failed</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-yellow-400" id="escalated-patches">0</div>
                  <div class="text-sm text-gray-400">Escalated</div>
                </div>
              </div>
              <div class="mt-4 flex justify-center space-x-2">
                <button onclick="testWatchdog()" class="px-3 py-1 bg-purple-600 rounded text-sm hover:bg-purple-700 transition-colors">
                  Test Watchdog
                </button>
                <button onclick="refreshWatchdogStatus()" class="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700 transition-colors">
                  Refresh Status
                </button>
              </div>
            </div>
            
            <!-- Current Patch Status -->
            <div class="mb-6 p-4 bg-thoughtmarks-700 rounded-lg">
              <h3 class="text-lg font-semibold mb-3 text-orange-300">Current Patch Status</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-orange-400" id="current-patch-name">No Active Patch</div>
                  <div class="text-sm text-gray-400">Current Patch</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-blue-400" id="elapsed-time">00:00:00</div>
                  <div class="text-sm text-gray-400">Elapsed Time</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-green-400" id="cursor-state">Idle</div>
                  <div class="text-sm text-gray-400">Cursor State</div>
                </div>
              </div>
            </div>

            <!-- Queue Controls -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <!-- Queued Tasks -->
              <div class="bg-thoughtmarks-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-3 text-blue-300">Queued Tasks</h3>
                <div class="space-y-2 max-h-48 overflow-y-auto" id="queued-tasks">
                  <div class="text-gray-400 text-sm">No queued tasks</div>
                </div>
                <div class="mt-4 flex space-x-2">
                  <button onclick="testCommand('/patch-status')" class="px-3 py-1 bg-blue-600 rounded text-sm hover:bg-blue-700 transition-colors">
                    Refresh Queue
                  </button>
                  <button onclick="testCommand('/reorder-queue')" class="px-3 py-1 bg-yellow-600 rounded text-sm hover:bg-yellow-700 transition-colors">
                    Reorder
                  </button>
                </div>
              </div>

              <!-- Queue Actions -->
              <div class="bg-thoughtmarks-700 rounded-lg p-4">
                <h3 class="text-lg font-semibold mb-3 text-green-300">Queue Actions</h3>
                <div class="space-y-3">
                  <button onclick="testCommand('/patch-approve')" class="w-full p-3 bg-green-600 rounded-lg hover:bg-green-700 transition-colors text-left">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                      <span>Approve Next Patch</span>
                    </div>
                  </button>
                  
                  <button onclick="testCommand('/patch-revert')" class="w-full p-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors text-left">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
                      </svg>
                      <span>Revert Last Patch</span>
                    </div>
                  </button>
                  
                  <button onclick="testCommand('/skip-task')" class="w-full p-3 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors text-left">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"></path>
                      </svg>
                      <span>Skip Current Task</span>
                    </div>
                  </button>
                  
                  <button onclick="testCommand('/cancel-patch')" class="w-full p-3 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors text-left">
                    <div class="flex items-center">
                      <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                      <span>Cancel Current Patch</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="mt-8 text-center text-gray-400 text-sm">
            <p>GPT-Cursor Runner Dashboard • Built with Node.js & Express</p>
            <p class="mt-1">Endpoint: https://gpt-cursor-runner.fly.dev</p>
          </div>
        </div>

        <script>
          async function testCommand(command) {
            try {
              const response = await fetch('/slack/commands', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  command: command,
                  text: '',
                  user_id: 'dashboard',
                  channel_id: 'dashboard'
                })
              });
              
              const result = await response.text();
              alert(\`Command \${command} result: \${result}\`);
            } catch (error) {
              alert(\`Error testing command: \${error.message}\`);
            }
          }

          // Live queue status updates
          async function updateQueueStatus() {
            try {
              const response = await fetch('/slack/commands', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  command: '/patch-status',
                  text: '',
                  user_id: 'dashboard',
                  channel_id: 'dashboard'
                })
              });
              
              const result = await response.text();
              
              // Parse patch status and update UI
              if (result.includes('Current Patch:')) {
                const patchMatch = result.match(/Current Patch: ([^\\n]+)/);
                if (patchMatch) {
                  document.getElementById('current-patch-name').textContent = patchMatch[1];
                }
              }
              
              if (result.includes('Last Status:')) {
                const statusMatch = result.match(/Last Status: ([^\\n]+)/);
                if (statusMatch) {
                  document.getElementById('cursor-state').textContent = statusMatch[1];
                }
              }
              
              // Update elapsed time
              const now = new Date();
              const startTime = new Date(now.getTime() - 300000); // 5 minutes ago for demo
              const elapsed = Math.floor((now - startTime) / 1000);
              const hours = Math.floor(elapsed / 3600);
              const minutes = Math.floor((elapsed % 3600) / 60);
              const seconds = elapsed % 60;
              document.getElementById('elapsed-time').textContent = 
                \`\${hours.toString().padStart(2, '0')}:\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
              
            } catch (error) {
              console.error('Error updating queue status:', error);
            }
          }

          // Update queue status every 5 seconds
          setInterval(updateQueueStatus, 5000);
          
          // Update watchdog status every 10 seconds
          setInterval(updateWatchdogStatus, 10000);
          
          // Initial updates
          updateQueueStatus();
          updateWatchdogStatus();
          
          // Watchdog functions
          async function testWatchdog() {
            try {
              const response = await fetch('/slack/commands', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  command: '/patch-watchdog-status',
                  text: 'test',
                  user_id: 'dashboard',
                  channel_id: 'dashboard'
                })
              });
              
              const result = await response.text();
              alert(`Watchdog test result: ${result}`);
            } catch (error) {
              alert(`Error testing watchdog: ${error.message}`);
            }
          }
          
          async function refreshWatchdogStatus() {
            updateWatchdogStatus();
          }
          
          async function updateWatchdogStatus() {
            try {
              const response = await fetch('/logs/patch-watchdog-status.json');
              if (response.ok) {
                const status = await response.json();
                document.getElementById('total-patches').textContent = status.totalPatches || 0;
                document.getElementById('delivered-patches').textContent = status.deliveredPatches || 0;
                document.getElementById('failed-patches').textContent = status.failedPatches || 0;
                document.getElementById('escalated-patches').textContent = status.escalatedPatches || 0;
              }
            } catch (error) {
              console.error('Error updating watchdog status:', error);
            }
          }
        </script>
      </body>
    </html>
  `);
});

// API endpoint for plist status
app.get('/api/plist-status', async (req, res) => {
  try {
    const handlePlistStatus = require('./handlers/handlePlistStatus');
    await handlePlistStatus(req, res);
  } catch (error) {
    console.error('Error in plist-status API:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Log sync endpoint
app.post('/api/logs/sync', (req, res) => {
  try {
    console.log('📥 Received log sync from agent:', req.body.project_name);
    
    const { operation_uuid, project_name, timestamp, agent_hostname, agent_user, log_files } = req.body;
    
    // Store received logs
    const logDir = './logs/synced';
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    const syncFile = path.join(logDir, `${project_name}_${Date.now()}.json`);
    fs.writeFileSync(syncFile, JSON.stringify(req.body, null, 2));
    
    console.log(`✅ Logs synced from ${project_name} (${Object.keys(log_files).length} files)`);
    
    res.json({
      success: true,
      message: `Logs received from ${project_name}`,
      files_received: Object.keys(log_files).length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error processing log sync:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
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
    console.log(`🚀 GPT-Cursor Runner Server running on port ${PORT}`);
    console.log(`📡 Slack commands: https://gpt-cursor-runner.fly.dev/slack/commands`);
    console.log(`🔗 Health check: https://gpt-cursor-runner.fly.dev/health`);
    console.log(`🌐 Dashboard: https://gpt-cursor-runner.fly.dev/dashboard`);
});

module.exports = app; 