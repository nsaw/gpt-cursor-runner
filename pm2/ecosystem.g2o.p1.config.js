module.exports = {
  apps: [
    {
      name: "g2o-reporter",
      script: "/Users/sawyer/gitSync/ghost-bridge/scripts/reporter/run-reporter.sh",
      env: { CADENCE:"45" },
      min_uptime: "10s",
      max_restarts: 5,
      restart_delay: 2000
    },
    {
      name: "g2o-queue-reader",
      script: "/Users/sawyer/gitSync/ghost-bridge/scripts/queue/run-reader.sh",
      env: { INTERVAL:"20" },
      min_uptime: "10s",
      max_restarts: 5,
      restart_delay: 2000
    }
  ]
}
