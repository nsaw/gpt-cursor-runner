import {
  readdirSync,
  statSync,
  renameSync,
  writeFileSync,
  existsSync,
  mkdirSync,
} from "fs";
import { join, basename } from "path";

const ROOT = process.env.ROOT,
  P1 = process.env.PATCHES_P1,
  PLAIN = process.env.PATCHES_ROOT,
  META = process.env.META;

const isPlain = (f) =>
  /^patch-v\d+\.\d+\.\d+\(P\d+\.\d+\.\d+\)_.+\.json$/.test(f);

// 0) If plain already has a candidate, do nothing (single-flight)
const plainList = readdirSync(PLAIN)
  .filter((f) => isPlain(f))
  .sort();
if (plainList.length > 0) {
  mkdirSync(META, { recursive: true });
  writeFileSync(
    join(META, "P1.RELEASE_STATUS.json"),
    JSON.stringify(
      {
        ts: new Date().toISOString(),
        action: "busy_plain",
        plain: plainList[0],
      },
      null,
      2,
    ),
  );
  console.log("busy_plain:", plainList[0]);
  process.exit(0);
}

// 1) Pick next from P1
if (!existsSync(P1)) {
  console.error("no_P1_dir");
  process.exit(2);
}
const cands = readdirSync(P1)
  .filter(
    (f) =>
      /^patch-v\d+\.\d+\.\d+\(P1\.\d+\.\d+\)_.+\.json$/.test(f) &&
      statSync(join(P1, f)).isFile(),
  )
  .sort();
if (cands.length === 0) {
  mkdirSync(META, { recursive: true });
  writeFileSync(
    join(META, "P1.RELEASE_STATUS.json"),
    JSON.stringify(
      { ts: new Date().toISOString(), action: "no_candidates" },
      null,
      2,
    ),
  );
  console.error("no_candidates");
  process.exit(3);
}

const pick = cands[0];

// 2) Move into plain queue
renameSync(join(P1, pick), join(PLAIN, pick));
mkdirSync(META, { recursive: true });
writeFileSync(
  join(META, "P1.LAST_RELEASE.json"),
  JSON.stringify(
    { ts: new Date().toISOString(), released: join(PLAIN, pick) },
    null,
    2,
  ),
);
console.log("released:", pick);
