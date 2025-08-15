module.exports = {
  apps: [
    {
      name: "dual-monitor",
      script: "./scripts/monitor/dual-monitor-server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        MONITOR_PORT: 3002,
      },
    },
    {
      name: "ghost-bridge",
      script:
        "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/ghost-bridge.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        GHOST_BRIDGE_PORT: 5051,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-bridge-combined.log",
      time: true,
    },
    // Supervise the Python runner that exposes the 5051 HTTP health endpoint
    {
      name: "ghost-python",
      cwd: "/Users/sawyer/gitSync/gpt-cursor-runner",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/.venv/bin/python3",
      interpreter: "none",
      args: ["-m", "gpt_cursor_runner.main"],
      watch: false,
      env: {
        PORT: 5051,
        PYTHONUNBUFFERED: "1",
        NODE_ENV: "production",
        PYTHONPATH: "/Users/sawyer/gitSync/gpt-cursor-runner",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "150M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-python-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-python-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-python-combined.log",
      time: true,
    },
    {
      name: "ghost-relay",
      script: "./scripts/ghost/ghost-relay.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        GHOST_RELAY_PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-relay-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-relay-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-relay-combined.log",
      time: true,
    },
    {
      name: "ghost-viewer",
      script: "./scripts/web/live-status-server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        GHOST_VIEWER_PORT: 7474,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-viewer-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-viewer-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-viewer-combined.log",
      time: true,
    },
    // Keep the unified manager watchdog persistent under PM2
    {
      name: "unified-manager-watchdog",
      script:
        "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/watchdogs/unified-manager-watchdog.sh",
      interpreter: "bash",
      args: ["monitor"],
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "50M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/unified-manager-watchdog-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/unified-manager-watchdog-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/unified-manager-watchdog.log",
      time: true,
    },
  ],
};
