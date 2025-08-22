# PM2 Service Architecture Diagnosis Report

**Generated**: 2025-08-21T11:30:00Z  
**Status**: 🔍 **DIAGNOSIS COMPLETE** - G2o services missing, legacy services deprecated

## Executive Summary

The PM2 service architecture has **evolved significantly** from the original ecosystem configuration. The G2o patches have introduced a new service architecture that **replaces or supplements** many legacy services, but the ecosystem configuration has **not been updated** to reflect these changes.

## Current PM2 Services Status

### ✅ **Online Services (4/19)**
- `dashboard` - Flask dashboard (port 8787)
- `g2o-executor` - Patch executor (core G2o service)
- `ghost-python` - Python ghost runner (port 5051)
- `p0-queue-shape-assessor` - Queue assessment service

### ⚠️ **Errored Services (4/19)**
- `ghost-bridge` - Bridge service (60 restarts)
- `ghost-relay` - Relay service (45 restarts)
- `telemetry-api` - Telemetry API (60 restarts)
- `telemetry-orchestrator` - Telemetry orchestrator (60 restarts)

### ❌ **Stopped Services (11/19)**
- `alert-engine-daemon`
- `autonomous-decision-daemon`
- `dashboard-uplink`
- `dual-monitor`
- `enhanced-doc-daemon`
- `flask-dashboard`
- `ghost-runner`
- `ghost-viewer`
- `metrics-aggregator-daemon`
- `patch-executor` (legacy)
- `summary-monitor`

## G2o Service Architecture Analysis

### 🎯 **Expected G2o Services (Missing)**
Based on G2o patches analysis, these services should be running:

1. **`g2o-executor`** ✅ **ONLINE** - Core patch executor
2. **`g2o-queue-counters`** ❌ **MISSING** - Queue monitoring service
3. **`g2o-summary-gate`** ❌ **MISSING** - Summary validation service
4. **`g2o-dashboard-probe`** ❌ **MISSING** - Dashboard health monitoring
5. **`g2o-handoff-watcher`** ❌ **MISSING** - Handoff monitoring service
6. **`g2o-completed-validate`** ❌ **MISSING** - Completion validation service

### 📁 **G2o Scripts Status**
- **Available**: `scripts/monitor/g2o_executor_heartbeat_once.js`
- **Missing**: Most G2o monitoring scripts referenced in patches

## Root Cause Analysis

### 1. **Failed G2o Patch Execution**
- **Issue**: Multiple G2o patches (v2.0.940-v2.0.968) are in `.failed/` directory
- **Impact**: G2o services were never installed
- **Evidence**: 15+ failed patches in `/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed/`

### 2. **Ecosystem Configuration Mismatch**
- **Issue**: `config/ecosystem.config.js` contains **legacy services only**
- **Missing**: All G2o services (`g2o-*`) are absent from ecosystem config
- **Impact**: PM2 starts legacy services instead of G2o services

### 3. **Service Architecture Evolution**
- **Legacy**: 19 services in ecosystem config (mostly stopped/errored)
- **G2o**: 6 core services (1 online, 5 missing)
- **Gap**: No migration path from legacy to G2o architecture

## Service Classification

### 🔄 **Legacy Services (Deprecated)**
These services appear to be replaced by G2o equivalents:
- `patch-executor` → `g2o-executor` ✅
- `summary-monitor` → `g2o-summary-gate` ❌
- `dual-monitor` → `g2o-dashboard-probe` ❌
- `metrics-aggregator-daemon` → `g2o-queue-counters` ❌

### 🆕 **G2o Services (New Architecture)**
- `g2o-executor` - Core patch execution engine
- `g2o-queue-counters` - Queue depth monitoring
- `g2o-summary-gate` - Summary validation and auditing
- `g2o-dashboard-probe` - Dashboard health monitoring
- `g2o-handoff-watcher` - Handoff process monitoring
- `g2o-completed-validate` - Completion validation

### 🔧 **Core Services (Still Required)**
- `dashboard` - Main dashboard interface
- `ghost-python` - Python ghost runner
- `p0-queue-shape-assessor` - Queue assessment

## Recommendations

### 🚨 **Immediate Actions**

1. **Execute Failed G2o Patches**
   ```bash
   # Move failed patches back to root queue
   cp /Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.failed/patch-v2.0.9*.json /Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/
   ```

2. **Update Ecosystem Configuration**
   - Add G2o services to `config/ecosystem.config.js`
   - Remove or disable deprecated legacy services
   - Ensure proper service dependencies

3. **Install Missing G2o Scripts**
   - Create missing monitoring scripts referenced in patches
   - Ensure proper permissions and paths

### 🔄 **Architecture Migration**

1. **Phase 1**: Get G2o services online
2. **Phase 2**: Validate G2o service functionality
3. **Phase 3**: Deprecate legacy services
4. **Phase 4**: Update monitoring and health checks

### 📊 **Monitoring Updates**

1. **Update Health Checks**: Point to G2o services instead of legacy
2. **Update Dashboards**: Display G2o service status
3. **Update Alerts**: Configure alerts for G2o services

## Conclusion

The PM2 service architecture is in a **transitional state** between legacy and G2o systems. The core issue is that **G2o patches failed to execute**, leaving the system with legacy services that are mostly non-functional. 

**Priority**: Execute the failed G2o patches to bring the new architecture online, then update the ecosystem configuration to reflect the new service architecture.

---
**Next Steps**: Execute failed G2o patches and update ecosystem configuration
