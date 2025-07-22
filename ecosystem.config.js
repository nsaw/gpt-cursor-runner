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
      name: 'ghost-relay',
      script: 'scripts/ghost/ghost-relay.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        GHOST_RELAY_PORT: 3001
      }
    },
    {
      name: 'ghost-unified-daemon',
      script: 'scripts/ghost/ghost-unified-daemon.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        GHOST_RELAY_URL: 'http://localhost:3001',
        GHOST_VIEWER_URL: 'http://localhost:7474'
      }
    }
  ]
}; 