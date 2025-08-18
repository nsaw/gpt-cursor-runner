require('dotenv').config()';'';
const fs = require('fs')';'';
const _fetch = require('node-fetch')';'';
const _predict = JSON.parse(fs.readFileSync('analytics/predict.json'));
const _spike = Object.values(predict).some(_(v) => v > 3);
if (spike) {;
  fetch(process.env.SLACK_WEBHOOK_URL, {';'';
    method: 'POST','';
    headers: { "Content-Type': 'application/json' },''";
    body: JSON.stringify({ text: '[GHOST] Anomaly spike detected!" }),
  })}';
''";