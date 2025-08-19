import fs from "fs";
import path from "path";

const ROOT =
  process.env.PATCHES_ROOT ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const P1 =
  process.env.PATCHES_P1 ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1";
const BLOCKED =
  process.env.PATCHES_P1_BLOCKED ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1.blocked";
const META =
  process.env.META || "/Users/sawyer/gitSync/.cursor-cache/CYOPS/meta";
const SUMS =
  process.env.SUMS || "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries";

const rxP1Hold = /^patch-v\d+\.\d+\.\d+\(P1\.[^)]+\)*.+\.json\.hold$/;
const now = () => new Date().toISOString();

fs.mkdirSync(SUMS, { recursive: true });

const depIdxPath = path.join(META, "P1.depcheck.json");
const depIdx = fs.existsSync(depIdxPath)
  ? JSON.parse(fs.readFileSync(depIdxPath, "utf8"))
  : { missingByPatch: {} };

const held = (fs.existsSync(P1) ? fs.readdirSync(P1) : [])
  .filter((f) => rxP1Hold.test(f))
  .sort();

if (!held.length) {
  fs.writeFileSync(
    path.join(SUMS, `summary-unhold-${Date.now()}.md`),
    "No P1 .hold candidates found.\n",
  );
  process.exit(0);
}

let picked = null;
let reason = "";

for (const f of held) {
  const base = f.replace(/\.hold$/, "");
  const depRec =
    depIdx.missingByPatch[base] || depIdx.missingByPatch[f] || null;
  const blocked =
    fs.existsSync(path.join(BLOCKED, base)) ||
    fs.existsSync(path.join(BLOCKED, f));

  if (depRec && depRec.missing && depRec.missing.length) {
    reason = `missing_deps:${depRec.missing.join(",")}`;
    continue;
  }
  if (blocked) {
    reason = "blocked_dir";
    continue;
  }
  picked = f;
  break;
}

if (!picked) {
  fs.writeFileSync(
    path.join(SUMS, `summary-unhold-${Date.now()}.md`),
    "All P1 .hold candidates blocked or missing deps.\n",
  );
  process.exit(0);
}

const from = path.join(P1, picked);
const plainName = picked.replace(/\.hold$/, "");
const to = path.join(ROOT, plainName);

try {
  fs.renameSync(from, to);
  fs.writeFileSync(
    path.join(SUMS, `summary-unhold-${Date.now()}.md`),
    `Released: ${plainName}\n`,
  );
} catch (e) {
  fs.writeFileSync(
    path.join(SUMS, `summary-unhold-${Date.now()}.md`),
    `Release failed for ${picked}: ${e.message}\n`,
  );
  process.exit(2);
}
