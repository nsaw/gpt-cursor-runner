import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const META = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/meta";
const SUMS = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";
const RX =
  /^patch-v(?<maj>\d+)\.(?<min>\d+)\.(?<pat>\d+)\(P(?<phase>\d+)\.(?<sect>\d+)\.(?<sub>\d+)\)_(?<slug>[a-z0-9]+(?:-[a-z0-9]+)*)(?:-(?<qp>(?:hotpatch|handoff))-(?<qpn>\d{1,3}))?\.json(?:\.(?<hold>hold))?$/;

const now = () => new Date().toISOString();
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};

function list(dir) {
  return fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".json") || f.endsWith(".json.hold"))
    : [];
}

function scanDirs() {
  const dirs = [
    ROOT,
    path.join(ROOT, "G2o"),
    path.join(ROOT, "G2o", "P1"),
    path.join(ROOT, "G2o", "P0"),
  ];
  const files = [];
  for (const d of dirs) {
    if (fs.existsSync(d)) {
      for (const f of list(d)) files.push({ dir: d, file: f });
    }
  }
  return files;
}

function groupKey(m) {
  return `${m.groups.maj}.${m.groups.min}::P${m.groups.phase}.${m.groups.sect}.${m.groups.sub}::${m.groups.slug}`;
}

function validate() {
  const files = scanDirs();
  const violations = [];
  const groups = new Map();
  for (const { dir, file } of files) {
    const m = RX.exec(file);
    if (!m) {
      violations.push({ type: "pattern", dir, file });
      continue;
    }
    // kebab-case slug already ensured by RX
    const key = groupKey(m);
    const pat = +m.groups.pat;
    const arr = groups.get(key) || [];
    arr.push({ dir, file, pat, qual: m.groups.qp, m: m.groups });
    groups.set(key, arr);
    // hold suffix must be exactly '.json.hold' if present — RX enforces ordering
  }
  // hotpatch/handoff rule: strictly increasing PATCH for same key when qualifier present
  for (const [key, arr] of groups) {
    const hp = arr
      .filter((x) => x.qual === "hotpatch" || x.qual === "handoff")
      .sort((a, b) => a.pat - b.pat);
    for (let i = 1; i < hp.length; i++) {
      if (!(hp[i].pat > hp[i - 1].pat))
        violations.push({
          type: "sequence",
          key,
          prev: hp[i - 1],
          curr: hp[i],
        });
    }
  }
  const out = { ts: now(), total: files.length, violations };
  write(path.join(META, "versioning_audit.json"), JSON.stringify(out, null, 2));
  write(
    path.join(SUMS, `summary-versioning-audit-${Date.now()}.md`),
    `# Versioning Audit\nfiles: ${files.length}\nviolations: ${violations.length}\n`,
  );
  if (violations.length) {
    for (const v of violations) {
      console.error("VIOLATION", v);
    }
    process.exit(2);
  }
}

validate();
