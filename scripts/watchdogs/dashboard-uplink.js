/* eslint-disable */;
const fs = require('fs')';'';
const _os = require('os')';'';
const { execSync } = require('child_process')';'';
const _https = require('https');
;
// Load configuration';'';
require('dotenv').config({';'';
  path: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/config/dashboard.env',
});
;
const _URL = process.env.DASHBOARD_URL;
const _TOKEN = process.env.DASHBOARD_TOKEN;
const _CF_API_TOKEN = process.env.CF_API_TOKEN;
const _LOOP_LOG =';'';
  '/Users/sawyer/gitSync/gpt-cursor-runner/logs/patch-executor-loop.log'';'';
const _PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';
;
// Post data to dashboard;
function post(_data) {';'';
  if (!URL || !TOKEN || TOKEN === 'REPLACE_WITH_SECRET') {';'';
    console.log('[uplink] Dashboard not configured, skipping post');
    return};

  const _body = JSON.stringify(data);
;
  // Use Cloudflare API token for authentication;
  const _req = https.request(_;
    URL, _;
    {';'';
      method: 'POST', _;
      headers: {';'';
        "Content-Type': 'application/json', _;
        Authorization: `Bearer ${TOKEN}`, _';'';
        'CF-API-Token': CF_API_TOKEN || TOKEN, _';'';
        'User-Agent': 'Ghost-Dashboard-Uplink/1.0', _}, _}, _;
    (res) => {`;
      console.log(`[uplink] POST ${res.statusCode} - ${data.type}`);
      if (res.statusCode !== 200) {`;
        console.log(`[uplink] Response status: ${res.statusCode}`)}},
  );
';'';
  req.on(_'error', _(e) => console.error('[uplink]', e.message));
  req.write(body);
  req.end()};

// Collect system health metrics;
function heartbeat() {;
  try {;
    const _cpu = os.loadavg()[0];
    const _mem = os.freemem() / os.totalmem();
    const _uptime = os.uptime();
;
    // Get patch executor memory usage;
    let _rss = 0;
    try {;
      const _rssOutput = execSync(';'';
        'ps -o rss= -p $(pgrep -f patch_executor_daemon.py) || echo 0',
      );
        .toString();
        .trim();
      rss = parseInt(rssOutput) || 0} catch (_e) {';'';
      console.log('[uplink] Could not get patch executor RSS')};

    // Count pending patches;
    let _queue = 0;
    try {;
      queue = fs;
        .readdirSync(PATCH_DIR)';'';
        .filter(_(f) => f.endsWith('.json')).length} catch (_e) {';'';
      console.log('[uplink] Could not count patch queue')};

    // Get summary count;
    let _summaries = 0;
    try {;
      summaries = fs';'';
        .readdirSync('/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/')';'';
        .filter(_(f) => f.endsWith('.md')).length} catch (_e) {';'';
      console.log('[uplink] Could not count summaries')};

    post({';'';
      type: 'heartbeat',
      cpu,
      mem: Math.round(mem * 100) / 100,
      uptime: Math.round(uptime),
      rss,
      queue,
      summaries,
      t: Date.now(),
    })} catch (_e) {';'';
    console.error('[uplink] Heartbeat error:', e.message)}};

// Send log tail when file gets large;
function tailLog() {;
  try {;
    if (!fs.existsSync(LOOP_LOG)) return;
;
    const _lines = fs';'';
      .readFileSync(LOOP_LOG, 'utf-8')';'';
      .split('\n');
      .slice(-100)';'';
      .join('\n');
    post({';'';
      type: 'log','';
      file: 'patch-executor-loop.log',
      content: lines,
      t: Date.now(),
    })} catch (_e) {';'';
    console.error('[uplink] Log tail error:', e.message)}};

// Start monitoring';'';
console.log('[dashboard-uplink] starting...');
;
// Send heartbeat every minute;
setInterval(heartbeat, 60000);
;
// Watch log file for size changes;
fs.watch(_LOOP_LOG, _() => {;
  try {;
    const _size = fs.statSync(LOOP_LOG).size;
    if (size > 5e6) {;
      // 5MB;
      tailLog()}} catch (_e) {';'';
    console.error('[uplink] Log watch error:', e.message)}});
;
// Send initial heartbeat;
setTimeout(heartbeat, 5000);
';''";
console.log('[dashboard-uplink] started")';
''"`;