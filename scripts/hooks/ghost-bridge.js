// ghost-bridge.js: Express server with viewer route support
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.SLACK_PORT || 3000;
const ROOT = '/Users/sawyer/gitSync/.cursor-cache/';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('Ghost Bridge Server Running');
});

app.get('/viewer', (req, res) => {
  const folder = req.query.zone || 'CYOPS';
  const summariesPath = path.join(ROOT, folder, 'summaries');
  fs.readdir(summariesPath, (err, files) => {
    if (err) return res.status(500).send('Error reading summaries.');
    const html = `<html><body><h2>${folder} Summaries</h2><ul>` +
      files.map(f => `<li><a href='/viewer/file?zone=${folder}&file=${f}'>${f}</a></li>`).join('') + '</ul></body></html>';
    res.send(html);
  });
});

app.get('/viewer/file', (req, res) => {
  const filePath = path.join(ROOT, req.query.zone, 'summaries', req.query.file);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading file');
    res.send(`<pre>${data}</pre>`);
  });
});

app.listen(PORT, () => {
  console.log(`[GHOST-BRIDGE] Viewer server running on port ${PORT}`);
}); 