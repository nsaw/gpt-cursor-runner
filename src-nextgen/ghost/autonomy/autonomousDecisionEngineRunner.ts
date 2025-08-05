#!/usr/bin/env ts-node
/**
 * Autonomous Decision Engine Runner
 * Entry point for the autonomous decision engine
 * Integrates with existing Ghost Runner and BRAUN daemon systems
 */

import { startAutonomousDecisionEngine, getAutonomousDecisionEngine } from './autonomousDecisionEngine';

// Unified path structure
const CYOPS_CACHE = process.env.CYOPS_CACHE || '/Users/sawyer/gitSync/.cursor-cache/CYOPS';
const MAIN_CACHE = process.env.MAIN_CACHE || '/Users/sawyer/gitSync/.cursor-cache/MAIN';

console.log('[AutonomousDecisionEngineRunner] Starting Autonomous Decision Engine...');
console.log(`[AutonomousDecisionEngineRunner] CYOPS Cache: ${CYOPS_CACHE}`);
console.log(`[AutonomousDecisionEngineRunner] MAIN Cache: ${MAIN_CACHE}`);

// Handle process signals
process.on('SIGINT', async () => {
  console.log('\n[AutonomousDecisionEngineRunner] Received SIGINT, shutting down...');
  const engine = getAutonomousDecisionEngine();
  await engine.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[AutonomousDecisionEngineRunner] Received SIGTERM, shutting down...');
  const engine = getAutonomousDecisionEngine();
  await engine.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('[AutonomousDecisionEngineRunner] Uncaught Exception:', error);
  const engine = getAutonomousDecisionEngine();
  await engine.stop();
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('[AutonomousDecisionEngineRunner] Unhandled Rejection at', promise, ':', reason);
  const engine = getAutonomousDecisionEngine();
  await engine.stop();
  process.exit(1);
});

// Start the engine
async function main() {
  try {
    await startAutonomousDecisionEngine();
    console.log('[AutonomousDecisionEngineRunner] Autonomous Decision Engine started successfully');
    
    // Keep the process running
    setInterval(() => {
      const engine = getAutonomousDecisionEngine();
      const status = engine.getSystemState();
      console.log(`[AutonomousDecisionEngineRunner] System Status: ${status}`);
    }, 60000); // Log status every minute
    
  } catch (error) {
    console.error('[AutonomousDecisionEngineRunner] Failed to start engine:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('[AutonomousDecisionEngineRunner] Main function error:', error);
  process.exit(1);
}); 