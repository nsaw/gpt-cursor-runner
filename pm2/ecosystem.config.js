module.exports = {
  apps: [
    {
      name: "webhook-server",
      script: "scripts/webhook-server.js",
      env: { PORT: 5051 },
    },
    {
      name: "ghost-runner",
      script: "scripts/ghost-runner.js",
      env: { PORT: 5053 },
    },
    {
      name: "dashboard",
      script: "dashboard/app.py",
      interpreter: "python3",
      env: { PORT: 8787 },
    },
    {
      name: "telemetry-a",
      script: "scripts/telemetry-a.js",
      env: { PORT: 8788 },
    },
    {
      name: "telemetry-b",
      script: "scripts/telemetry-b.js",
      env: { PORT: 8789 },
    },
  ],
};
