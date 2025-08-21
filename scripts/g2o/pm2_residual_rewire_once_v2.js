/* eslint-disable */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const PLAN =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_residual_rewire_plan.json";
const RESULT =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_residual_rewire_result.json";
const OUT_T =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_residual_out_tail.log";
const ERR_T =
  "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_residual_err_tail.log";
const ROOT = "/Users/sawyer/gitSync/gpt-cursor-runner";
const ALLOW = (
  process.env.PM2_ALLOW ||
  "g2o-executor,p0-queue-shape-assessor,g2o-completed-validator,g2o-handoff-watcher,main-failure-emitter,main-queue-counters"
).split(",");
const FALLBACK_SCRIPT = (name) => {
  if (name === "g2o-executor")
    return path.join(ROOT, "scripts/monitor/g2o_executor_heartbeat_once.js");
  if (name === "p0-queue-shape-assessor")
    return path.join(ROOT, "scripts/monitor/p0_queue_shape_assessor_once.js");
  return null;
};
const pm2 = (args, ms = 15000) =>
  new Promise((res) => {
    const p = spawn("pm2", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "",
      err = "";
    const t = setTimeout(() => {
      try {
        p.kill("SIGKILL");
      } catch (_) {}
      res({ code: 124, out, err: "timeout" });
    }, ms);
    p.stdout.on("data", (d) => (out += d));
    p.stderr.on("data", (d) => (err += d));
    p.on("exit", (c) => {
      clearTimeout(t);
      res({ code: c ?? 1, out, err });
    });
    p.on("error", () => res({ code: 127, out: "", err: "spawn-error" }));
  });
const jlist = async () => {
  const r = await pm2(["jlist"]);
  try {
    return JSON.parse(r.out || "[]");
  } catch {
    return [];
  }
};
const tail = (f, sz = 8192) => {
  try {
    const st = fs.statSync(f);
    const pos = Math.max(0, st.size - sz);
    const fd = fs.openSync(f, "r");
    const buf = Buffer.alloc(st.size - pos);
    fs.readSync(fd, buf, 0, buf.length, pos);
    fs.closeSync(fd);
    return buf.toString("utf8");
  } catch {
    return "";
  }
};
(async () => {
  const actions = [];
  fs.mkdirSync(path.dirname(PLAN), { recursive: true });
  fs.writeFileSync(PLAN, JSON.stringify({ allow: ALLOW }, null, 2));

  const list = await jlist();
  const targets = list.filter(
    (p) => ALLOW.includes(p.name) && p.pm2_env?.status !== "online",
  );
  for (const svc of targets) {
    const name = svc.name;
    actions.push({ name, step: "delete-if-exists" });
    await pm2(["delete", name]);
    // Prefer existing script if present, else fallback heartbeat
    const script = svc.pm2_env?.pm_exec_path || FALLBACK_SCRIPT(name);
    actions.push({ name, step: "start", script });
    if (script)
      await pm2([
        "start",
        script,
        "--name",
        name,
        "--time",
        "--restart-delay",
        "3000",
        "--max-restarts",
        "5",
      ]);
    // verify
    let ok = false,
      env = {};
    for (let i = 0; i < 4; i++) {
      const now = (await jlist()).find((x) => x.name === name);
      if (now?.pm2_env?.status === "online") {
        ok = true;
        env = now.pm2_env;
        break;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ok) {
      const outTail = tail(env.pm_out_log_path || "");
      const errTail = tail(env.pm_err_log_path || "");
      fs.writeFileSync(OUT_T, outTail, { flag: "a" });
      fs.writeFileSync(ERR_T, errTail, { flag: "a" });
    }
  }
  await pm2(["save"]);
  const post = (await jlist())
    .filter((p) => ALLOW.includes(p.name))
    .map((p) => ({ name: p.name, status: p.pm2_env?.status || "unknown" }));
  fs.writeFileSync(RESULT, JSON.stringify({ actions, verify: post }, null, 2));
  process.exit(0);
})();
