import { promises as fsp } from "fs";
import fs from "fs";
import path from "path";

const P1 =
  process.env.PATCHES_P1 ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1";
const META =
  process.env.META || "/Users/sawyer/gitSync/.cursor-cache/CYOPS/meta";
const PATCHES_ROOT =
  process.env.PATCHES_ROOT ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const BLOCKED = `${P1}.blocked`;
const REPORT = path.join(META, "P1.depcheck.json");

const wantQuarantine = process.argv.includes("--quarantine");
const now = () => new Date().toISOString();

const PATCH_NAME_RE =
  /patch-v\d+\.\d+\.\d+\(P1\.\d+\.\d+\)_[A-Za-z0-9.-]+\.json/g;

async function listP1() {
  const items = await fsp.readdir(P1).catch(() => []);
  return items
    .filter((n) => n.startsWith("patch-") && n.endsWith(".json"))
    .map((n) => path.join(P1, n))
    .filter((p) => fs.statSync(p).isFile());
}

async function readJSON(fp) {
  try {
    return JSON.parse(await fsp.readFile(fp, "utf8"));
  } catch {
    return null;
  }
}

function extractRefs(obj) {
  const acc = new Set();
  const walk = (v) => {
    if (typeof v === "string") {
      for (const m of v.matchAll(PATCH_NAME_RE)) acc.add(m[0]);
    } else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(obj);
  return [...acc];
}

async function main() {
  await fsp.mkdir(path.dirname(REPORT), { recursive: true });
  const files = await listP1();
  const missingByPatch = {};
  for (const fp of files) {
    const data = await readJSON(fp);
    if (!data) continue;
    const refs = extractRefs(data);
    const missing = refs.filter((r) => !fs.existsSync(path.join(P1, r)));
    if (missing.length) {
      missingByPatch[path.basename(fp)] = missing;
      if (wantQuarantine) {
        await fsp.mkdir(BLOCKED, { recursive: true });
        const dst = path.join(BLOCKED, path.basename(fp));
        await fsp.rename(fp, dst).catch(async (e) => {
          // if already moved or clash, append .blocked suffix
          const alt = `${dst}.blocked`;
          await fsp.rename(fp, alt).catch(() => {});
        });
        const note = {
          ts: now(),
          reason: "missing_dependencies",
          missing,
        };
        await fsp
          .writeFile(`${dst}.blocked.json`, JSON.stringify(note, null, 2))
          .catch(() => {});
      }
    }
  }
  const report = {
    ts: now(),
    p1_dir: P1,
    quarantined: wantQuarantine,
    missingByPatch,
  };
  await fsp.writeFile(REPORT, JSON.stringify(report, null, 2));
  if (Object.keys(missingByPatch).length) process.exit(wantQuarantine ? 0 : 3);
}

main().catch(async (e) => {
  const err = { ts: now(), error: String((e && e.stack) || e) };
  await fsp.writeFile(REPORT, JSON.stringify(err, null, 2)).catch(() => {});
  process.exit(2);
});
