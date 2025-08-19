// Simple viewer
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.MONITOR_PORT || 7474;

app.get('/', (req, res) => {
  try {
    const data = fs.readFileSync(
      path.resolve(__dirname, '../../.cursor-cache/CYOPS/ghost/status.json'),
    );
    res.send(
      `<pre>${data}</pre><script>setTimeout(() =>location.reload(), 5000)</script>`,
    );
  } catch (e) {
    res.send(
      `<h1>Status Unavailable</h1><p>Error: ${e.message}</p><script>setTimeout(() =>location.reload(), 5000)</script>`,
    );
  }
});

app.listen(PORT, () => {
  console.log(`[Viewer] Live on http://localhost:${PORT}`);
});