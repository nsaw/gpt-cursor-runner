#!/usr/bin/env ts-node
/**
 * Ghost Metrics Aggregator Runner
 * Entry point for the Ghost Metrics Aggregator daemon
 */

import { startGhostMetricsAggregator, getGhostMetricsAggregator } from './ghostMetricsAggregator';

const CYOPS_CACHE = process.env.CYOPS_CACHE || '/Users/sawyer/gitSync/.cursor-cache/CYOPS';

console.log('[GhostMetricsAggregatorRunner] Starting Ghost Metrics Aggregator...');
console.log('[GhostMetricsAggregatorRunner] CYOPS Cache:', CYOPS_CACHE);

async function main() {
  try {
    // Start the metrics aggregator
    await startGhostMetricsAggregator();
    
    console.log('[GhostMetricsAggregatorRunner] Ghost Metrics Aggregator started successfully');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('[GhostMetricsAggregatorRunner] Received SIGINT, shutting down...');
      const aggregator = getGhostMetricsAggregator();
      await aggregator.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      console.log('[GhostMetricsAggregatorRunner] Received SIGTERM, shutting down...');
      const aggregator = getGhostMetricsAggregator();
      await aggregator.stop();
      process.exit(0);
    });
    
    // Log status every 30 seconds
    setInterval(() => {
      const aggregator = getGhostMetricsAggregator();
      const state = aggregator.getState();
      console.log(`[GhostMetricsAggregatorRunner] Status: ${aggregator.isHealthy() ? 'HEALTHY' : 'UNHEALTHY'}, Metrics: ${state.aggregatedMetrics.length}, Trends: ${state.trends.length}, Anomalies: ${state.anomalies.length}`);
    }, 30000);
    
  } catch (error) {
    console.error('[GhostMetricsAggregatorRunner] Failed to start metrics aggregator:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('[GhostMetricsAggregatorRunner] Unhandled error:', error);
  process.exit(1);
}); 