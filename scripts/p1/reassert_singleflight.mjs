import fs from "fs";
import path from "path";

const ROOT =
  process.env.PATCHES_ROOT ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const P1 =
  process.env.PATCHES_P1 ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1";

const list = () =>
  (fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : [])
    .filter((f) => /^patch-.*\.json$/.test(f))
    .sort();
const extra = list().slice(1);

for (const f of extra) {
  const from = path.join(ROOT, f);
  const back = path.join(P1, `${f}.hold`);
  try {
    fs.renameSync(from, back);
  } catch {}
}
