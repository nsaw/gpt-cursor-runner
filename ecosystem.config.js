module.exports = {
  apps: [
    {
      name: 'ghost-bridge',
      script: 'scripts/hooks/ghost-bridge.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        SLACK_PORT: 3000
      }
    },
    {
      name: 'ghost-bridge-viewer',
      script: 'scripts/web/live-status-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 7474
      }
    }
  ]
}; 