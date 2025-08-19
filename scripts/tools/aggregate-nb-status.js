#!/usr/bin/env node
// Aggregate NB validations and write a CYOPS summary; exit non-zero on any failure.
const fs = require('fs');
const path = require('path');
const ROOT = process.cwd();
const logs = path.join(ROOT, 'validations', 'logs');
const cyops = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';
const out = path.join(cyops, 'nb-policy-run.md');

fs.mkdirSync(cyops, { recursive: true });

function read(f) {
  try {
    return fs.readFileSync(f, 'utf8');
  } catch {
    return '';
  }
}

function exists(f) {
  try {
    fs.accessSync(f);
    return true;
  } catch {
    return false;
  }
}

const failures = [];
const notes = [];

// Node gate
const nodeLog = read(path.join(logs, 'check-node-version.log'));
if (/NODE_VERSION_TOO_OLD/i.test(nodeLog)) {
  failures.push('Node < 20.17.0 (see check-node-version.log)');
} else if (!/NODE_VERSION_OK/i.test(nodeLog)) {
  notes.push('Node gate inconclusive: check-node-version.log');
}

// Zsh guard
const zlog = read(path.join(logs, 'check-zsh-guard.log'));
if (/ZSH_GUARD_MISSING|enforce/i.test(zlog)) {
  failures.push('Zsh guard missing (enforce)');
}

// Legacy scanners
if (exists(path.join(ROOT, 'validations', 'nb-violations.list'))) {
  failures.push('Legacy pattern in code (nb-violations.list)');
}
if (exists(path.join(ROOT, 'validations', 'nb-docs-violations.list'))) {
  failures.push('Legacy pattern in docs (nb-docs-violations.list)');
}

// Pre-commit
const pclog = read(path.join(logs, 'pre-commit.log')) || read(path.join(logs, 'pre-commit.nohup.log'));
if (/fail|failed|hook failed/i.test(pclog)) {
  failures.push('pre-commit reported failures');
}

// Write CYOPS summary
let md = `# NB Policy Run

- When: ${new Date().toISOString()}
- CYOPS Path: ${cyops}

## Results`;

if (failures.length) {
  md += `**FAIL**

- ${failures.join('\n- ')}`;
} else {
  md += '**PASS**\n';
}

if (notes.length) {
  md += `

## Notes
- ${notes.join('\n- ')}`;
}

md += `

## Detach Policy (enforced)
- $! stays inside helper script with \`set +H\` (no history expansion)
- No inline \`(...) &\` groups in patch commands
- No \`disown\`: detach via \`nohup\` + backgrounding
- Health via NB-runner TTL: 18s (non-blocking even if Expo is slow/fails)
`;

fs.writeFileSync(out, md);

if (failures.length) {
  process.exit(2);
} else {
  process.exit(0);
}