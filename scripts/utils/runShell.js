// scripts/utils/runShell.js
"use strict";
const { spawn, exec } = require("child_process");

/**
 * execShell(cmd, opts?) -> Promise<{ stdout, stderr, code }>
 * Runs via /bin/zsh -lc so shell syntax (cd, &&, ||, redirects, braces) works reliably.
 */
function execShell(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { shell: "/bin/zsh", ...opts }, (err, stdout, stderr) => {
      if (err) {
        err.stdout = stdout;
        err.stderr = stderr;
        err.code = err.code ?? err.signal ?? 1;
        return reject(err);
      }
      resolve({ stdout, stderr, code: 0 });
    });
  });
}

/**
 * spawnDetached(cmdLine, { cwd, env })
 * Fire-and-forget via /bin/zsh -lc. Never blocks Cursor; caller should tail logs.
 */
function spawnDetached(cmdLine, opts = {}) {
  const child = spawn("/bin/zsh", ["-lc", cmdLine], {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  return true;
}

/**
 * tailLog({ file, lines=1000, ttl='5m', label, logFile, statusDir, cwd }) -> detached
 * Spawns a safe tail with TTL and limited lines; use for live log streaming to files.
 */
function tailLog({
  file,
  lines = 1000,
  ttl = "5m",
  label,
  logFile,
  statusDir = "validations/status",
  cwd,
}) {
  if (!file) throw new Error("tailLog: file is required");
  const safeLines = Math.max(1, Math.min(10000, Number(lines) || 1000));
  const parts = [];
  if (label) {
    parts.push(`mkdir -p ${JSON.stringify(statusDir)}`);
    parts.push(
      `date +%FT%T%z > ${JSON.stringify(require("path").join(statusDir, `${label}.tail.started`))}`,
    );
  }
  const redirect = logFile ? `>> ${JSON.stringify(logFile)} 2>&1` : "";
  parts.push(
    `timeout --kill-after=10s ${ttl} tail -n ${safeLines} -F ${JSON.stringify(file)} ${redirect}`,
  );
  if (label) {
    parts.push("code=$?");
    parts.push(
      `echo $code > ${JSON.stringify(require("path").join(statusDir, `${label}.tail.exitcode`))}`,
    );
    parts.push(
      `date +%FT%T%z > ${JSON.stringify(require("path").join(statusDir, `${label}.tail.done`))}`,
    );
  }
  const line = parts.join(" && ");
  const child = spawn("/bin/zsh", ["-lc", line], {
    cwd,
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  return true;
}

module.exports = { execShell, spawnDetached, tailLog };
