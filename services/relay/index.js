const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const registry = require('../../utils/registry');

(async () => {
  try {
    const runner = registry.roundRobin('runner');
    const res = await fetch(`http://localhost:${runner.port}/run-patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: 'tasks/test.json' })
    });
    const data = await res.json();
    console.log('[RELAY]', data);
  } catch (error) {
    console.error('[RELAY ERROR]', error.message);
  }
})(); 