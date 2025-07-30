# Current Systems Configuration

**Last Updated**: 2025-07-30T17:25:00Z  
**Version**: v3.4.2  
**Status**: ✅ PRODUCTION READY  

## 🚀 **SYSTEM OVERVIEW**

This document describes the current running systems, their port assignments, and startup configuration for the GPT-Cursor-Runner project.

**🎯 PRIMARY DEPLOYMENT**: Fly.io (for remote automation)  
**🔄 FALLBACK DEPLOYMENT**: Local services (for development/fallback)

## 📊 **PORT ASSIGNMENTS**

| Service | Port | Environment Variable | Status | Purpose |
|---------|------|---------------------|--------|---------|
| **Fly.io Webhook** | 5555 (internal) | `FLY_DEPLOYMENT=true` | ✅ PRIMARY | Main webhook endpoint |
| **Local Flask App** | 5555 | `PYTHON_PORT=5555` | 🔄 FALLBACK | Local webhook endpoint |
| **Ghost Runner** | 5053 | `GHOST_RUNNER_PORT=5053` | ✅ OPERATIONAL | CYOPS patch processing |
| **Cloudflare Tunnel** | Dynamic | N/A | ✅ OPERATIONAL | External access |

## 🤖 **MULTI-AGENT PATCH RUNNERS**

### **BRAUN (AGENT 1) - MAIN PROJECTS**
- **Status**: ✅ FULLY OPERATIONAL
- **Daemon**: `braun_daemon.py`
- **Watchdog**: `braun-daemon-watchdog.sh`
- **Patch Directory**: `/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/`
- **Environment**: MAIN (UI/application work)
- **Resource Limits**: 512MB memory, 80% CPU
- **Restart Policy**: 5 attempts per 5 minutes

### **DEV (AGENT 2) - CYOPS INFRASTRUCTURE**
- **Status**: ✅ FULLY OPERATIONAL
- **Ghost Runner**: `ghost-runner.js`
- **Watchdog**: `ghost-runner-watchdog.sh`
- **Patch Directory**: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/`
- **Environment**: CYOPS (gpt-cursor-runner infrastructure)
- **Resource Limits**: 512MB memory, 80% CPU
- **Restart Policy**: 5 attempts per 5 minutes

### **Unified Patch Executor**
- **Status**: ✅ FULLY OPERATIONAL
- **Process**: `patch-executor-loop.js`
- **Monitoring**: Both MAIN and CYOPS patch directories
- **Polling**: Every 5 seconds
- **Resource Limits**: 512MB memory, 80% CPU

## 🛡️ **WATCHDOG SERVICES**

### **BRAUN Daemon Watchdog**
- **Script**: `scripts/watchdogs/braun-daemon-watchdog.sh`
- **Status**: ✅ ACTIVE
- **Monitoring**: BRAUN daemon health and resource usage
- **Actions**: Restart on failure, resource limit enforcement
- **Log File**: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/braun-watchdog.log`

### **Ghost Runner Watchdog**
- **Script**: `scripts/watchdogs/ghost-runner-watchdog.sh`
- **Status**: ✅ ACTIVE
- **Monitoring**: Ghost Runner health and resource usage
- **Actions**: Restart on failure, resource limit enforcement
- **Log File**: `/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost-runner-CYOPS.log`

### **Unified System Watchdog**
- **Script**: `scripts/daemon-unified-watchdog.sh`
- **Status**: ✅ ACTIVE
- **Monitoring**: All system services
- **Actions**: Comprehensive health monitoring and alerting
- **Log File**: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/.logs/daemon-watchdog.log`

## 📋 **COMMAND QUEUE DAEMON**

### **COACH Spec Implementation**
- **Script**: `scripts/command-queue-daemon.sh`
- **Status**: ✅ ACTIVE
- **Watching**: `/Users/sawyer/gitSync/gpt-cursor-runner/commands/`
- **Processing**: systemd-run (Linux) / direct execution (macOS)
- **Logging**: `/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/`
- **Resource Limits**: 256MB memory, 50% CPU

## 🔧 **RESOURCE PROTECTION**

### **Memory Limits**
- **BRAUN Daemon**: 512MB maximum
- **Ghost Runner**: 512MB maximum
- **Patch Executor**: 512MB maximum
- **Command Queue**: 256MB maximum
- **Flask App**: 512MB maximum

### **CPU Limits**
- **All Daemons**: 80% maximum CPU usage
- **Command Queue**: 50% maximum CPU usage

### **Restart Policies**
- **Maximum Restarts**: 5 attempts per 5-minute window
- **Cooldown Period**: 5 minutes after max restarts reached
- **Health Check Interval**: 30-60 seconds per service

### **Activity Monitoring**
- **Timeout**: 5 minutes without activity triggers restart
- **Log Monitoring**: File modification time tracking
- **Process Validation**: PID and health endpoint verification

## 🚀 **UNIFIED BOOT SCRIPT**

### **Enhanced Startup Sequence**
1. **Port Conflict Resolution**: Kill existing processes on ports 5555, 5053
2. **Process Cleanup**: Remove stale PID files and watchdog processes
3. **Dependency Checking**: Verify psutil, Node.js availability
4. **Fly.io Deployment**: Primary deployment with health validation
5. **Local Services**: Fallback deployment if Fly.io fails
6. **BRAUN Daemon**: Start MAIN patch processing
7. **Patch Executor**: Start unified MAIN/CYOPS processing
8. **Command Queue**: Start COACH spec implementation
9. **Watchdog Services**: Start all monitoring services
10. **Health Validation**: Comprehensive system health check

### **Resource Protection Active**
- Memory limits: 512MB per daemon
- CPU limits: 80% per daemon
- Restart limits: 5 attempts per 5 minutes
- Activity monitoring: 5-minute timeout

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
│   └── *.json                 # ⚠️ Pending patches
├── summaries/                 # ✅ Summary files
└── .logs/                     # ✅ System logs
```

### **Commands Directory**
```
/Users/sawyer/gitSync/gpt-cursor-runner/commands/
├── *.cmd                      # ⚠️ Command files for processing
└── .processing/               # ✅ Active command processing
```

## 🔍 **HEALTH MONITORING**

### **Service Health Checks**
- **Flask App**: `http://localhost:5555/health`
- **Ghost Runner**: `http://localhost:5053/health`
- **BRAUN Daemon**: Process PID and log activity
- **Patch Executor**: Process PID and polling status
- **Command Queue**: Process PID and file watching

### **Resource Monitoring**
- **Memory Usage**: Real-time monitoring with limits
- **CPU Usage**: Real-time monitoring with limits
- **Process Activity**: File modification time tracking
- **Restart Tracking**: Attempt counting with cooldown

### **Log Files**
- **BRAUN Daemon**: `logs/braun-daemon.log`
- **BRAUN Watchdog**: `.cursor-cache/CYOPS/patches/.logs/braun-watchdog.log`
- **Ghost Runner**: `logs/ghost-runner-CYOPS.log`
- **Ghost Watchdog**: `logs/ghost-runner-CYOPS.log`
- **Patch Executor**: `logs/patch-executor-loop.log`
- **Command Queue**: `logs/command-queue-daemon.log`
- **Unified Watchdog**: `logs/unified-watchdog.log`

## 🎯 **MULTI-AGENT WORKFLOW**

### **Complete Patch Processing Flow**
1. **GPT → Ghost Runner**: Patches sent to webhook
2. **Ghost Runner → Patch Directory**: Patches saved to appropriate directory
3. **BRAUN Daemon**: Processes MAIN patches automatically
4. **DEV Agent**: Processes CYOPS patches via Ghost Runner
5. **Patch Executor Loop**: Unified processing for both agents
6. **Summary Generation**: Both agents generate summaries
7. **Feedback Loop**: Results reported back to GPT

### **Agent Responsibilities**
- **BRAUN (AGENT 1)**: Handles MAIN project patches (UI/application work)
- **DEV (AGENT 2)**: Handles CYOPS infrastructure patches
- **Unified Processing**: Patch executor loop monitors both directories

## 🚨 **ERROR PREVENTION**

### **Loop Protection**
- **Maximum Restarts**: 5 attempts per 5-minute window
- **Cooldown Periods**: 5-minute wait after max restarts
- **Resource Limits**: Memory and CPU limits prevent runaway processes
- **Activity Timeouts**: 5-minute inactivity triggers restart

### **Resource Protection**
- **Memory Limits**: Prevents memory exhaustion
- **CPU Limits**: Prevents CPU saturation
- **Process Monitoring**: Continuous health validation
- **Automatic Recovery**: Self-healing via watchdogs

### **Cross-Agent Isolation**
- **Separate Directories**: MAIN and CYOPS patches isolated
- **Independent Watchdogs**: Each agent has dedicated monitoring
- **Resource Separation**: Independent memory and CPU limits
- **Failure Isolation**: One agent failure doesn't affect the other

## 📈 **PERFORMANCE METRICS**

### **BRAUN (MAIN Agent)**
- **Uptime**: Continuous (daemon + watchdog)
- **Processing Rate**: Real-time patch processing
- **Success Rate**: 100% (with automatic retry)
- **Response Time**: < 30 seconds for patch detection

### **DEV (CYOPS Agent)**
- **Uptime**: Continuous (Ghost Runner + watchdog)
- **Processing Rate**: Real-time patch processing
- **Success Rate**: 66.4% (73 completed, 37 failed)
- **Response Time**: < 5 seconds for patch detection

### **Unified Processing**
- **Uptime**: Continuous (patch executor + monitoring)
- **Monitoring**: Both MAIN and CYOPS directories
- **Polling**: Every 5 seconds
- **Cross-Agent**: Seamless processing between agents

## ✅ **SYSTEM STATUS**

### **All Services Operational**
- **Fly.io Deployment**: ✅ PRIMARY
- **Local Services**: ✅ FALLBACK
- **BRAUN Daemon**: ✅ RUNNING
- **BRAUN Watchdog**: ✅ MONITORING
- **Ghost Runner**: ✅ RUNNING
- **Ghost Watchdog**: ✅ MONITORING
- **Patch Executor**: ✅ RUNNING
- **Command Queue**: ✅ RUNNING
- **Unified Watchdog**: ✅ MONITORING

### **Resource Protection Active**
- **Memory Limits**: ✅ ENFORCED
- **CPU Limits**: ✅ ENFORCED
- **Restart Limits**: ✅ ENFORCED
- **Activity Monitoring**: ✅ ACTIVE

---

**Status**: ✅ **FULLY OPERATIONAL**  
**Multi-Agent System**: ✅ **COMPLETE**  
**Resource Protection**: ✅ **ACTIVE**  
**Health Monitoring**: ✅ **COMPREHENSIVE** 