const fs = require('fs/promises');
(async () => {
  const paths = [
    'summaries/_heartbeat/.runner-health.json',
    'summaries/_heartbeat/.tunnel-health.json',
    'summaries/_heartbeat/.daemon-health.json'
  ];
  const health = {};
  await Promise.all(paths.map(async p => {
    try {
      const d = JSON.parse(await fs.readFile(p));
      Object.assign(health, d);
    } catch {}
  }));
  await fs.writeFile('summaries/_heartbeat/.async-health.json', JSON.stringify(health, null, 2));
})(); 