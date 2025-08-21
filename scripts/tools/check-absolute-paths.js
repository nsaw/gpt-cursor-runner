#!/usr/bin/env node
// check-absolute-paths: advisory (set ABS_ENFORCE=1 to fail). Ensures critical fields are absolute.
const fs = require('fs');
const path = require('path');

const roots = [
  '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
  '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
  path.join(process.cwd(), 'tasks', 'patches'),
];

const outList = path.join(
  process.cwd(),
  'validations',
  'abs-paths-violations.list',
);

fs.mkdirSync(path.dirname(outList), { recursive: true });

const problems = [];

const glob = (dir) => {
  try {
    return fs.readdirSync(dir).flatMap((f) => {
      const fp = path.join(dir, f);
      const s = fs.statSync(fp);
      if (s.isDirectory()) return glob(fp);
      if (fp.endsWith('.json')) return [fp];
      return [];
    });
  } catch {
    return [];
  }
};

const files = roots.flatMap(glob);

for (const file of files) {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const bad = [];
    const abs = (v) => typeof v === 'string' && v.startsWith('/');

    if (j.summaryFile && !abs(j.summaryFile)) bad.push('summaryFile');

    if (Array.isArray(j.targets)) {
      j.targets.forEach((t, i) => {
        if (t.repoRoot && !abs(t.repoRoot)) bad.push(`targets[${i}].repoRoot`);
        (t.postMutationBuild?.nb || []).forEach((nb, k) => {
          if (nb.log && !abs(nb.log)) {
            bad.push(`targets[${i}].postMutationBuild.nb[${k}].log`);
          }
        });
        (t.validate?.nb || []).forEach((nb, k) => {
          if (nb.log && !abs(nb.log)) {
            bad.push(`targets[${i}].validate.nb[${k}].log`);
          }
        });
      });
    }

    if (bad.length) {
      problems.push(`${file}: ${bad.join(', ')}`);
    }
  } catch {
    /* ignore non-patch json */
  }
}

fs.writeFileSync(outList, problems.join('\n'));

const enforce = process.env.ABS_ENFORCE === '1';
if (enforce && problems.length) {
  console.error('ABS_PATHS_VIOLATIONS');
  process.exit(5);
} else {
  process.exit(0);
}
