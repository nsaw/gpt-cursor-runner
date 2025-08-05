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
      error_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-error.log',
      out_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-out.log',
      log_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-combined.log',
      time: true
    },
    {
      name: 'ghost-relay',
      script: './scripts/ghost/ghost-relay.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        GHOST_RELAY_PORT: 3001
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '100M',
      error_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-relay-error.log',
      out_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-relay-out.log',
      log_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-relay-combined.log',
      time: true
    },
    {
      name: 'ghost-viewer',
      script: './scripts/web/live-status-server.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        GHOST_VIEWER_PORT: 7474
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: '100M',
      error_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-viewer-error.log',
      out_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-viewer-out.log',
      log_file: '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-viewer-combined.log',
      time: true
    }
  ]
}; 