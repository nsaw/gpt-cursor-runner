#!/usr/bin/env node

// route-summary.js: Route summaries to correct folders via ghost relay
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const GHOST_RELAY_URL = process.env.GHOST_RELAY_URL || 'http://localhost:3001';

// Determine agent based on environment or project
function determineAgent() {
  // Check environment variable first
  if (process.env.AGENT) {
    return process.env.AGENT.toUpperCase();
  }
  
  // Check current working directory
  const cwd = process.cwd();
  if (cwd.includes('tm-mobile-cursor')) {
    return 'MAIN';
  } else if (cwd.includes('gpt-cursor-runner')) {
    return 'CYOPS';
  }
  
  // Default to CYOPS
  return 'CYOPS';
}

// Route summary to correct folder
async function routeSummary(content, filename, agent = null) {
  if (!agent) {
    agent = determineAgent();
  }
  
  if (agent !== 'CYOPS' && agent !== 'MAIN') {
    throw new Error('Invalid agent. Use CYOPS or MAIN.');
  }
  
  try {
    const response = await axios.post(`${GHOST_RELAY_URL}/summary/${agent}`, {
      content,
      filename
    });
    
    console.log(`[ROUTE-SUMMARY] ✅ Summary routed to ${agent}: ${filename}`);
    return response.data;
  } catch (error) {
    console.error(`[ROUTE-SUMMARY] ❌ Failed to route summary to ${agent}:`, error.message);
    throw error;
  }
}

// Update agent status
async function updateStatus(agent, status) {
  try {
    const response = await axios.post(`${GHOST_RELAY_URL}/status/${agent}`, {
      status
    });
    
    console.log(`[ROUTE-SUMMARY] ✅ Status updated for ${agent}: ${status}`);
    return response.data;
  } catch (error) {
    console.error(`[ROUTE-SUMMARY] ❌ Failed to update status for ${agent}:`, error.message);
    throw error;
  }
}

// Get current status
async function getStatus() {
  try {
    const response = await axios.get(`${GHOST_RELAY_URL}/status`);
    return response.data;
  } catch (error) {
    console.error(`[ROUTE-SUMMARY] ❌ Failed to get status:`, error.message);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
Usage: node route-summary.js <command> [options]

Commands:
  route <content> <filename> [agent]  - Route summary content to agent
  status [agent]                      - Get status for agent(s)
  update <agent> <status>             - Update status for agent

Examples:
  node route-summary.js route "Summary content" summary.md CYOPS
  node route-summary.js status
  node route-summary.js update CYOPS "Processing patch"
`);
    process.exit(1);
  }
  
  const command = args[0];
  
  switch (command) {
    case 'route':
      if (args.length < 3) {
        console.error('Usage: node route-summary.js route <content> <filename> [agent]');
        process.exit(1);
      }
      
      const content = args[1];
      const filename = args[2];
      const agent = args[3] || determineAgent();
      
      routeSummary(content, filename, agent)
        .then(result => console.log('Success:', result))
        .catch(error => {
          console.error('Error:', error.message);
          process.exit(1);
        });
      break;
      
    case 'status':
      getStatus()
        .then(status => console.log(JSON.stringify(status, null, 2)))
        .catch(error => {
          console.error('Error:', error.message);
          process.exit(1);
        });
      break;
      
    case 'update':
      if (args.length < 3) {
        console.error('Usage: node route-summary.js update <agent> <status>');
        process.exit(1);
      }
      
      const updateAgent = args[1];
      const status = args[2];
      
      updateStatus(updateAgent, status)
        .then(result => console.log('Success:', result))
        .catch(error => {
          console.error('Error:', error.message);
          process.exit(1);
        });
      break;
      
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

module.exports = {
  routeSummary,
  updateStatus,
  getStatus,
  determineAgent
}; 