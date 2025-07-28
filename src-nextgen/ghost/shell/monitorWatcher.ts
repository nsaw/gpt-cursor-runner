// Monitor Recovery Watcher
import http from 'http';

function checkMonitorHealth() {
  return new Promise(resolve => {
    http.get('http://localhost:8787/monitor', res => {
      resolve(res.statusCode === 200);
    }).on('error', () => {
      resolve(false);
    });
  });
}

export function startMonitorRecovery() {
  console.log('[MonitorWatcher] Starting monitor health recovery...');
  setInterval(async () => {
    const isHealthy = await checkMonitorHealth();
    if (!isHealthy) {
      console.warn('[MonitorWatcher] Monitor unhealthy, attempting recovery...');
      // Recovery logic will be implemented here
    }
  }, 30000); // Check every 30 seconds
} 