// HYBRID BLOCK
// FILENAME: tasks/6_cloudflare_runner_routing_autoconfig.js
// PURPOSE: Configures GPT Cursor Runner to use Cloudflare tunnel hostname based on dev/prod environment. Adds fallback page, port detection, and logs.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEV_TUNNEL = 'https://runner-dev.thoughtmarks.app';
const PROD_TUNNEL = 'https://runner.thoughtmarks.app';
const fallbackRunnerURL = 'https://mobile.thoughtmarks.app';

const ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';
const resolvedURL = ENV === 'production' ? PROD_TUNNEL : DEV_TUNNEL;

const statePath = path.join(__dirname, '../runner.state.json');
const runnerEnvPath = path.join(__dirname, '../.env');

// 1. Add public runner URL to runner.state.json
let state = {};
if (fs.existsSync(statePath)) {
  state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
}

state.public_url = resolvedURL;
fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
console.log(`✅ runner.state.json updated with ${resolvedURL}`);

// 2. Modify .env with updated base URL (optional)
if (fs.existsSync(runnerEnvPath)) {
  let env = fs.readFileSync(runnerEnvPath, 'utf8');
  const regex = /^PUBLIC_RUNNER_URL=.*$/m;
  const replacement = `PUBLIC_RUNNER_URL=${resolvedURL}`;
  if (regex.test(env)) {
    env = env.replace(regex, replacement);
  } else {
    env += `\n${replacement}\n`;
  }
  fs.writeFileSync(runnerEnvPath, env);
  console.log('✅ .env updated with PUBLIC_RUNNER_URL');
}

// 3. Create fallback.html for web browser pings to runner base
const fallbackHtml = `
<!DOCTYPE html>
<html>
  <head><meta http-equiv="refresh" content="0; url=${fallbackRunnerURL}" /></head>
  <body>If you're not redirected, <a href="${fallbackRunnerURL}">click here</a>.</body>
</html>
`;

const fallbackPath = path.join(__dirname, '../public/runner_fallback.html');
fs.writeFileSync(fallbackPath, fallbackHtml);
console.log('✅ runner_fallback.html written');

// 4. Check if runner ports (5555 or 5051) are active
try {
  execSync('lsof -i :5555 || lsof -i :5051', { stdio: 'pipe' });
  console.log('✅ One of the runner ports is active.');
} catch (e) {
  console.warn('⚠️ Neither port 5555 nor 5051 is active. Runner tunnel may not be working.');
}

// 5. Log for confirmation
console.log(`🌐 GPT Runner now expects traffic via: ${resolvedURL}`); 