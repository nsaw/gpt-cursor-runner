#!/usr/bin/env node
/**
 * Summary Monitor with Expo Conflict Guard
 * 
 * Entry point for the summary monitoring system
 * with built-in Expo process detection and blocking.
 */

// PATCHED: Expo conflict guard
require('./utils/expoGuard').detectExpoProcesses();

// Launch the summary monitor
require('./monitor-core.js'); 