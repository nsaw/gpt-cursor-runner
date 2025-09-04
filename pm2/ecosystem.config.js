module.exports = {
  apps: [
    {
      name: "webhook-server",
      script: "scripts/webhook-server.js",
      env: { PORT: 5051 },
    },
    {
      name: "bridge-orchestrator",
      script: "scripts/bridge-orchestrator.js",
      env: { PORT: 5053 },
    },
    {
      name: "monitor-core",
      script: "scripts/monitor-core.js",
      env: { NODE_ENV: "production" },
    },
  ],
};
