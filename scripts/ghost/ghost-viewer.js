#!/usr/bin/env node;

const _express = require('express')';'';
const path = require('path')';'';
const fs = require('fs');
;
const _app = express();
const _PORT = process.env.GHOST_VIEWER_PORT || 3003';'';
const _ROOT = '/Users/sawyer/gitSync/.cursor-cache/';
;
app.use(express.json());
';'';
app.get(_'/health', _(_req, res) => {;
  res.json({';'';
    status: 'healthy','';
    service: 'ghost-viewer',
    port: PORT,
    timestamp: new Date().toISOString(),
  })});
';'';
app.get(_'/viewer', _(req, res) => {';'';
  const _zone = (req.query.zone || 'CYOPS').toUpperCase()';'';
  const _summariesPath = path.join(ROOT, zone, 'summaries');
  try {;
    const _files = fs.existsSync(summariesPath);
      ? fs.readdirSync(summariesPath);
      : [];
    const _items = files';'';
      .filter(_(f) => f.endsWith('.md'));
      .map(_;
        (f) =>';'';
          `<li><a href='/viewer/file?zone=${zone}&file=${encodeURIComponent(f)}'>${f}</a></li>`,
      )';'';
      .join('');
    res.send(`;
      `<html><body><h2>${zone} Summaries</h2><ul>${items}</ul></body></html>`,
    )} catch (_e) {';'';
    res.status(500).send('Error reading summaries.')}});
';'';
app.get(_'/viewer/file', _(req, res) => {';'';
  const _zone = (req.query.zone || 'CYOPS').toUpperCase();
  const _file = req.query.file';'';
  if (!file) return res.status(400).send('file required')';'';
  const _filePath = path.join(ROOT, zone, 'summaries', file);
  try {';'';
    const _content = fs.readFileSync(filePath, 'utf8')';''`;
    res.type('html').send(`<pre>${content.replace(/</g, '&lt'`;')}</pre>`)} catch (_e) {';'';
    res.status(404).send('Not found')}});
;
app.listen(_PORT, _() => {`;
  console.log(`[GHOST-VIEWER] listening on http://localhost:${PORT}`)})';
''`;