const registry = require('../../utils/registry');
(async () => {
  const runner = registry.roundRobin('runner');
  const res = await fetch(`http://localhost:${runner.port}/run-patch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file: 'tasks/test.json' })
  });
  const data = await res.json();
  console.log('[RELAY]', data);
})(); 