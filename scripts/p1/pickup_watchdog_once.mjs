import fs from "fs";
import path from "path";

const ROOT =
  process.env.PATCHES_ROOT ||
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches";
const META =
  process.env.META || "/Users/sawyer/gitSync/.cursor-cache/CYOPS/meta";

const start = (fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : []).filter((f) =>
  /^patch-.*\.json$/.test(f),
).length;
const deadline = Date.now() + 40000;

function done(moved) {
  const o = {
    ts: new Date().toISOString(),
    start_plain: start,
    end_plain: (fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : []).filter((f) =>
      /^patch-.*\.json$/.test(f),
    ).length,
    moved,
  };
  fs.mkdirSync(META, { recursive: true });
  fs.writeFileSync(
    path.join(META, "pickup_probe.json"),
    JSON.stringify(o, null, 2),
  );

  if (!moved) {
    const h = {
      ts: o.ts,
      reason: "executor_pickup_timeout",
      probe: o,
    };
    fs.writeFileSync(
      path.join(META, "P1.HALT.json"),
      JSON.stringify(h, null, 2),
    );
    process.exit(3);
  }
  process.exit(0);
}

(function poll() {
  const now = (fs.existsSync(ROOT) ? fs.readdirSync(ROOT) : []).filter((f) =>
    /^patch-.*\.json$/.test(f),
  ).length;
  if (now < start) return done(true);
  if (Date.now() > deadline) return done(false);
  setTimeout(poll, 1500);
})();
