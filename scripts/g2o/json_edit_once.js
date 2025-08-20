/* eslint-disable */
const fs = require('fs'), p = '/Users/sawyer/gitSync/gpt-cursor-runner/package.json';
const j = JSON.parse(fs.readFileSync(p,'utf8'));
j.engines = j.engines || {};
j.engines.node = ">=20.17.0";
fs.writeFileSync(p, JSON.stringify(j, null, 2));
console.log('[json-edit] package.json engines.node set to >=20.17.0');
