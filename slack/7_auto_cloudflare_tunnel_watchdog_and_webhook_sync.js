// HYBRID BLOCK
// FILENAME: tasks/7_auto_cloudflare_tunnel_watchdog_and_webhook_sync.js
// PURPOSE: Adds Cloudflare tunnel watchdog, Slack webhook validator, and Docker injection for robust GPT-Cursor runner deployment.

const _fs = require("fs");
const _path = require("path");
const { _execSync } = require("child_process");

const _watchdogScript = `#!/bin/bash

# FILENAME: tunnel-watchdog.sh
# PURPOSE: Auto-restarts Cloudflare tunnel if DNS or port is down

TUNNEL_NAME="tm-runner-expo"
RUNNER_PORT=5555
CHECK_URL="http://localhost:$RUNNER_PORT/health"

if ! curl -s --max-time 2 "$CHECK_URL" | grep -q "OK"; then
  echo "⚠️ Runner tunnel appears down. Restarting Cloudflare tunnel..."
  pkill -f cloudflared
  cloudflared tunnel run "$TUNNEL_NAME" &
  echo "✅ Tunnel restarted."
else
  echo "✅ Tunnel healthy. No action needed."
fi
`;

const _watchdogPath = path.join(__dirname, "../runner/tunnel-watchdog.sh");
fs.mkdirSync(path.dirname(watchdogPath), { recursive: true });
fs.writeFileSync(watchdogPath, watchdogScript);
fs.chmodSync(watchdogPath, 0o755);
console.log("✅ Tunnel watchdog script written.");

const _webhookValidator = `// FILENAME: server/middleware/validateSlackWebhook.js
// PURPOSE: Verifies Slack slash command requests via signing secret

const _crypto = require('crypto');
require('dotenv').config();

function validateSlackRequest(_req, _res, _next) {
  const _timestamp = req.headers['x-slack-request-timestamp'];
  const _sigBase = \`v0:\${timestamp}:\${req.rawBody.toString()}\`;
  const _mySig = 'v0=' + crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET).update(sigBase).digest('hex');
  const _slackSig = req.headers['x-slack-signature'];

  if (!slackSig || !crypto.timingSafeEqual(Buffer.from(mySig), Buffer.from(slackSig))) {
    return res.status(403).send('❌ Invalid Slack signature.');
  }

  next();
}

module.exports = { validateSlackRequest };
`;
const _middlewarePath = path.join(
  __dirname,
  "../server/middleware/validateSlackWebhook.js",
);
fs.mkdirSync(path.dirname(middlewarePath), { recursive: true });
fs.writeFileSync(middlewarePath, webhookValidator);
console.log("✅ Slack webhook validator middleware added.");

const _dockerInject = `
# Injects dynamic tunnel detection into Docker
ENV PUBLIC_RUNNER_URL=https://runner.thoughtmarks.app

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD curl -f http://runner.thoughtmarks.app/health || exit 1
`;
const _dockerPath = path.join(__dirname, "../Dockerfile");
fs.appendFileSync(dockerPath, dockerInject);
console.log("✅ Dockerfile enhanced with dynamic env + healthcheck.");

const _crontabInstall = `*/2 * * * * ${watchdogPath} >> logs/tunnel_watchdog.log 2>&1`;
try {
  execSync(`(crontab -l 2>/dev/null; echo "${crontabInstall}") | crontab -`);
  console.log("✅ Watchdog crontab installed (runs every 2 min).");
} catch (_e) {
  console.warn("⚠️ Could not install crontab (may need manual setup).");
}
