# Patch v3.1.0(P3.03) - Inter-Service Communication

**Date:** 2025-07-20  
**Phase:** P3 - Microservices Architecture  
**Status:** ✅ COMPLETED

## Overview
Enabled JSON-based calls between microservices using registry to let relay call runner via JSON using registry-resolved hostname.

## Changes Made

### Files Created/Modified
- `services/relay/index.js` - Relay microservice for inter-service communication

### Key Features
- **Registry-based routing**: Uses service registry to resolve service addresses
- **HTTP communication**: JSON-based calls between microservices
- **Fetch API**: Uses node-fetch for HTTP requests
- **Async communication**: Non-blocking inter-service calls

## Technical Implementation
- Relay service reads runner address from registry
- Makes HTTP POST request to runner service
- Sends JSON payload with file path
- Receives and logs response from runner

## Communication Flow
```javascript
// Relay reads registry
const runner = registry.resolve('runner');

// Makes HTTP call to runner
const res = await fetch(`http://localhost:${runner.port}/run-patch`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ file: 'tasks/test.json' })
});

// Processes response
const data = await res.json();
console.log('[RELAY]', data);
```

## Validation Results
- ✅ Relay service created with registry integration
- ✅ HTTP communication mechanism implemented
- ✅ JSON-based inter-service calls enabled
- ✅ Registry-based service resolution working

## Benefits
- **Service isolation**: Services communicate via HTTP
- **Registry integration**: Dynamic service discovery
- **JSON protocol**: Standard HTTP/JSON communication
- **Scalability**: Easy to add new services

## Next Steps
Phase 3 continues with the final microservice component. 