const fs = require('fs/promises');

(async () => {
  try {
    // Ensure heartbeat directory exists
    try {
      await fs.access('.cursor-cache/CYOPS/.heartbeat');
    } catch {
      await fs.mkdir('.cursor-cache/CYOPS/.heartbeat', { recursive: true });
    }

    const paths = [
      '.cursor-cache/CYOPS/.heartbeat/.runner-health.json',
      '.cursor-cache/CYOPS/.heartbeat/.tunnel-health.json',
      '.cursor-cache/CYOPS/.heartbeat/.daemon-health.json'
    ];

    const health = {
      timestamp: new Date().toISOString(),
      source: 'ghost2-async-health-aggregator',
      status: 'aggregating'
    };

    // Perform parallel async probes
    await Promise.all(paths.map(async p => {
      try {
        const data = JSON.parse(await fs.readFile(p, 'utf-8'));
        Object.assign(health, data);
      } catch (e) {
        console.log(`[WARNING] Could not read ${p}: ${e.message}`);
      }
    }));

    await fs.writeFile('.cursor-cache/CYOPS/.heartbeat/.async-health.json', JSON.stringify(health, null, 2));
    console.log('[GHOST2] Async aggregated health written.');
  } catch (error) {
    console.error('[GHOST2] Error in async health aggregation:', error.message);
  }
})(); 