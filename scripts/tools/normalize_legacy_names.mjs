import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const META = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/meta";
const SUMS = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";

const RX_CANON =
  /^patch-v(\d+)\.(\d+)\.(\d+)\(P(\d+)\.(\d+)\.(\d+)\)_([a-z0-9]+(?:-[a-z0-9]+)*)(?:-((?:hotpatch|handoff))-(\d{1,3}))?\.json(?:\.(hold))?$/;

const now = () => new Date().toISOString();
const write = (p, s) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
};

function kebabize(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function propose(dir, file) {
  // try to extract components even if drifted
  const base = file.replace(/\s+/g, "-").replace(/_/g, "-");
  // Quick heuristic fixes: ensure 'patch-v' prefix casing, ensure '.json' position
  let name = base;
  // already canonical?
  if (RX_CANON.test(name)) return null;
  // If it ends with '.hold.json', swap
  name = name.replace(/\.hold\.json$/i, ".json.hold");
  // enforce kebab slug after ')_'
  name = name.replace(
    /\)_([^.]*?)\.json(\.hold)?$/i,
    (m, slug, hold) => `)_${kebabize(slug)}.json${hold || ""}`,
  );
  // enforce 'patch-v' prefix lower-case
  name = name.replace(/^Patch-v/i, "patch-v");
  // return proposal if canonical now
  if (RX_CANON.test(name)) return name;
  return null;
}

function run(apply = false) {
  const dirs = [
    ROOT,
    path.join(ROOT, "G2o"),
    path.join(ROOT, "G2o", "P1"),
    path.join(ROOT, "G2o", "P0"),
  ];
  const changes = [];
  for (const d of dirs) {
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d)) {
      if (!/\.json(\.hold)?$/.test(f)) continue;
      const to = propose(d, f);
      if (to && to !== f) {
        const fromP = path.join(d, f),
          toP = path.join(d, to);
        changes.push({ dir: d, from: f, to });
        if (apply) {
          try {
            fs.renameSync(fromP, toP);
          } catch (e) {
            changes[changes.length - 1].error = e.message;
          }
        }
      }
    }
  }
  write(
    path.join(META, "versioning_normalize.json"),
    JSON.stringify({ ts: now(), applied: apply, changes }, null, 2),
  );
  write(
    path.join(SUMS, `summary-versioning-normalize-${Date.now()}.md`),
    `# Versioning Normalize\napply: ${apply}\nchanges: ${changes.length}\n`,
  );
  if (!apply && changes.length) {
    process.exit(3);
  }
}

const apply = process.argv.includes("--apply");
run(apply);
