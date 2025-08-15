#!/usr/bin/env node
/**
 * Launch Orchestrator with Expo Conflict Guard
 *
 * Main entry point for the gpt-cursor-runner orchestrator
 * with built-in Expo process detection and blocking.
 */

// PATCHED: Expo conflict guard
require("./utils/expoGuard").detectExpoProcesses();

// Launch the main orchestrator
require("./orchestrator.js");
