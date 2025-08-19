// ***REMOVED*** Shell — Phase 4 relay signal core added
import { runExecutor } from "./executor";
import { startBridge } from "./bridge";
import { watchSummaries } from "./summary";
import { startLogRouter } from "./logRouter";
import { startSummaryValidator } from "./summarySyncValidator";
import { startMonitorRecovery } from "./monitorWatcher";
import { startSelfCheckLoop } from "./selfCheckDaemon";
import { emitMonitorStatus } from "./relayCore";
import { startBootstrapDaemon } from "./bootstrapDaemon";
import { startDiffMonitor } from "./diffMonitor";

export async function startGhostShell() {
  runExecutor();
  startBridge();
  watchSummaries();
  startLogRouter();
  startSummaryValidator();
  startMonitorRecovery();
  startSelfCheckLoop();
  emitMonitorStatus("booted");
  startBootstrapDaemon();
  startDiffMonitor();
}

if (require.main === module) {
  startGhostShell();
}
