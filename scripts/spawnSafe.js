const { spawn } = require("child_process");

function spawnSafe(cmd, args, options = {}) {
  const proc = spawn(cmd, args, {
    detached: true,
    stdio: "ignore",
    ...options,
  });
  proc.unref();
}

module.exports = { spawnSafe };
