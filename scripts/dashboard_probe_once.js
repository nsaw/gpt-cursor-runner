const fs = require('fs');
const http = require('http');
const https = require('https');
const url = process.env.DASHBOARD_URL;
const outDir = 'summaries';
const out = `${outDir}/dashboard-probe-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;

(() => {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  if (!url) {
    fs.writeFileSync(out, JSON.stringify({ ok: false, reason: 'skipped:no-url', ts: new Date().toISOString() }, null, 2));
    process.exit(0);
  }
  const lib = url.startsWith('https') ? https : http;
  const req = lib.get(url, { timeout: 8000 }, (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      let status = 'unknown';
      try {
        const j = JSON.parse(body);
        status = (j.status || j.state || '').toString().toLowerCase();
      } catch {
        if (body.toLowerCase().includes('green')) status = 'green';
      }
      fs.writeFileSync(out, JSON.stringify({ ok: true, code: res.statusCode, status, bodyPreview: body.slice(0, 256), ts: new Date().toISOString() }, null, 2));
    });
  });
  req.on('timeout', () => { req.destroy(); fs.writeFileSync(out, JSON.stringify({ ok:false, reason:'timeout', ts:new Date().toISOString() }, null, 2)); });
  req.on('error', (e) => { fs.writeFileSync(out, JSON.stringify({ ok:false, reason:String(e), ts:new Date().toISOString() }, null, 2)); });
})();
