// Creates an Express server at :7474/ghost
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 7474;
const CACHE_PATH = '/Users/sawyer/gitSync/.cursor-cache';

app.get('/ghost', (req, res) => {
  const cyopsStatus = tryRead(path.join(CACHE_PATH, 'CYOPS/.logs/ghost-relay.log'));
  const mainStatus = tryRead(path.join(CACHE_PATH, 'MAIN/.logs/ghost-relay.log'));
  res.send(`<pre><h2>GHOST STATUS</h2>

=== CYOPS ===
${cyopsStatus}

=== MAIN ===
${mainStatus}</pre>`);
});

function tryRead(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return '[Unavailable]';
  }
}

app.listen(PORT, () => console.log(`[LIVE] Ghost monitor running on http://localhost:${PORT}/ghost`)); 