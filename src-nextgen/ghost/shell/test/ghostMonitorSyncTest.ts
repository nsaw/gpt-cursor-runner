import { runHealthCheck, restartDualMonitor } from "../lib/ghostMonitorTools";

(async () => {
  console.log("[SYNC-TEST] Starting ghost monitor sync test...");
  await runHealthCheck();
  await restartDualMonitor();
  console.log("[SYNC-TEST] Triggering stress test now...");
  const stress = require("../../test/spawnStressDaemon");
  await stress.startStress(10);
})();
