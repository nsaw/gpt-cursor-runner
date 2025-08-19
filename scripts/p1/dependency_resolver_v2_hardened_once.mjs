import fs from "fs";
import path from "path";
const ROOT = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches",
  P1 = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/G2o/P1",
  FAILED = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed",
  DONE = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.completed",
  TRI = "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage";
const ORDER_FILE = path.join(P1, "execution_order_P1.md");
const TARGETS = [
  "patch-v2.0.019(P1.02.04)_promote-pm2-wrappers-enforce-to-root.json",
  "patch-v2.0.021(P1.03.04)_promote-heartbeat-rotation-to-root.json",
];
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
const readSafe = (f) => {
  try {
    return fs.readFileSync(f, "utf8");
  } catch {
    return null;
  }
};
const parseJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};
function spot(name) {
  for (const dir of [P1, ROOT, FAILED, DONE]) {
    const hit = list(dir).find((f) => f === name || f === name + ".hold");
    if (hit) return { dir, file: hit };
  }
  return null;
}
const depFields = ["dependsOn", "dependencies", "requires"];
function declaredDeps(fp) {
  const s = readSafe(fp);
  if (!s) return [];
  const j = parseJson(s) || {};
  let deps = [];
  for (const k of depFields) {
    if (Array.isArray(j[k])) deps = deps.concat(j[k]);
  }
  return Array.from(new Set(deps));
}
function orderDeps(name) {
  const o = readSafe(ORDER_FILE);
  if (!o) return [];
  const lines = o.split(/\r?\n/).filter(Boolean);
  const idx = lines.findIndex(
    (l) => l.includes(name) || l.includes(name.replace(/\.json(\.hold)?$/, "")),
  );
  if (idx <= 0) return [];
  return lines.slice(0, idx).filter((s) => s.startsWith("patch-v"));
}
function crawl(target) {
  const loc = spot(target);
  const out = { target, status: "missing", deps: [], actions: [] };
  if (!loc) return out;
  const full = path.join(loc.dir, loc.file);
  out.status =
    loc.dir === DONE
      ? "completed"
      : loc.dir === FAILED
        ? "failed"
        : loc.dir === P1
          ? full.endsWith(".hold")
            ? "p1_hold"
            : "p1_plain"
          : "root_plain";
  const wanted = [...new Set([...declaredDeps(full), ...orderDeps(loc.file)])];
  for (const d of wanted) {
    const fnd = spot(d);
    let where = "missing";
    if (fnd) {
      const f = path.join(fnd.dir, fnd.file);
      where =
        fnd.dir === DONE
          ? "completed"
          : fnd.dir === FAILED
            ? "failed"
            : fnd.dir === P1
              ? f.endsWith(".hold")
                ? "p1_hold"
                : "p1_plain"
              : "root_plain";
    }
    out.deps.push({ dep: d, status: where });
  }
  return out;
}
(function main() {
  try {
    ensure(TRI);
  } catch {}
  const report = { ts: new Date().toISOString(), targets: [], summary: {} };
  for (const t of TARGETS) {
    report.targets.push(crawl(t));
  }
  const ready = report.targets
    .filter(
      (T) =>
        !T.deps.some((x) => x.status === "missing" || x.status === "failed"),
    )
    .map((T) => T.target);
  report.summary.ready = ready;
  const out = path.join(TRI, "dep_resolve_" + Date.now() + ".json");
  try {
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log("DEP_RESOLVE_WRITTEN:" + out);
  } catch (e) {
    // Fallback: emit minimal file name with timestamp in TRI
    const fb = path.join(TRI, "dep_resolve_fallback_" + Date.now() + ".json");
    const minimal = {
      ts: new Date().toISOString(),
      error: String(e),
      ready: ready,
    };
    try {
      fs.writeFileSync(fb, JSON.stringify(minimal, null, 2));
      console.log("DEP_RESOLVE_FALLBACK:" + fb);
    } catch (_) {}
  }
})();
