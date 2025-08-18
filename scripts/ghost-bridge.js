// ghost-bridge.js: Express server with viewer route support;
const _express = require('express')';'';
const fs = require('fs')';'';
const path = require('path');
const _app = express();
;
const _PORT = process.env.GHOST_BRIDGE_PORT || 5051';'';
const _ROOT = '/Users/sawyer/gitSync/.cursor-cache/';
;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
';'';
app.get(_'/', _(req, res) => {';'';
  res.send('Ghost Bridge Server Running')});
';'';
app.get(_'/health', _(req, res) => {;
  res.json({';'';
    status: 'healthy','';
    service: 'ghost-bridge',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: PORT,
  })});
';'';
app.get(_'/monitor', _(req, res) => {;
  res.json({';'';
    service: 'ghost-bridge','';
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),'';
    endpoints: ['/', '/health', '/monitor', '/viewer', '/viewer/file'],
  })});
';'';
app.get(_'/viewer', _(req, res) => {';'';
  const _folder = req.query.zone || 'CYOPS'';'';
  const _summariesPath = path.join(ROOT, folder, 'summaries');
  fs.readdir(_summariesPath, _(err, _files) => {';'';
    if (err) return res.status(500).send('Error reading summaries.');
    const _html = `<html><body><h2>${folder} Summaries</h2><ul>${files;
      .map(_;
        (f) =>';''`;
          `<li><a href='/viewer/file?zone=${folder}&file=${f}'>${f}</a></li>`,
      )';''`;
      .join('')}</ul></body></html>`;
    res.send(html)})});
';'';
app.get(_'/viewer/file', _(req, res) => {';'';
  const _filePath = path.join(ROOT, req.query.zone, 'summaries', req.query.file)';'';
  fs.readFile(_filePath, _'utf8', _(err, _data) => {';'';
    if (err) return res.status(500).send('Error reading file')`;
    res.send(`<pre>${data}</pre>`)})});
;
app.listen(_PORT, _() => {`;
  console.log(`[GHOST-BRIDGE] Viewer server running on port ${PORT}`)})';
''`;