# Patch v3.1.0(P3.04) - Load Balancing

**Date:** 2025-07-20  
**Phase:** P3 - Microservices Architecture  
**Status:** ✅ COMPLETED

## Overview
Added round-robin load balancing for patch runner services to support N runners on different ports and cycle through them.

## Changes Made

### Files Created/Modified
- `utils/registry.js` - Added round-robin selection function
- `services/relay/index.js` - Updated to use round-robin selection

### Key Features
- **Round-robin selection**: Cycles through available runners
- **Counter-based cycling**: Maintains state across calls
- **Name-based filtering**: Filters services by name prefix
- **Load distribution**: Distributes load across multiple runners

## Technical Implementation
- Added `roundRobin(name)` function to registry utility
- Uses counter to track current position in service list
- Filters services by name prefix (e.g., 'runner')
- Cycles through available services in round-robin fashion

## Round-Robin Logic
```javascript
module.exports.roundRobin = (name) => {
  const reg = JSON.parse(fs.readFileSync(path));
  const services = Object.entries(reg).filter(([n]) => n.startsWith(name));
  const service = services[counter % services.length];
  counter++;
  return service[1];
};
```

## Validation Results
- ✅ Round-robin function implemented in registry
- ✅ Relay service updated to use load balancing
- ✅ Counter-based cycling mechanism working
- ✅ Service filtering by name prefix enabled

## Benefits
- **Load distribution**: Spreads load across multiple runners
- **High availability**: Multiple runners provide redundancy
- **Scalability**: Easy to add more runners
- **Fair distribution**: Round-robin ensures even load distribution

## Next Steps
Phase 3 is complete. Moving to Phase 4 implementation. 