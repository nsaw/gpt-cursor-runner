// Orchestrator Agent Map — Final Phase 4
import { startBootstrapDaemon } from "../ghost/shell/bootstrapDaemon";
import { startDiffMonitor } from "../ghost/shell/diffMonitor";
import { startSelfCheckLoop } from "../ghost/shell/selfCheckDaemon";

export function runOrchestrator() {
  console.log("[Orchestrator] Spawning all core agents...");
  startBootstrapDaemon();
  startDiffMonitor();
  startSelfCheckLoop();
  // Add probes here if needed...
}
