// Main Express server for GPT-Cursor Runner
const express = require('express');
const path = require('path');
require('dotenv').config();
const auth = require('./middleware/auth');
const { generalLimiter, apiLimiter, webhookLimiter, authLimiter } = require('./middleware/rate-limit');
const { webhookValidations, apiValidations, slackValidations, validate } = require('./middleware/validation');
const { cache, invalidateCache, getCacheStats, cacheHealth } = require('../utils/cache');

const app = express();
const PORT = process.env.PORT || 5555;

// Security: Disable debug mode in production
const isProduction = process.env.NODE_ENV === 'production';
app.set('env', isProduction ? 'production' : 'development');

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use(generalLimiter);
app.use('/api', apiLimiter);
app.use('/webhook', webhookLimiter);
app.use('/auth', authLimiter);

// Health endpoints (no auth required)
app.get('/health', cache(60), (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development',
    slack: 'webhook mode'
  });
});

app.get('/healthz', cache(60), (req, res) => res.json({ status: 'healthy' }));

// Cache management endpoints
app.get('/api/cache/stats', async (req, res) => {
  const stats = await getCacheStats();
  res.json(stats);
});

app.get('/api/cache/health', async (req, res) => {
  const health = await cacheHealth();
  res.json(health);
});

app.post('/api/cache/clear', invalidateCache('cache:*'), (req, res) => {
  res.json({ message: 'Cache cleared successfully' });
});

// Apply JWT auth to protected routes
app.use('/api', auth, require('./routes/api'));
app.use('/slack', auth, require('./routes/slack'));

// Slack test endpoint
app.get('/slack/test', (req, res) => {
  res.status(200).json({
    message: 'Slack webhook integration ready',
    timestamp: new Date().toISOString(),
    tunnel: 'ngrok (temporary)',
    url: 'https://2179f6fea5bc.ngrok-free.app'
  });
});

// Slack OAuth callback
app.get('/oauth/callback', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>OAuth Callback</title>
      </head>
      <body>
        <h1>OAuth Callback</h1>
        <p>Authorization successful!</p>
        <script>window.close();</script>
      </body>
    </html>
  `);
});

// Slack interactive components endpoint
app.post('/slack/interactive', slackValidations, validate, async (req, res) => {
  try {
    const { payload } = req.body;
    const parsedPayload = JSON.parse(payload);
    
    console.log('Received interactive component:', parsedPayload.type);
    
    // Handle different interactive components
    switch (parsedPayload.type) {
    case 'block_actions':
      // Handle button clicks, dropdowns, etc.
      res.json({ text: 'Action received' });
      break;
    case 'view_submission':
      // Handle modal submissions
      res.json({ text: 'Modal submitted' });
      break;
    default:
      res.json({ text: 'Unknown interactive component' });
    }
  } catch (error) {
    console.error('Error handling interactive component:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Slack events endpoint
app.post('/slack/events', slackValidations, validate, async (req, res) => {
  try {
    const { type, event } = req.body;
    
    console.log('Received Slack event:', type);
    
    // Handle different event types
    switch (type) {
      case 'url_verification':
        // Slack URL verification
        res.json({ challenge: req.body.challenge });
        break;
      case 'event_callback':
        // Handle actual events
        if (event.type === 'app_mention') {
          console.log('App mentioned:', event.text);
        }
        res.json({ ok: true });
        break;
      default:
        res.json({ ok: true });
    }
  } catch (error) {
    console.error('Error handling Slack event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve static files
app.use('/public', express.static(path.join(__dirname, '../public')));

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
            <li>Slack: Webhook mode</li>
            <li>URL: https://runner.thoughtmarks.app</li>
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
        <div class="status warning">
          <h3>⚠️ Next Steps</h3>
          <p>To complete Slack integration:</p>
          <ol>
            <li>Update your Slack app settings with the webhook URLs</li>
            <li>Point slash commands to: <code>https://runner.thoughtmarks.app/slack/commands</code></li>
            <li>Set interactive components URL to: <code>https://runner.thoughtmarks.app/slack/interactive</code></li>
            <li>Set events subscription URL to: <code>https://runner.thoughtmarks.app/slack/events</code></li>
          </ol>
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
  console.log(`🚀 GPT-Cursor Runner Server running on port ${PORT}`);
  console.log(`📡 Slack commands: https://runner.thoughtmarks.app/slack/commands`);
  console.log(`🔗 Health check: https://runner.thoughtmarks.app/health`);
  console.log(`⚠️ Slack integration configured for webhook mode`);
});

module.exports = app; 