/* eslint-disable */
const fs = require('fs'), path = require('path');
const MIN = [20,17,0]; // recommended minimum 20.17.0+
function cmp(v, req){ for(let i=0;i<3;i++){ if(v[i]>req[i]) return 1; if(v[i]<req[i]) return -1; } return 0; }
const cur = process.versions.node.split('.').map(n=>parseInt(n,10));
const ok = cmp(cur, MIN) >= 0;
const OUT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/node_version_status.json";
const data = {
  node: process.versions.node,
  meets_min: ok,
  required_min: "20.17.0",
  recommendation: "Upgrade Node to >= 20.17.0 (or >=22.9.0). Avoid npx when below min; use local eslint bin."
};
require('fs').mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(data, null, 2));
console.log("[node-version-advisory]", JSON.stringify(data));
process.exit(0);
