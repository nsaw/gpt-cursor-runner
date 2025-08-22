module.exports = {
  apps: [
    // Core Services (Keep)
    {
      name: "dashboard",
      script: "./dashboard/app.py",
      interpreter: "python3",
      watch: false,
      env: {
        PYTHONUNBUFFERED: "1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/dashboard-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/dashboard-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/dashboard-combined.log",
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
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-python-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-python-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/ghost-python-combined.log",
      time: true,
    },

    // G2o Services
    {
      name: "g2o-executor",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/patch-executor-loop.js",
      watch: false,
      env: {
        NODE_ENV: "production",
        EXECUTOR_DRY_RUN: "0",
        EXECUTOR_REQUIRE_SUMMARY: "1",
        EXECUTOR_FAIL_IF_NO_SUMMARY: "1",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "100M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-executor-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-executor-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-executor-combined.log",
      time: true,
    },

    {
      name: "g2o-queue-counters",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/monitor/queue_counters.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "50M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-queue-counters-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-queue-counters-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-queue-counters-combined.log",
      time: true,
    },

    {
      name: "g2o-summary-gate",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ops/summary_auditor.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "50M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-summary-gate-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-summary-gate-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-summary-gate-combined.log",
      time: true,
    },

    {
      name: "g2o-dashboard-probe",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/monitor/dashboard_probe.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "50M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-dashboard-probe-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-dashboard-probe-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-dashboard-probe-combined.log",
      time: true,
    },

    {
      name: "g2o-handoff-watcher",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/monitor/handoff_close_the_loop.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "50M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-handoff-watcher-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-handoff-watcher-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-handoff-watcher-combined.log",
      time: true,
    },

    {
      name: "g2o-completed-validate",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ops/completed_validator.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "50M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-completed-validate-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-completed-validate-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/g2o-completed-validate-combined.log",
      time: true,
    },

    // Queue Assessment Service
    {
      name: "p0-queue-shape-assessor",
      script: "/Users/sawyer/gitSync/gpt-cursor-runner/scripts/queue/queue-shape-assessor.js",
      watch: false,
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "50M",
      exec_mode: "fork",
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 100,
      merge_logs: true,
      error_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/p0-queue-shape-assessor-error.log",
      out_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/p0-queue-shape-assessor-out.log",
      log_file:
        "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/p0-queue-shape-assessor-combined.log",
      time: true,
    },
  ],
};
