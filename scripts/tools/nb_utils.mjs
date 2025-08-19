import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
} from "fs";
import { join, dirname } from "path";
import { spawnSync, execFileSync } from "child_process";

export const jsonRead = (p, d) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return d;
  }
};
export const jsonWrite = (p, o) => {
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(o, null, 2));
};
export const listPlain = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter((f) => /^patch-.*\.json$/.test(f))
        .sort()
    : [];
export const listP1 = (dir) =>
  existsSync(dir)
    ? readdirSync(dir)
        .filter(
          (f) =>
            /^patch-v\d+\.\d+\.\d+\(P1\.\d+\.\d+\)_.+\.json$/.test(f) &&
            statSync(join(dir, f)).isFile(),
        )
        .sort()
    : [];
export const httpOk = (url, ms = 3000) => {
  try {
    const r = spawnSync(
      "curl",
      ["-sf", "--max-time", String(Math.ceil(ms / 1000)), url],
      { timeout: ms },
    );
    return r.status === 0;
  } catch {
    return false;
  }
};
export const pm2CoreOk = () => {
  try {
    const core = new Set([
      "dashboard",
      "webhook-server",
      "g2o-executor",
      "g2o-queue-reader",
      "g2o-reporter",
    ]);
    const j = JSON.parse(
      execFileSync("pm2", ["jlist"], {
        stdio: ["ignore", "pipe", "ignore"],
      }).toString(),
    );
    const bad = j
      .filter((p) => core.has(p.name) && p.pm2_env?.status !== "online")
      .map((p) => p.name);
    return { ok: bad.length === 0, bad };
  } catch (e) {
    return { ok: false, bad: ["pm2_jlist_error"] };
  }
};
export const runGate = (cmd, args = [], ms = 60000) =>
  spawnSync(cmd, args, { timeout: ms, stdio: ["ignore", "pipe", "pipe"] });
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
