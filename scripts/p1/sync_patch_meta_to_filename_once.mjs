import fs from "fs";
import path from "path";

const P1 = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1",
  FAILED = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed";

const PAT = /^(patch-v\d+\.\d+\.\d+\(P1\.\d{2}\.\d{2}\)_.+)\.json(\.hold)?$/;
const list = (d) => {
  try {
    return fs.readdirSync(d);
  } catch {
    return [];
  }
};
const ensure = (d) => {
  try {
    fs.mkdirSync(d, { recursive: true });
  } catch {}
};

function deriveMeta(filename) {
  const m = filename.match(PAT);
  if (!m) return null;
  const base = m[1]; // e.g., patch-v2.0.142(P1.04.08)_monitor-static-flags-query
  const v = base.replace(/_.+$/, ""); // patch-v2.0.142(P1.04.08)
  return { blockId: base, version: v };
}

function writeSync(fp) {
  try {
    const name = path.basename(fp).replace(/\.hold$/, "");
    const meta = deriveMeta(name);
    if (!meta)
      return { ok: false, reason: "name_not_match_policy", file: name };
    const j = JSON.parse(fs.readFileSync(fp, "utf8"));
    j.blockId = meta.blockId;
    j.version = meta.version;
    fs.writeFileSync(fp, JSON.stringify(j, null, 2));
    return { ok: true, blockId: j.blockId, version: j.version };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function targetCurrent() {
  // choose earliest P1 candidate (plain or .hold), preferring ones seen in retry_state or present as files
  const files = list(P1).filter(
    (f) => f.endsWith(".json") || f.endsWith(".json.hold"),
  );
  if (!files.length) return null;
  // naive order: lexical by (P1.xx.yy) like existing tools
  function key(f) {
    const m = f.match(/\(P1\.(\d{2})\.(\d{2})\)/);
    return [m ? +m[1] : 99, m ? +m[2] : 99, f];
  }
  files.sort((a, b) => {
    const [a1, a2, a3] = key(a),
      [b1, b2, b3] = key(b);
    return a1 - b1 || a2 - b2 || (a3 < b3 ? -1 : 1);
  });
  return files[0];
}

function maybeRestoreFromFailed() {
  // if no P1 candidates, try to move a failed item back to P1 as .hold (strict order: 016, 017, 141, 142, 144 …)
  const preferred = [
    "patch-v2.0.016(P1.02.03)_pm2-nonblocking-wrappers-enforce.json",
    "patch-v2.0.017(P1.03.03)_heartbeat-rapid-rotation-alerts.json",
  ];
  for (const base of preferred) {
    const src = path.join(FAILED, base);
    if (fs.existsSync(src)) {
      const dst = path.join(P1, base + ".hold");
      ensure(P1);
      fs.writeFileSync(dst, fs.readFileSync(src));
      try {
        fs.unlinkSync(src);
      } catch {}
      return dst;
    }
  }
  return null;
}

(function main() {
  let target = targetCurrent();
  if (!target) {
    const restored = maybeRestoreFromFailed();
    if (restored) target = path.basename(restored);
  }
  if (!target) {
    console.log("SYNC_NO_TARGET");
    return;
  }
  const fp = path.join(P1, target);
  const r = writeSync(fp);
  console.log("SYNC_RESULT:" + JSON.stringify({ file: target, result: r }));
})();
