/* eslint-disable */
const https = require('https');
const url = process.env.GHOST_WEBHOOK_URL || '';
if (!url) { console.log('[slack/webhook] GHOST_WEBHOOK_URL not set — skipping probe.'); process.exit(0); }
const payload = JSON.stringify({ type: 'probe', ts: Date.now(), message: 'echo from run_slack_probe_once.js' });
const u = new URL(url);
const opts = { method: 'POST', hostname: u.hostname, path: u.pathname + u.search, headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } };
const req = https.request(opts, (res) => {
  const ok = (res.statusCode||0) >= 200 && (res.statusCode||0) < 300;
  res.resume(); res.on('end', ()=> process.exit(ok ? 0 : 1));
});
req.on('error', ()=> process.exit(1));
req.write(payload); req.end();
