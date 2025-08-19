#!/usr/bin/env ts-node
/**
 * Ghost Alert Engine Runner
 * Entry point for the Ghost Alert Engine daemon
 */

import { startGhostAlertEngine, getGhostAlertEngine } from "./ghostAlertEngine";

const CYOPS_CACHE =
  process.env.CYOPS_CACHE || "/Users/sawyer/gitSync/.cursor-cache/CYOPS";

console.log("[GhostAlertEngineRunner] Starting Ghost Alert Engine...");
console.log("[GhostAlertEngineRunner] CYOPS Cache:", CYOPS_CACHE);

async function main() {
  try {
    // Start the alert engine
    await startGhostAlertEngine();

    console.log(
      "[GhostAlertEngineRunner] Ghost Alert Engine started successfully",
    );

    // Keep the process running
    process.on("SIGINT", async () => {
      console.log("[GhostAlertEngineRunner] Received SIGINT, shutting down...");
      const alertEngine = getGhostAlertEngine();
      await alertEngine.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log(
        "[GhostAlertEngineRunner] Received SIGTERM, shutting down...",
      );
      const alertEngine = getGhostAlertEngine();
      await alertEngine.stop();
      process.exit(0);
    });

    // Log status every 30 seconds
    setInterval(() => {
      const alertEngine = getGhostAlertEngine();
      const state = alertEngine.getState();
      console.log(
        `[GhostAlertEngineRunner] Status: ${alertEngine.isHealthy() ? "HEALTHY" : "UNHEALTHY"}, Alerts: ${state.activeAlerts.length}, Rules: ${state.rules.length}`,
      );
    }, 30000);
  } catch (error) {
    console.error(
      "[GhostAlertEngineRunner] Failed to start alert engine:",
      error,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[GhostAlertEngineRunner] Unhandled error:", error);
  process.exit(1);
});
