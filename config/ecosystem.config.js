module.exports = {
  apps: [
    // Core Daemons
    {
      name: "ghost-bridge",
      script: "./scripts/ghost-bridge.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        // ***REMOVED***_BRIDGE_PORT: 5052, // Removed - not in port truth, service not running
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-bridge-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-bridge-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-bridge-combined.log",
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
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-relay-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-relay-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-relay-combined.log",
      time: true,
    },
    {
      name: "ghost-viewer",
      script: "./scripts/ghost/ghost-viewer.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-viewer-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-viewer-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-viewer-combined.log",
      time: true,
    },
    {
      name: "ghost-runner",
      script: "./scripts/core/ghost-runner.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-runner-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-runner-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-runner-combined.log",
      time: true,
    },

    // Python Ghost Runner on 5051 (Flask API and Slack webhooks)
    {
      name: "ghost-python",
      cwd: "/Users/sawyer/gitSync/gpt-cursor-runner",
      script: "gpt_cursor_runner/main.py",
      interpreter: "python3",
      watch: false,
      env: {
        PORT: 5051,
        PYTHONUNBUFFERED: "1",
        PYTHONPATH: "/Users/sawyer/gitSync/gpt-cursor-runner",
        SLACK_SIGNING_SECRET: "aaaed6a9db711589c3d2c17a3495b0f3",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-python-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-python-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/ghost-python-combined.log",
      time: true,
    },

    // Documentation & Monitoring
    {
      name: "enhanced-doc-daemon",
      script: "./scripts/daemons/enhanced-doc-daemon.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "150M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/enhanced-doc-daemon-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/enhanced-doc-daemon-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/enhanced-doc-daemon-combined.log",
      time: true,
    },
    {
      name: "summary-monitor",
      script: "./scripts/watchdogs/summary-watcher.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "150M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/summary-monitor-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/summary-monitor-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/summary-monitor-combined.log",
      time: true,
    },
    {
      name: "dual-monitor",
      script: "./scripts/monitor/dual-monitor-server.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        MONITOR_PORT: 3002,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "150M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/dual-monitor-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/dual-monitor-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/dual-monitor-combined.log",
      time: true,
    },

    // Dashboard & UI
    {
      name: "flask-dashboard",
      script: "./dashboard/app.py",
      interpreter: "python3",
      watch: false,
      env: {
        PYTHONUNBUFFERED: "1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/flask-dashboard-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/flask-dashboard-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/flask-dashboard-combined.log",
      time: true,
    },
    {
      name: "dashboard-uplink",
      script: "./scripts/watchdogs/dashboard-uplink.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/dashboard-uplink-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/dashboard-uplink-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/dashboard-uplink-combined.log",
      time: true,
    },

    // Telemetry & Metrics
    {
      name: "telemetry-api",
      script: "./scripts/daemons/telemetry-api.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 8788,
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/telemetry-api-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/telemetry-api-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/telemetry-api-combined.log",
      time: true,
    },

    {
      name: "telemetry-orchestrator",
      script: "./scripts/daemons/telemetry-orchestrator-daemon.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/telemetry-orchestrator-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/telemetry-orchestrator-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/telemetry-orchestrator-combined.log",
      time: true,
    },
    {
      name: "metrics-aggregator-daemon",
      script: "./scripts/daemons/metrics-aggregator-daemon.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/metrics-aggregator-daemon-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/metrics-aggregator-daemon-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/metrics-aggregator-daemon-combined.log",
      time: true,
    },

    // Archived: Cloudflared is managed via /Users/sawyer/.cloudflared; avoid PM2 duplication
    {
      name: "alert-engine-daemon",
      script: "./scripts/daemons/alert-engine-daemon.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/alert-engine-daemon-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/alert-engine-daemon-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/alert-engine-daemon-combined.log",
      time: true,
    },

    // Patch Management
    {
      name: "patch-executor",
      script: "./scripts/core/patch-executor-loop.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/patch-executor-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/patch-executor-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/patch-executor-combined.log",
      time: true,
    },

    // AI & Decision Making
    {
      name: "autonomous-decision-daemon",
      script: "./scripts/daemons/autonomous-decision-daemon.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/autonomous-decision-daemon-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/autonomous-decision-daemon-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/CYOPS/.logs/autonomous-decision-daemon-combined.log",
      time: true,
    },
  ],
};
