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
    },
    {
      name: 'ghost-bridge',
      script: './scripts/ghost-bridge-simple.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        GHOST_BRIDGE_PORT: 3000
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '100M',
      error_file: './logs/ghost-bridge-error.log',
      out_file: './logs/ghost-bridge-out.log',
      log_file: './logs/ghost-bridge-combined.log',
      time: true
    }
  ]
}; 