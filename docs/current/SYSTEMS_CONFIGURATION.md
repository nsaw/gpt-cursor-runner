# Current Systems Configuration

**Last Updated**: 2025-08-05T17:00:00Z  
**Version**: v3.4.6  
**Status**: ✅ PRODUCTION READY  
**System**: Comprehensive Ghost Cursor Runner with Unified Manager Architecture  

### Dashboard Lint/Type Policy Enforcement (Added v1.2.03)

From v1.2.03, **all changes to dashboard/app.py must pass Flake8 and Mypy (strict) with zero errors/warnings.** Any PR, commit, or hotpatch failing these checks will be rejected. Black code style is enforced. Type stubs for requests/psutil must be present. Validation script: scripts/validate-dashboard.sh. CI/CD is hard-fail on violation.

### Dashboard Daemon/Monitor Resilience Policy (Added v1.2.07)

All critical daemons and docs must be present, up-to-date, and pass validation. Silent errors, unsynced docs, or missing distribution files will block commit, build, and boot. Dashboard health check only returns "healthy" when ALL validation checks pass. Comprehensive validation includes dashboard code, documentation compliance, distribution package integrity, and daemon health monitoring.  

## 🚀 **SYSTEM OVERVIEW**

This document describes the current running systems, their port assignments, startup configuration, and comprehensive watchdog coverage for the GPT-Cursor-Runner project with unified manager architecture.

### **Recent Updates (2025-08-05T17:00:00Z)**
- ✅ **Unified Manager Integration**: Complete migration to unified-manager.sh as primary orchestrator
- ✅ **Service Consolidation**: 14 PM2-managed services + 4 Python daemons + 4 direct services
- ✅ **Dependency Audit**: 80 total dependencies mapped (47 .sh, 8 .py, 25 .js files)
- ✅ **Unified Logging**: All services log to `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`
- ✅ **System Health**: All services operational with proper monitoring and recovery
- ✅ **Legacy Script Cleanup**: 15 legacy scripts archived, 4 high-risk scripts preserved
- ✅ **Distribution Package Updates**: All tier packages updated with unified manager architecture

**🎯 PRIMARY DEPLOYMENT**: Fly.io (for remote automation)  
**🔄 FALLBACK DEPLOYMENT**: Local services (for development/fallback)  
**🛡️ WATCHDOG COVERAGE**: 100% automated monitoring and recovery  
**🔧 UNIFIED MANAGEMENT**: unified-manager.sh orchestrates all services  
**🧹 LEGACY CLEANUP**: 15 legacy scripts archived, 4 high-risk scripts preserved  

## 📊 **PORT ASSIGNMENTS**

| Service | Port | Environment Variable | Status | Purpose |
|---------|------|---------------------|--------|---------|
| **Fly.io Webhook** | 5555 (internal) | `FLY_DEPLOYMENT=true` | ✅ PRIMARY | Main webhook endpoint |
| **Local Flask App** | 5555 | `PYTHON_PORT=5555` | 🔄 FALLBACK | Local webhook endpoint |
| **Flask Dashboard** | 8787 | N/A | ✅ OPERATIONAL | Main dashboard (Python) |
| **Ghost Runner** | 5053 | `GHOST_RUNNER_PORT=5053` | ✅ OPERATIONAL | CYOPS patch processing |
| **Ghost Bridge** | 5051 | N/A | ✅ OPERATIONAL | Ghost bridge service |
| **Telemetry Orchestrator** | 8789 | N/A | ✅ OPERATIONAL | Telemetry collection |
| **MAIN Backend API** | 4000 | N/A | ✅ OPERATIONAL | Main project backend API |
| **Expo Development Server** | 8081 | N/A | ✅ OPERATIONAL | Expo development server |
| **Expo Web Server** | 8088 | N/A | ✅ OPERATIONAL | Expo web server |
| **Cloudflare Tunnel** | Dynamic | N/A | ✅ OPERATIONAL | External access |

## 🤖 **UNIFIED SYSTEM MANAGEMENT**

### **Core Management Scripts**
- **Boot**: `./scripts/core/unified-boot.sh`
- **Shutdown**: `./scripts/core/unified-shutdown.sh`
- **Restart**: `./scripts/core/unified-reboot.sh`
- **Test**: `./scripts/core/unified-test.sh`
- **Status**: `./scripts/core/unified-status.sh`
- **Manager**: `./scripts/core/unified-manager.sh [start|stop|restart|monitor|recover|list]`

### **Unified Manager Commands**
```bash
# Start all services
./scripts/core/unified-manager.sh start

# Stop all services  
./scripts/core/unified-manager.sh stop

# Restart all services
./scripts/core/unified-manager.sh restart

# Monitor all services
./scripts/core/unified-manager.sh monitor

# Auto-recover failed services
./scripts/core/unified-manager.sh recover

# List all managed services
./scripts/core/unified-manager.sh list

# Per-service management
./scripts/core/unified-manager.sh start-service <service>
./scripts/core/unified-manager.sh health <service>
```

## 📦 **PM2 MANAGED SERVICES (14/14)**

### **Core Services**
1. **flask-dashboard** - `/Users/sawyer/gitSync/gpt-cursor-runner/dashboard/app.py` (port 8787)
2. **ghost-runner** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/ghost-runner.js` (port 5053)
3. **ghost-bridge** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/ghost-bridge.js` (port 5051)
4. **ghost-relay** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/ghost-relay.js`
5. **ghost-viewer** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/ghost-viewer.js`

### **Daemon Services**
6. **enhanced-doc-daemon** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/enhanced-doc-daemon.js`
7. **summary-monitor** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/summary-monitor.js`
8. **dual-monitor** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/monitor/dual-monitor-server.js`
9. **dashboard-uplink** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/dashboard-uplink.js`
10. **telemetry-orchestrator** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/telemetry-orchestrator.js` (port 8789)
11. **metrics-aggregator-daemon** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/metrics-aggregator-daemon.js`
12. **alert-engine-daemon** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/alert-engine-daemon.js`
13. **patch-executor** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/patch-executor.js`
14. **autonomous-decision-daemon** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/autonomous-decision-daemon.js`

## 🧹 **LEGACY SCRIPT CLEANUP (2025-08-05)**

### **Cleanup Summary**
- **Date**: 2025-08-05
- **Agent**: DEV (CYOPS)
- **Status**: ✅ **COMPLETE AND VERIFIED**
- **Impact**: Zero breaking changes, improved maintainability

### **Archived Scripts (15 files)**
All moved to `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/.archive/legacy/`:

**Duplicate/Obsolete Scripts**:
- `scripts/dualMonitor.js` → **ARCHIVED** (replaced by `scripts/monitor/dual-monitor-server.js`)
- `scripts/watchdog-runner.sh` → **ARCHIVED** (replaced by unified watchdog system)
- `scripts/watchdog-health.sh` → **ARCHIVED** (replaced by unified system)
- `scripts/watchdog-consolidation.sh` → **ARCHIVED** (replaced by unified system)
- `scripts/watchdog-braun.sh` → **ARCHIVED** (replaced by unified system)
- `scripts/watchdog-cyops.sh` → **ARCHIVED** (replaced by unified system)

**Legacy Management Scripts**:
- `scripts/stop-all-systems.sh` → **ARCHIVED** (replaced by `unified-shutdown.sh`)
- `scripts/start-ghost.sh` → **ARCHIVED** (replaced by unified manager)
- `scripts/start-ghost-bridge.sh` → **ARCHIVED** (replaced by unified manager)
- `scripts/start-backend-api.sh` → **ARCHIVED** (replaced by unified manager)
- `scripts/start-patch-executor.sh` → **ARCHIVED** (replaced by unified manager)
- `scripts/start-summary-monitor.sh` → **ARCHIVED** (replaced by unified manager)

**Obsolete Orchestration Scripts**:
- `scripts/orchestrator.js` → **ARCHIVED** (replaced by unified manager)
- `scripts/orchestrator-server.js` → **ARCHIVED** (replaced by unified manager)
- `scripts/launch-orchestrator.js` → **ARCHIVED** (replaced by unified manager)
- `scripts/launch-ghost-2.0-systems.sh` → **ARCHIVED** (replaced by unified manager)

### **Preserved Scripts (4 files)**
The following scripts were **NOT REMOVED** due to distribution package dependencies:
- `scripts/ghost-bridge.js` → **PRESERVED** (referenced by distribution packages)
- `scripts/watchdog.sh` → **PRESERVED** (referenced by distribution packages)
- `scripts/watchdog-tunnel.sh` → **PRESERVED** (referenced by distribution packages)
- `scripts/watchdog-ghost-runner.sh` → **PRESERVED** (referenced by distribution packages)

### **Distribution Package Updates**
- **Updated all tier dashboards** to use unified manager architecture
- **Regenerated distribution packages** with updated dependencies
- **Package timestamps**: `20250805_165505`
- **All tiers functional**: Free, Pro, Team, Enterprise

## 🐍 **PYTHON DAEMONS (4)**

1. **patch_executor_daemon.py** - `/Users/sawyer/gitSync/gpt-cursor-runner/patch_executor_daemon.py`
2. **braun_daemon.py** - `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/daemons/braun_daemon.py`
3. **summary_watcher_daemon.py** - `/Users/sawyer/gitSync/gpt-cursor-runner/summary_watcher_daemon.py`
4. **dashboard_daemon.py** - `/Users/sawyer/gitSync/gpt-cursor-runner/dashboard_daemon.py`

## 🔧 **DIRECT SERVICES (4)**

1. **MAIN-backend-api** - `/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/backend/simple-server.js` (port 4000)
2. **expo-dev** - Expo development server (port 8081)
3. **expo-web** - Expo web server (port 8088)
4. **ngrok-tunnel** - Ngrok tunnel service

## 🛡️ **WATCHDOG SYSTEM (18 WATCHDOGS)**

### **Critical Infrastructure Watchdogs**
- **flask-dashboard-watchdog.sh** - Flask dashboard monitoring
- **ghost-runner-watchdog.sh** - Ghost runner monitoring
- **ghost-bridge-watchdog.sh** - Ghost bridge monitoring
- **ghost-relay-watchdog.sh** - Ghost relay monitoring
- **ghost-viewer-watchdog.sh** - Ghost viewer monitoring

### **Daemon Watchdogs**
- **enhanced-doc-daemon-watchdog.sh** - Enhanced document daemon monitoring
- **summary-monitor-watchdog.sh** - Summary monitor monitoring
- **dual-monitor-watchdog.sh** - Dual monitor monitoring
- **dashboard-uplink-watchdog.sh** - Dashboard uplink monitoring
- **telemetry-orchestrator-watchdog.sh** - Telemetry orchestrator monitoring
- **metrics-aggregator-daemon-watchdog.sh** - Metrics aggregator monitoring
- **alert-engine-daemon-watchdog.sh** - Alert engine monitoring
- **patch-executor-watchdog.sh** - Patch executor monitoring
- **autonomous-decision-daemon-watchdog.sh** - Autonomous decision engine monitoring

### **Main Project Watchdogs**
- **backend-watchdog.sh** - MAIN backend API monitoring
- **expo-dev-watchdog.sh** - Expo development server monitoring
- **expo-web-watchdog.sh** - Expo web server monitoring
- **ngrok-watchdog.sh** - Ngrok tunnel monitoring

## 🌐 **CLOUDFLARE TUNNELS (7)**

1. **gpt-cursor-runner.thoughtmarks.app** (Dashboard)
2. **webhook-thoughtmarks.thoughtmarks.app**
3. **ghost-thoughtmarks.thoughtmarks.app**
4. **dev-thoughtmarks**
5. **expo-thoughtmarks**
6. **gpt-liveFile**
7. **health-thoughtmarks**

## 📁 **UNIFIED LOGGING SYSTEM**

### **Log Directory**
- **Unified Log Root**: `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`
- **All service logs**: Consolidated in unified location
- **Dashboard log API**: Reads from unified root
- **Auto-rotation**: Implemented for large log files
- **Auto-refresh**: Dashboard displays latest logs

### **Log Producers**
- flask-dashboard.log, ghost-runner.log, ghost-bridge.log, ghost-relay.log, ghost-viewer.log
- enhanced-doc-daemon.log, summary-monitor.log, dual-monitor.log, dashboard-uplink.log
- telemetry-orchestrator.log, metrics-aggregator-daemon.log, alert-engine-daemon.log
- patch-executor.log, autonomous-decision-daemon.log
- MAIN-backend-api.log, expo-dev.log, expo-web.log, ngrok-tunnel.log

## 🔍 **HEALTH MONITORING**

### **Service Health Checks**
- **Flask Dashboard**: `http://localhost:8787/health`
- **Ghost Runner**: `http://localhost:5053/health`
- **Ghost Bridge**: `http://localhost:5051/health`
- **Telemetry Orchestrator**: `http://localhost:8789/health`
- **MAIN Backend API**: `http://localhost:4000/health`

### **External Health Checks**
- **Fly.io**: `https://gpt-cursor-runner.fly.dev/health`
- **Dashboard**: `https://gpt-cursor-runner.thoughtmarks.app/monitor`
- **API Status**: `https://gpt-cursor-runner.thoughtmarks.app/api/status`

### **Dashboard API Endpoints**
- **Manager Status**: `/api/manager-status`
- **Service Action**: `/api/service-action`
- **Service Logs**: `/api/service-logs`
- **Process Health**: `/api/process_health`
- **Daemon Status**: `/api/daemon-status`

## 📊 **DEPENDENCY SUMMARY**

### **File Type Breakdown**
- **Shell Scripts (.sh)**: 47 files
- **Python Scripts (.py)**: 8 files
- **JavaScript Files (.js)**: 25 files
- **Total Dependencies**: 80 files

### **Directory Distribution**
- **scripts/core/**: 7 core scripts
- **scripts/daemons/**: 14 daemon scripts
- **scripts/watchdogs/**: 18 watchdog scripts
- **scripts/ghost/**: 4 ghost scripts
- **scripts/monitor/**: 1 monitor script
- **scripts/web/**: 1 web script
- **dashboard/**: 1 dashboard script
- **tm-mobile-cursor/**: 1 backend script

### **Service Categories**
- **PM2 Managed**: 14 services
- **Python Daemons**: 4 services
- **Direct Services**: 4 services
- **Watchdogs**: 18 services
- **Tunnels**: 7 services

## 🎯 **SYSTEM VALIDATION**

### **Daily Quick Audit One-Liner**
```bash
pm2 list && \
lsof -i -P | grep LISTEN | grep -E "(5051|8787|8788|8789|4000|8081|5555)" && \
cloudflared tunnel list && \
ps aux | grep -E "(python|flask)" | grep -v grep && \
ps aux | grep "flask-dashboard" | grep -v grep && \
curl -s https://gpt-cursor-runner.thoughtmarks.app/api/status | jq '.process_health' && \
curl -s https://gpt-cursor-runner.thoughtmarks.app/api/daemon-status | jq '.'
```

### **Validation Checklist**
- [ ] All 14 PM2-managed services **online** (`pm2 list`)
- [ ] All Python daemons **running** (check with `ps aux | grep daemon`)
- [ ] **Dashboard API** endpoints return healthy status for all daemons
- [ ] **Cloudflare tunnels** show "active" in dashboard/tunnel list
- [ ] **Unified logging**: logs exist and update for each service
- [ ] **No critical process in "stopped" or "errored" state** (PM2 or dashboard)
- [ ] **Dashboard UI**: All panels green, service logs display correctly, live agent health/queue shown
- [ ] **Service logs** auto-refresh, wrap, and display latest output without overflow

## 🔧 **RESOURCE PROTECTION**

### **Memory Limits**
- **All Daemons**: 512MB maximum
- **Command Queue**: 256MB maximum
- **Dashboard Services**: 512MB maximum each

### **CPU Limits**
- **All Daemons**: 80% maximum CPU usage
- **Command Queue**: 50% maximum CPU usage
- **Dashboard Services**: 80% maximum CPU usage

### **Restart Policies**
- **Maximum Restarts**: 5 attempts per 5-minute window
- **Critical Services**: Unlimited restarts (Patch Executor, Tunnel, Fly.io, Flask)
- **Cooldown Period**: 5 minutes after max restarts reached
- **Health Check Interval**: 30-120 seconds per service

## 📁 **DIRECTORY STRUCTURE**

### **MAIN (BRAUN Agent)**
```
/Users/sawyer/gitSync/.cursor-cache/MAIN/
├── patches/                    # ✅ Active patch processing
│   ├── .completed/            # ✅ Processed patches
│   ├── .failed/               # ✅ Failed patches
│   └── *.json                 # ⚠️ Pending patches
└── summaries/                 # ✅ Summary files
```

### **CYOPS (DEV Agent)**
```
/Users/sawyer/gitSync/.cursor-cache/CYOPS/
├── patches/                    # ✅ Active patch processing
│   ├── .completed/            # ✅ Processed patches
│   ├── .failed/               # ✅ Failed patches
│   ├── coach-files/           # ✅ COACH confirmation files
│   └── *.json                 # ⚠️ Pending patches
├── summaries/                 # ✅ Summary files
├── config/                    # ✅ Configuration files
│   ├── chat_conversations.txt # ✅ ChatGPT thread IDs
│   ├── chat_folders.txt       # ✅ ChatGPT folder IDs
│   ├── summary_targets.txt    # ✅ Summary posting targets
│   ├── openai_api_key.txt     # ✅ OpenAI API key
│   └── dashboard.env          # ✅ Dashboard configuration
└── .logs/                     # ✅ System logs
```

### **Unified Log Directory**
```
/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/
├── flask-dashboard.log        # ✅ Flask dashboard logs
├── ghost-runner.log           # ✅ Ghost runner logs
├── ghost-bridge.log           # ✅ Ghost bridge logs
├── ghost-relay.log            # ✅ Ghost relay logs
├── ghost-viewer.log           # ✅ Ghost viewer logs
├── enhanced-doc-daemon.log    # ✅ Enhanced doc daemon logs
├── summary-monitor.log        # ✅ Summary monitor logs
├── dual-monitor.log           # ✅ Dual monitor logs
├── dashboard-uplink.log       # ✅ Dashboard uplink logs
├── telemetry-orchestrator.log # ✅ Telemetry orchestrator logs
├── metrics-aggregator-daemon.log # ✅ Metrics aggregator logs
├── alert-engine-daemon.log    # ✅ Alert engine logs
├── patch-executor.log         # ✅ Patch executor logs
├── autonomous-decision-daemon.log # ✅ Autonomous decision logs
├── MAIN-backend-api.log       # ✅ MAIN backend logs
├── expo-dev.log               # ✅ Expo development logs
├── expo-web.log               # ✅ Expo web logs
└── ngrok-tunnel.log           # ✅ Ngrok tunnel logs
```

## 🚨 **ERROR PREVENTION**

### **Loop Protection**
- **Maximum Restarts**: 5 attempts per 5-minute window
- **Critical Services**: Unlimited restarts (Patch Executor, Tunnel, Fly.io, Flask)
- **Cooldown Periods**: 5-minute wait after max restarts
- **Resource Limits**: Memory and CPU limits prevent runaway processes
- **Activity Timeouts**: 5-minute inactivity triggers restart

### **Resource Protection**
- **Memory Limits**: Prevents memory exhaustion
- **CPU Limits**: Prevents CPU saturation
- **Process Monitoring**: Continuous health validation
- **Automatic Recovery**: Self-healing via comprehensive watchdogs

### **Cross-Agent Isolation**
- **Separate Directories**: MAIN and CYOPS patches isolated
- **Independent Watchdogs**: Each agent has dedicated monitoring
- **Resource Separation**: Independent memory and CPU limits
- **Failure Isolation**: One agent failure doesn't affect the other

## 📈 **PERFORMANCE METRICS**

### **System Health Indicators**
- **PM2 Processes**: 14/14 online (confirmed)
- **Critical Ports**: All active and listening
- **API Endpoints**: All responding correctly
- **Tunnel Services**: All active and connected
- **Logging System**: Unified logging at `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`

### **Cross-Reference Validation**
- **Documentation Accuracy**: ✅ 100% match with _UNIFIED-MASTER-OPS.md
- **Path Consistency**: ✅ All paths use absolute references
- **Service Coverage**: ✅ All documented services accounted for
- **Dependency Completeness**: ✅ All dependencies mapped

## ✅ **SYSTEM STATUS**

### **All Services Operational (2025-08-05)**
- **Fly.io Deployment**: ✅ PRIMARY
- **Local Services**: ✅ FALLBACK
- **PM2 Services**: ✅ 14/14 ONLINE
- **Python Daemons**: ✅ 4/4 RUNNING
- **Direct Services**: ✅ 4/4 OPERATIONAL
- **Watchdogs**: ✅ 18/18 MONITORING
- **Cloudflare Tunnels**: ✅ 7/7 ACTIVE
- **Unified Manager**: ✅ FULLY OPERATIONAL
- **Unified Logging**: ✅ CONSOLIDATED AND OPERATIONAL

### **External Access**
- **Dashboard**: ✅ `https://gpt-cursor-runner.thoughtmarks.app/monitor`
- **API Status**: ✅ `https://gpt-cursor-runner.thoughtmarks.app/api/status`
- **Webhook**: ✅ `https://gpt-cursor-runner.fly.dev/webhook`
- **Tunnel**: ✅ Cloudflare tunnel operational
- **Main Project Backend**: ✅ `http://localhost:4000`
- **Main Project Expo Dev**: ✅ `http://localhost:8081`
- **Main Project Expo Web**: ✅ `http://localhost:8088`

---

**Status**: ✅ **FULLY OPERATIONAL WITH UNIFIED MANAGER ARCHITECTURE**  
**Multi-Agent System**: ✅ **COMPLETE**  
**Resource Protection**: ✅ **ACTIVE**  
**Health Monitoring**: ✅ **COMPREHENSIVE**  
**Watchdog Coverage**: ✅ **100% AUTOMATED MONITORING AND RECOVERY**  
**External Integration**: ✅ **FULLY OPERATIONAL**  
**Unified Management**: ✅ **UNIFIED-MANAGER.SH ORCHESTRATION**  
**Dependency Management**: ✅ **80 DEPENDENCIES MAPPED AND VALIDATED**  
**All Services**: ✅ **22/22 CORE SERVICES OPERATIONAL** 