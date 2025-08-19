#!/usr/bin/env node

// Lightweight webhook server for local health + Slack OAuth callback
const express = require('express');
const app = express();

const PORT = process.env.PORT || 5051;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'webhook-server',
    ts: new Date().toISOString(),
  });
});

// Minimal Slack OAuth callback endpoint (logs and returns basic response)
app.get('/slack/oauth/callback', (req, res) => {
  const { code, state, error } = req.query || {};
  console.log('[webhook-server] /slack/oauth/callback', {
    code: !!code,
    state,
    error,
  });
  if (error) {
    return res.status(400).send(`OAuth error: ${error}`);
  }
  if (!code) {
    return res.status(400).send('Missing authorization code');
  }
  res.status(202).send('OAuth callback received.');
});

// Generic root route
app.get('/', (req, res) => {
  res.send(
    '<h1>Webhook Server</h1><p>Health: <a href="/health">/health</a></p>',
  );
});

app.listen(PORT, () => {
  console.log(`[webhook-server] listening on http://localhost:${PORT}`);
});