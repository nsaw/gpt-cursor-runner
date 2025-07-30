// Local Ghost Relay + Emergency Shell
const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const fs = require('fs');
const patchRouter = require('./patchRouter');

const app = express();
app.use(bodyParser.json());
const PORT = process.env.NODE_PORT || 5052;
const GPT_KEY = process.env.GPT_EMERGENCY_KEY || 'supersecret';

// Use patch router
app.use('/', patchRouter);

// Relay listener
app.post('/relay/receive', (req, res) => {
  const { type } = req.body || {};
  const log = `[Relay] ${new Date().toISOString()} — ${type}`;
  fs.appendFileSync('logs/relay.log', `${log}\n`);
  res.json({ ok: true });
});

// GPT Emergency shell
app.post('/emergency/exec', (req, res) => {
  const key = req.headers['x-gpt-key'];
  if (key !== GPT_KEY) return res.status(403).json({ error: 'Unauthorized' });
  const { cmd } = req.body || {};
  if (!cmd) return res.status(400).json({ error: 'Missing command' });
  exec(cmd, (err, stdout, stderr) => {
    res.json({ stdout, stderr, code: err?.code || 0 });
  });
});

app.listen(PORT, () => {
  console.log(`[LocalNode] Listening on http://localhost:${PORT}`);
}); 