# Watchdog System Documentation

**Last Updated**: Wed Jul 30 16:40:00 PDT 2025  
**Status**: ✅ **COMPREHENSIVE WATCHDOG SYSTEM IMPLEMENTED**  
**Purpose**: Automated monitoring and recovery for all critical system components

## 🎯 **Overview**

The Watchdog System provides automated monitoring, health checking, and recovery for all critical components of the GPT Cursor Runner system. It ensures high availability and automatic recovery from failures.

## 🛡️ **Watchdog Components**

### **Critical Infrastructure Watchdogs**

#### **1. Tunnel Watchdog** (`scripts/watchdogs/tunnel-watchdog.sh`)

- **Purpose**: Monitors and restarts Cloudflare tunnels
- **Critical Level**: 🔴 **CRITICAL** - External access depends on this
- **Monitoring**: Every 60 seconds
- **Health Check**: External access to `https://gpt-cursor-runner.thoughtmarks.app/api/status`
- **Recovery**: Restarts `cloudflared tunnel --config config/tunnel-config.yml run gpt-cursor-runner`
- **Logs**: `logs/tunnel-watchdog.log`

#### **2. Fly.io Watchdog** (`scripts/watchdogs/fly-watchdog.sh`)

- **Purpose**: Monitors and restarts Fly.io deployments
- **Critical Level**: 🔴 **CRITICAL** - Primary deployment depends on this
- **Monitoring**: Every 120 seconds (2 minutes)
- **Health Check**: `https://gpt-cursor-runner.fly.dev/health` and webhook endpoint
- **Recovery**: `fly deploy --remote-only` or `fly apps restart gpt-cursor-runner`
- **Logs**: `logs/fly-watchdog.log`

#### **3. Flask Watchdog** (`scripts/watchdogs/flask-watchdog.sh`)

- **Purpose**: Monitors and restarts Flask applications
- **Critical Level**: 🔴 **CRITICAL** - Webhook and API endpoints depend on this
- **Monitoring**: Every 60 seconds
- **Health Check**: `http://localhost:5051/health` (Python Ghost Runner) and `http://localhost:8787/monitor` (Flask Dashboard)
- **Recovery**: Restarts `python3 dashboard/app.py` (port 8787) and Python Ghost Runner (port 5051)
- **Logs**: `logs/flask-watchdog.log`

### **Core System Watchdogs**

#### **4. Patch Executor Watchdog** (`scripts/watchdogs/patch-executor-watchdog.sh`)

- **Purpose**: Monitors and restarts the patch execution system
- **Critical Level**: 🔴 **CRITICAL** - Patch processing depends on this
- **Monitoring**: Every 30 seconds
- **Health Check**: Process running and recent activity in logs
- **Recovery**: Restarts `node scripts/patch-executor-loop.js`
- **Logs**: `logs/patch-executor-watchdog.log`

#### **5. BRAUN Daemon Watchdog** (`scripts/watchdogs/braun-daemon-watchdog.sh`)

- **Purpose**: Monitors and restarts the BRAUN daemon
- **Critical Level**: 🟡 **HIGH** - MAIN system processing depends on this
- **Monitoring**: Every 60 seconds
- **Health Check**: Process running and responding to health checks
- **Recovery**: Restarts `python3 scripts/braun_daemon.py`
- **Logs**: `logs/braun-watchdog.log`

#### **6. Ghost Runner Watchdog** (`scripts/watchdogs/ghost-runner-watchdog.sh`)

- **Purpose**: Monitors and restarts the Ghost Runner service
- **Critical Level**: 🟡 **HIGH** - Ghost processing depends on this
- **Monitoring**: Every 60 seconds
- **Health Check**: `http://localhost:5053/health`
- **Recovery**: Restarts `node scripts/ghost-runner.js`
- **Logs**: `logs/ghost-runner-watchdog.log`

### **Dashboard & Monitoring Watchdogs**

#### **7. Dashboard Uplink Watchdog** (`scripts/watchdogs/dashboard-uplink-watchdog.sh`)

- **Purpose**: Monitors and restarts dashboard uplink service
- **Critical Level**: 🟢 **MEDIUM** - Dashboard metrics depend on this
- **Monitoring**: Every 60 seconds
- **Health Check**: Process running and recent heartbeat activity
- **Recovery**: Restarts `node scripts/watchdogs/dashboard-uplink.js`
- **Logs**: `logs/dashboard-uplink-watchdog.log`

#### **8. Summary Watcher Watchdog** (`scripts/watchdogs/summary-watcher-watchdog.sh`)

- **Purpose**: Monitors and restarts summary watcher service
- **Critical Level**: 🟢 **MEDIUM** - Summary posting to ChatGPT depends on this
- **Monitoring**: Every 30 seconds
- **Health Check**: Process running
- **Recovery**: Restarts `node scripts/watchdogs/summary-watcher.js`
- **Logs**: `logs/summary-watcher-watchdog.log`

## 🔧 **Technical Implementation**

### **Common Watchdog Features**

All watchdogs implement the following features:

#### **Process Management**

```bash
# Proper Node.js/Python process handling
{ nohup node/python3 script.js/py >> logs/script.log 2>&1 & } >/dev/null 2>&1 & disown

# PID file management
echo $$ > "$PID_FILE"

# Process detection
pgrep -f "process_pattern" >/dev/null 2>&1
```

#### **Health Checking**

```bash
# HTTP endpoint health checks
curl -s --max-time 10 "http://localhost:port/health" | grep -q "ok"

# Log activity validation
tail -n 50 logfile.log | grep -c "activity_pattern"

# Process activity monitoring
ps -p $(cat pidfile.pid) > /dev/null 2>&1
```

#### **Recovery Logic**

```bash
# Stop existing process
pkill -f "process_pattern" 2>/dev/null || true
sleep 2

# Start new process
start_process_function

# Validate restart
if is_running && is_healthy; then
    log "✅ Process restarted successfully"
else
    log "❌ Process restart failed"
fi
```

#### **Error Handling**

```bash
# Graceful cleanup on exit
cleanup() {
    log "🛑 Watchdog stopping..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT
```

### **Monitoring Intervals**

| Watchdog         | Interval | Reason                                   |
| ---------------- | -------- | ---------------------------------------- |
| Patch Executor   | 30s      | Critical service, needs fast recovery    |
| Summary Watcher  | 30s      | Critical for ChatGPT integration         |
| Tunnel           | 60s      | External access, moderate recovery time  |
| Flask            | 60s      | Webhook service, moderate recovery time  |
| BRAUN Daemon     | 60s      | MAIN processing, moderate recovery time  |
| Ghost Runner     | 60s      | Ghost processing, moderate recovery time |
| Dashboard Uplink | 60s      | Metrics service, moderate recovery time  |
| Fly.io           | 120s     | Cloud deployment, longer recovery time   |

## 🚀 **Unified Boot Integration**

### **Boot Process**

The unified ghost boot script (`scripts/unified-ghost-boot.sh`) integrates all watchdogs:

1. **Cleanup Phase**

   ```bash
   # Kill existing processes
   pkill -f "watchdog-pattern" 2>/dev/null || true

   # Clean PID files
   rm -f pids/*.pid
   ```

2. **Core Services Startup**

   ```bash
   # Start core services (Flask, Ghost Runner, etc.)
   nohup service-command >> logs/service.log 2>&1 &
   echo $! > pids/service.pid
   ```

3. **Watchdog Startup**

   ```bash
   # Start all watchdogs
   nohup bash scripts/watchdogs/watchdog.sh >> logs/watchdog.log 2>&1 &
   echo $! > pids/watchdog.pid
   ```

4. **Health Validation**
   ```bash
   # Validate all services and watchdogs are running
   if ps -p $(cat pids/watchdog.pid) > /dev/null 2>&1; then
     echo "✅ Watchdog running"
   else
     echo "❌ Watchdog not running"
   fi
   ```

### **Boot Order**

1. **Infrastructure First**: Tunnel, Fly.io, Flask
2. **Core Services**: Patch Executor, BRAUN, Ghost Runner
3. **Monitoring**: Dashboard Uplink, Summary Watcher
4. **Watchdogs**: All watchdogs started simultaneously
5. **Validation**: Comprehensive health checks

## 📊 **Monitoring & Logging**

### **Log Locations**

All watchdog logs are stored in `/Users/sawyer/gitSync/gpt-cursor-runner/logs/`:

```
logs/
├── tunnel-watchdog.log          # Cloudflare tunnel monitoring
├── fly-watchdog.log            # Fly.io deployment monitoring
├── flask-watchdog.log          # Flask application monitoring
├── patch-executor-watchdog.log # Patch execution monitoring
├── braun-watchdog.log          # BRAUN daemon monitoring
├── ghost-runner-watchdog.log   # Ghost runner monitoring
├── dashboard-uplink-watchdog.log # Dashboard uplink monitoring
└── summary-watcher-watchdog.log # Summary watcher monitoring
```

### **Log Format**

All watchdog logs follow a consistent format:

```
[2025-07-30 16:40:00] 🚀 Watchdog starting...
[2025-07-30 16:40:05] ✅ Service already running
[2025-07-30 16:40:05] ✅ Service healthy
[2025-07-30 16:41:05] ✅ Service healthy
[2025-07-30 16:42:05] ⚠️ Service not healthy, restarting...
[2025-07-30 16:42:20] ✅ Service restarted successfully
```

### **Health Check Indicators**

#### **✅ Healthy Indicators**

- Process running (`pgrep` returns PID)
- HTTP endpoints responding (200 status)
- Recent log activity (within last 5 minutes)
- No error patterns in logs

#### **⚠️ Unhealthy Indicators**

- Process not running
- HTTP endpoints not responding
- No recent log activity
- Error patterns in logs
- Port conflicts

## 🔒 **Reliability Features**

### **Fault Tolerance**

#### **Auto-Restart Logic**

- **Immediate Detection**: Process failures detected within monitoring interval
- **Graceful Restart**: Proper cleanup before restart
- **Validation**: Health checks after restart
- **Backoff**: Longer wait times after failed restarts

#### **Resource Protection**

- **Memory Limits**: 512MB per daemon process
- **CPU Limits**: 80% per daemon process
- **Restart Limits**: 5 attempts per 5 minutes (except critical services)
- **Activity Monitoring**: 5-minute timeout for inactivity

#### **Critical Service Protection**

- **Patch Executor**: Unlimited restarts (critical service)
- **Tunnel**: Unlimited restarts (external access critical)
- **Fly.io**: Unlimited restarts (primary deployment critical)
- **Flask**: Unlimited restarts (webhook critical)

### **Error Prevention**

#### **Port Conflict Resolution**

```bash
# Check and kill processes using required ports
lsof -ti:5555 | xargs kill -9 2>/dev/null || true
lsof -ti:5053 | xargs kill -9 2>/dev/null || true
```

#### **Dependency Checking**

```bash
# Check required tools and packages
command -v node &> /dev/null
command -v python3 &> /dev/null
python3 -c "import flask" 2>/dev/null
```

#### **Environment Validation**

```bash
# Validate environment variables
if [ -z "$OPENAI_API_KEY" ]; then
    log "❌ OpenAI API key not set"
    exit 1
fi
```

## 🎯 **Operational Procedures**

### **Starting the System**

```bash
# Start unified system with all watchdogs
bash scripts/unified-ghost-boot.sh
```

### **Monitoring the System**

```bash
# Check all watchdog status
ps aux | grep -E "(watchdog|daemon)" | grep -v grep

# Check watchdog logs
tail -f logs/*-watchdog.log

# Check service health
curl -s http://localhost:5555/health
curl -s http://localhost:5053/health
```

### **Troubleshooting**

#### **Watchdog Not Starting**

1. Check if script is executable: `chmod +x scripts/watchdogs/watchdog.sh`
2. Check dependencies: `command -v required_tool`
3. Check environment variables: `echo $REQUIRED_VAR`
4. Check logs: `tail -f logs/watchdog.log`

#### **Service Not Restarting**

1. Check process detection: `pgrep -f "process_pattern"`
2. Check health validation: `curl -s health_endpoint`
3. Check log activity: `tail -n 50 service.log`
4. Check port conflicts: `lsof -i :port`

#### **High Restart Frequency**

1. Check resource usage: `ps aux | grep process`
2. Check error patterns: `grep -i error logs/service.log`
3. Check dependencies: Validate all required services
4. Check configuration: Validate config files

### **Maintenance**

#### **Log Rotation**

```bash
# Rotate logs when they get large
find logs/ -name "*-watchdog.log" -size +100M -exec mv {} {}.old \;
```

#### **Watchdog Updates**

```bash
# Restart specific watchdog
pkill -f "specific-watchdog.sh"
nohup bash scripts/watchdogs/specific-watchdog.sh >> logs/specific-watchdog.log 2>&1 &
```

#### **System Updates**

```bash
# Full system restart
bash scripts/unified-ghost-boot.sh
```

## 📈 **Performance Metrics**

### **Monitoring Metrics**

- **Uptime**: Service availability percentage
- **Restart Frequency**: Number of restarts per hour
- **Recovery Time**: Time from failure to recovery
- **Resource Usage**: CPU and memory usage per service
- **Error Rate**: Number of errors per service

### **Alerting**

- **Critical Services**: Immediate alert on failure
- **High Restart Rate**: Alert if >5 restarts per hour
- **Resource Exhaustion**: Alert if >80% CPU/memory usage
- **External Access**: Alert if tunnel/Fly.io unavailable

## 🔮 **Future Enhancements**

### **Planned Improvements**

1. **Centralized Monitoring**: Single dashboard for all watchdog status
2. **Predictive Restarts**: Restart services before they fail
3. **Load Balancing**: Distribute load across multiple instances
4. **Metrics Collection**: Collect and analyze performance metrics
5. **Automated Scaling**: Scale services based on load

### **Integration Opportunities**

1. **Slack Notifications**: Alert on critical failures
2. **Email Alerts**: Daily status reports
3. **PagerDuty Integration**: Escalate critical issues
4. **Grafana Dashboards**: Real-time monitoring visualization

---

**Status**: ✅ **COMPREHENSIVE WATCHDOG SYSTEM IMPLEMENTED**  
**Reliability**: **High availability with automatic recovery**  
**Monitoring**: **Continuous health checking and alerting**  
**Integration**: **Fully integrated with unified boot system**
