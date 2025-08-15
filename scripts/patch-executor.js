#!/usr/bin/env node
"use strict";
// Unified patch executor with CYOPS queue support + non-blocking post/validate via nb.js
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_CFG = path.resolve(__dirname, "config", "patch-queue.json");
const argv = process.argv.slice(2);
const once = argv.includes("--once");
const dirArgIdx = argv.indexOf("--dirs");
const explicitDirs = dirArgIdx !== -1 ? argv[dirArgIdx + 1] : "";
const dryRun = argv.includes("--dry-run");

function log(...a) {
  console.log("[patch-executor]", ...a);
}
function runZsh(cmd, { inherit = false, cwd = process.cwd() } = {}) {
  return new Promise((res, rej) => {
    const p = spawn("/bin/zsh", ["-lc", cmd], {
      stdio: inherit ? "inherit" : "pipe",
      cwd,
    });
    let out = "";
    let err = "";
    if (!inherit) {
      p.stdout.on("data", (d) => (out += d));
      p.stderr.on("data", (d) => (err += d));
    }
    p.on("exit", (code) =>
      code === 0
        ? res({ code, out, err })
        : rej(new Error(err || `exit ${code}`)),
    );
  });
}
async function fileExists(p) {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}
function listPatchFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^patch-.*\.json$/i.test(f))
    .map((f) => path.join(dir, f))
    .sort();
}
async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function applyMutation(m) {
  const op = m.op || "upsert";
  if (op === "upsert") {
    const p = m.path;
    const body = m.contents ?? "";
    await ensureDir(path.dirname(p));
    await fsp.writeFile(p, body, "utf8");
    if (m.mode) await fsp.chmod(p, m.mode);
    log("upsert", p);
    return;
  }
  if (op === "delete") {
    const p = m.path;
    if (await fileExists(p)) {
      await fsp.rm(p, { recursive: true, force: true });
    }
    log("delete", p);
    return;
  }
  if (op === "chmod") {
    const p = m.path;
    if (await fileExists(p)) {
      await fsp.chmod(p, m.mode || "0644");
    }
    log("chmod", p);
    return;
  }
  log("skip-unknown-op", op);
}

async function runShellListNonBlocking(list, root) {
  if (!Array.isArray(list) || list.length === 0) return;
  const nbJs = path.resolve(root, "scripts", "nb.js");
  const hasNb = fs.existsSync(nbJs);
  for (const [i, cmd] of list.entries()) {
    const label = `post_${i + 1}`;
    if (hasNb) {
      const line = `node ${JSON.stringify(nbJs)} --ttl 20m --label ${JSON.stringify(label)} --log validations/logs/${label}.log --status validations/status -- ${cmd}`;
      await runZsh(line, { inherit: true, cwd: root });
    } else {
      await runZsh(`(${cmd}) >/dev/null 2>&1 & disown`, {
        inherit: true,
        cwd: root,
      });
    }
  }
}

async function runValidateListNonBlocking(list, root) {
  if (!Array.isArray(list) || list.length === 0) return;
  const nbJs = path.resolve(root, "scripts", "nb.js");
  const hasNb = fs.existsSync(nbJs);
  for (const [i, cmd] of list.entries()) {
    const label = `validate_${i + 1}`;
    if (hasNb) {
      const line = `node ${JSON.stringify(nbJs)} --ttl 20m --label ${JSON.stringify(label)} --log validations/logs/${label}.log --status validations/status -- ${cmd}`;
      await runZsh(line, { inherit: true, cwd: root });
    } else {
      await runZsh(`(${cmd}) >/dev/null 2>&1 & disown`, {
        inherit: true,
        cwd: root,
      });
    }
  }
}

async function processPatch(patchPath) {
  const root = path.resolve(__dirname, "..");
  const raw = await fsp.readFile(patchPath, "utf8");
  let patch;
  try {
    patch = JSON.parse(raw);
  } catch (e) {
    throw new Error(`invalid JSON: ${patchPath}`);
  }
  log("processing", path.basename(patchPath));

  // mutations
  if (Array.isArray(patch.mutations)) {
    for (const m of patch.mutations) {
      await applyMutation(m);
    }
  }

  // postMutationBuild (non-blocking)
  const postList = patch.postMutationBuild?.shell || [];
  await runShellListNonBlocking(postList, root);

  // validate (non-blocking)
  const valList = patch.validate?.shell || [];
  await runValidateListNonBlocking(valList, root);

  // move to processed
  const cfg = JSON.parse(await fsp.readFile(DEFAULT_CFG, "utf8"));
  const processedDir =
    cfg.processedDir || path.join(path.dirname(patchPath), "processed");
  await ensureDir(processedDir);
  const dest = path.join(processedDir, path.basename(patchPath));
  await fsp.rename(patchPath, dest).catch(async () => {
    // fallback: copy+unlink in case cross-device
    await fsp.copyFile(patchPath, dest);
    await fsp.unlink(patchPath);
  });
  log("moved", dest);
}

async function main() {
  const cfgPath = DEFAULT_CFG;
  const cfg = (await fileExists(cfgPath))
    ? JSON.parse(await fsp.readFile(cfgPath, "utf8"))
    : { watchDirs: [] };
  const envDirs = process.env.PATCH_QUEUE_DIRS
    ? process.env.PATCH_QUEUE_DIRS.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const argDirs = explicitDirs
    ? explicitDirs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const watchDirs = [...new Set([...argDirs, ...envDirs, ...cfg.watchDirs])];
  if (watchDirs.length === 0) {
    console.error("No patch files found in queue (no watchDirs configured).");
    process.exit(0);
  }
  log("watchDirs:", watchDirs.join(" | "));

  // --once mode: scan and process now
  if (once) {
    for (const d of watchDirs) {
      const files = listPatchFiles(d);
      if (files.length) log("found", files.length, "in", d);
      for (const f of files) {
        try {
          if (!dryRun) await processPatch(f);
          else log("dry-run would process", f);
        } catch (e) {
          console.error("[patch-executor] error", f, e.message);
        }
      }
    }
    return;
  }

  // watcher mode
  const chokidarPath = require.resolve("chokidar");
  const chokidar = require(chokidarPath);
  const watcher = chokidar.watch(
    watchDirs.map((d) => path.join(d, "patch-*.json")),
    {
      ignoreInitial: false,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    },
  );
  watcher.on("add", (f) => {
    log("detected", f);
    processPatch(f).catch((e) =>
      console.error("[patch-executor] error", f, e.message),
    );
  });
  log("watching for incoming patches...");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
