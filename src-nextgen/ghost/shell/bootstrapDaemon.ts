// ***REMOVED*** Self-Bootstrap Daemon — Phase 4 Final
import { exec } from "child_process";
import { emitMonitorStatus } from "./relayCore";
import ps from "ps-node";

const processes = [
  "summarySyncValidator",
  "logRouter",
  "diffMonitor",
  "relayCore",
  "roleVerifier",
];

function isAlive(name: string, cb: (alive: boolean) => void) {
  ps.lookup({ command: "node", arguments: name }, (err, resultList) => {
    if (err) return cb(false);
    cb(resultList.length > 0);
  });
}

export function startBootstrapDaemon() {
  console.log("[Bootstrap] Starting ghost bootstrap watchdog...");
  setInterval(() => {
    let healthy = true;
    processes.forEach((proc) => {
      isAlive(proc, (alive) => {
        if (!alive) {
          console.warn(
            `[Bootstrap] ⚠️ ${proc} missing — restarting ghost shell`,
          );
          healthy = false;
          exec("node scripts/restart-ghost-shell.js");
        }
      });
    });
    if (healthy) emitMonitorStatus("READY");
  }, 60000);
}
