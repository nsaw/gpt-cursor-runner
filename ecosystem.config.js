module.exports = {
  apps: [
    {
      name: 'dual-monitor',
      script: './scripts/monitor/dual-monitor-server.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        MONITOR_PORT: 8787
      }
    }
  ]
}; 