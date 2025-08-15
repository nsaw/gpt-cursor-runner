// Tiny non-blocking exec with TTL; no interactive patterns.
const { exec } = require("child_process");

function run(cmd, ttl=30000) {
  return new Promise((resolve) => {
    const child = exec(cmd, { timeout: ttl, killSignal: "SIGTERM", shell: "/bin/bash", windowsHide: true }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err?.code ?? 0, stdout, stderr, err });
    });
  });
}

module.exports = { run };
