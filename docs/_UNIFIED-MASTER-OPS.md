## 🟩 **CYOPS-GPT Unified Ops: AIO Reference & Checklist**

---

### **System Management Shortcuts**

- **Boot:** `./scripts/core/unified-boot.sh`
- **Shutdown:** `./scripts/core/unified-shutdown.sh`
- **Restart:** `./scripts/core/unified-reboot.sh`
- **Test (All):** `./scripts/core/unified-test.sh`
- **Check Status:** `./scripts/core/unified-status.sh`
- **Manager Shell:** `./scripts/core/unified-manager.sh [start|stop|restart|monitor|recover|list]`
  - Uses canonical PM2 ecosystem at `/Users/sawyer/gitSync/gpt-cursor-runner/config/ecosystem.config.js` (root file archived)

---

### **Critical PM2 & Python Processes**

- **PM2 (14/14 online):**
  - alert-engine-daemon
  - autonomous-decision-daemon
  - dashboard-uplink
  - dual-monitor
  - enhanced-doc-daemon
  - flask-dashboard (port 8787)
  - ghost-bridge (port 5051)
  - ghost-relay
  - ghost-runner
  - ghost-viewer
  - metrics-aggregator-daemon
  - patch-executor
  - summary-monitor
  - telemetry-orchestrator (port 8789)

- **Python Daemons:**
  - patch_executor_daemon.py
  - braun_daemon.py
  - summary_watcher_daemon.py
  - dashboard_daemon.py

---

### **CRITICAL Ports & Public Access**

- **Active Ports:** 8787 (Flask UI), 8788 (Telemetry API), 8789 (Telemetry Orchestrator), 8081 (Expo/Metro)
- **Dashboard:** [gpt-cursor-runner.thoughtmarks.app/monitor](https://gpt-cursor-runner.thoughtmarks.app/monitor)
- **API Status:** `/api/status`
- **Daemon Status:** `/api/daemon-status`
- **Telemetry:** `/api/telemetry`

---

### **Cloudflare Tunnels** \*.THOUGHTMARKS.APP

- dev-thoughtmarks
- expo-thoughtmarks
- ghost-thoughtmarks
- gpt-cursor-runner (public)
- gpt-liveFile
- health-thoughtmarks
- webhook-thoughtmarks

---

### **Unified Logging System**

- **All service logs:** `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`
- **Service logs are auto-rotated, auto-refreshed, and unified for all dashboard APIs.**

---

### **Expected Daemons & Watchdogs (Minimal List)**

- **Daemons:** alert-engine-daemon, autonomous-decision-daemon, dashboard-uplink, dual-monitor, enhanced-doc-daemon, flask-dashboard, ghost-bridge, ghost-relay, ghost-runner, ghost-viewer, metrics-aggregator-daemon, patch-executor, summary-monitor, telemetry-orchestrator
- **Watchdogs:** patch-executor-watchdog.sh, summary-watcher-watchdog.sh, dual-monitor-watchdog.sh, and similar for each daemon
- **Tunnels:** Cloudflare endpoints above, Fly.io as appropriate

---

### **Validation & Health Checklist**

- [ ] All 14 PM2-managed services **online** (`pm2 list`)
- [ ] All Python daemons **running** (check with `ps aux | grep daemon`)
- [ ] **Dashboard API** endpoints return healthy status for all daemons
- [ ] **Cloudflare tunnels** show “active” in dashboard/tunnel list
- [ ] **Unified logging**: logs exist and update for each service
- [ ] **No critical process in “stopped” or “errored” state** (PM2 or dashboard)
- [ ] **Dashboard UI**: All panels green, service logs display correctly, live agent health/queue shown
- [ ] **Service logs** auto-refresh, wrap, and display latest output without overflow

---

### **Critical Recommendations**

- **Always use unified-manager.sh for orchestration and monitoring.**
- **After any manual service change, run `pm2 save`.**
- **If dashboard/monitor panels show yellow/red:**
  - Check daemon health in PM2 and Python processes
  - Verify logs at `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`
  - Confirm tunnels and ports are up, no conflicts or port kills pending

- **Keep log rotation scripts and watchdogs active.**
- **Update unified-manager.sh when adding/removing any critical service.**

---

**This is the authoritative, minimal reference for production validation and troubleshooting. Use this to check, audit, and recover full system health in a single scan.**

## 🟢 **CYOPS Unified System Management — AIO Checklist**

---

### **A. Core System Management Commands**

```sh
# Start All Systems
./scripts/core/unified-boot.sh

# Stop All Systems
./scripts/core/unified-shutdown.sh

# Restart All Systems
./scripts/core/unified-reboot.sh

# Test All Systems (Comprehensive)
./scripts/core/unified-test.sh

# Check System Status (Quick)
./scripts/core/unified-status.sh

# Central Unified Manager (Recommended for All Operations)
./scripts/core/unified-manager.sh start      # Start all services
./scripts/core/unified-manager.sh stop       # Stop all services
./scripts/core/unified-manager.sh restart    # Restart all services
./scripts/core/unified-manager.sh monitor    # Monitor all services
./scripts/core/unified-manager.sh recover    # Auto-recover failed services
./scripts/core/unified-manager.sh list       # List all managed services

# Per-Service
./scripts/core/unified-manager.sh start-service <service>
./scripts/core/unified-manager.sh health <service>
```

---

### **B. Process & Service Health — MUST BE RUNNING**

#### **PM2 Managed (Node.js):**

- alert-engine-daemon
- autonomous-decision-daemon
- dashboard-uplink
- dual-monitor
- enhanced-doc-daemon
- flask-dashboard (port 8787)
- ghost-bridge (port 5051)
- ghost-relay
- ghost-runner
- ghost-viewer
- metrics-aggregator-daemon
- patch-executor
- summary-monitor
- telemetry-orchestrator (port 8789)

#### **Python Daemons:**

- patch_executor_daemon.py
- braun_daemon.py
- summary_watcher_daemon.py
- dashboard_daemon.py

---

### **C. Critical Ports & Endpoints**

- **5051:** Python Ghost Runner (Slack commands and webhooks)
- **5555:** NOT USED (reserved for future use)
- **8787:** Flask Dashboard (Monitor dashboard)
- **8788:** Telemetry API (Node.js) - Internal service
- **8789:** Telemetry Orchestrator (Node.js) - PM2 managed
- **8081:** Expo/Metro (Node.js) - Development server
- **4000:** MAIN Backend API - tm-mobile-cursor project
- **3001:** Ghost Relay (Node.js) - Internal relay service

### **D. Tunnel & Network Validation**

- Cloudflare tunnels (7 total, all active):
  - **gpt-cursor-runner.thoughtmarks.app** → Primary: `https://gpt-cursor-runner.fly.dev`; Fallback: `http://localhost:8787` (Flask Dashboard)
  - **slack.thoughtmarks.app** → `http://localhost:5051` (Python Ghost Runner - Slack commands)
  - **webhook-thoughtmarks.thoughtmarks.app** → Internal webhook service
  - **ghost-thoughtmarks.thoughtmarks.app** → Internal ghost service
  - **dev-thoughtmarks** → Development services
  - **expo-thoughtmarks.thoughtmarks.app** → `http://localhost:8081` (Expo fallback)
  - **gpt-liveFile** → Live file service
  - **health-thoughtmarks** → Health monitoring service

### **E. Expo Development Ports**

- **8081:** Expo/Metro (Node.js) - Primary development server
- **ngrok:** Static URL - Primary tunnel for development
- **expo-thoughtmarks.thoughtmarks.app:** Cloudflare tunnel fallback for Expo

---

### **E. Unified Logging System**

- **Unified Log Root:** `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`
  - All service, daemon, and watchdog logs are migrated and consolidated here.
  - Dashboard log API reads from this root.
  - All legacy logs/PM2 logs/watcher logs point here.

#### **Log Producers (examples):**

- flask-dashboard.log, ghost-runner.log, ghost-bridge.log, ghost-relay.log, ghost-viewer.log, enhanced-doc-daemon.log, summary-monitor.log, dual-monitor.log, dashboard-uplink.log, telemetry-orchestrator.log, metrics-aggregator-daemon.log, alert-engine-daemon.log, patch-executor.log, autonomous-decision-daemon.log, ngrok-tunnel.log
- MAIN Backend API: `tm-mobile-cursor/mobile-native-fresh/backend/logs/app.log`
- Expo Dev/Web: `tm-mobile-native-fresh/logs/`

---

### **F. Full Health Validation**

**Required:**

- All PM2 processes: **Online** (zero restarts, except as expected)
- All critical ports: **Listening**
- All API endpoints: **HTTP 200 + correct JSON**
  - `/api/status`, `/api/daemon-status`, `/api/telemetry`

- Dashboard `/monitor`: **All green panels** (no “unknown”, “warning”, or “error”)
- All Cloudflare tunnels: **Active/Connected**
- Unified logs: **Visible, wrapped, no overflow, auto-refresh in UI**
- Dual-agent panels (CYOPS/MAIN) **showing queue, patch, exec, summary, status**

---

### **G. Watchdogs & Patch Systems**

- All 14 watchdog scripts present, logging to unified root
- Patch delivery, summary watcher, and execution history: visible in dashboard

---

### **H. Daily Quick Audit One-Liner**

```sh
pm2 list && \
lsof -i -P | grep LISTEN | grep -E "(5051|8787|8788|8789|4000|8081|5555)" && \
cloudflared tunnel list && \
ps aux | grep -E "(python|flask)" | grep -v grep && \
ps aux | grep "flask-dashboard" | grep -v grep && \
curl -s https://gpt-cursor-runner.thoughtmarks.app/api/status | jq '.process_health' && \
curl -s https://gpt-cursor-runner.thoughtmarks.app/api/daemon-status | jq '.'
```

---

### **I. Summary Table**

Absolutely! Here’s a **succinct bulleted list** for the summary table portion—just the essentials for system/service verification:

---

### **Critical Services/Daemons Checklist**

- **flask-dashboard** (dashboard/app.py, port 8787)
- **ghost-runner** (scripts/core/ghost-runner.js)
- **ghost-bridge** (scripts/core/ghost-bridge.js, port 5051)
- **ghost-relay** (scripts/ghost/ghost-relay.js)
- **ghost-viewer** (scripts/ghost/ghost-viewer.js)
- **enhanced-doc-daemon** (scripts/daemons/enhanced-doc-daemon.js)
- **metrics-aggregator-daemon** (scripts/daemons/metrics-aggregator-daemon.js)
- **alert-engine-daemon** (scripts/daemons/alert-engine-daemon.js)
- **autonomous-decision-daemon** (scripts/daemons/autonomous-decision-daemon.js)
- **telemetry-orchestrator-daemon** (scripts/daemons/telemetry-orchestrator-daemon.js, port 8789)
- **dashboard-uplink** (scripts/watchdogs/dashboard-uplink.js)
- **patch-executor** (Node or Python: scripts/daemons/patch_executor_daemon.py)
- **summary-monitor** (scripts/daemons/summary_watcher_daemon.py)
- **braun-daemon** (scripts/daemons/braun_daemon.py)
- **dual-monitor** (scripts/monitor/dual-monitor-server.js)
- **doc-daemon** (scripts/daemons/doc-daemon.js)
- **dashboard-daemon** (scripts/daemons/dashboard_daemon.py)
  - **Webhook API** (Flask, port 5555) [reserved, currently not used]
- **Status server** (server/status-server.js, port 3222)
- **Express server** (server/index.js, port 5052)
- **gpt_cursor_runner** (gpt_cursor_runner/main.py, port 5051)

---

**Every entry above must be running for a fully healthy, “all green” system!**
Use this as a daily or pre-release “all critical online” checklist.

---

### **J. Recovery / Troubleshooting**

- Use unified-manager for all recovery (`start`, `restart`, `recover`)
- Investigate logs in `.cursor-cache/ROOT/.logs/` for any failed service
- If dashboard not green: check `pm2 list`, unified-status, all tunnels, all logs

---

**This is your definitive, daily-use system reference.**
Everything in the above list must pass for a healthy, “all green” system!
**Print this. Paste this. Pin this. Every engineer, SRE, and AI agent uses this as the source of truth.**

---

## 🟡 **GHOST-BRIDGE CYOPS Summary - 2025-08-09**

### **Issue Resolved: Ghost-Bridge Flapping & IndentationError**

**Problem:** The `ghost-bridge` system was experiencing instability due to:

- `IndentationError` in `publish_github.py` causing executor crashes
- `.retries.json` file constantly flipping in git repository due to incorrect staging
- Git operations blocking on unstaged changes during pull/rebase

**Root Causes:**

1. Python indentation break in `publish_github.py` line 34
2. `publish_github.py` was staging the entire `commands/` directory including `.retries.json`
3. Git pull operations failing due to unstaged changes blocking rebase

**Fixes Applied:**

1. **Fixed `publish_github.py`:**
   - Corrected Python indentation error
   - Restricted git staging to safe directories only: `context`, `results`, `diffs`, `summaries`, `logs`, `archive`, `dead_letter`, `meta`
   - Explicitly excluded `commands/` directory from staging
   - Added `rebase.autoStash = true` to prevent blocking on unstaged changes

2. **Enhanced `executor.py`:**
   - Added startup path logging for debugging
   - Modified command scanning to ignore dotfiles and `.retries.json`
   - Ensured retries index only uses `meta/retries.json`
   - Added validation plan skip logic for empty plans

3. **PM2 Configuration:**
   - Set correct `cwd: "/Users/sawyer/gitSync/ghost-bridge"`
   - Configured environment variables: `CLOUD`, `GPT_BRIDGE_HMAC_SECRET`
   - Single executor process management

4. **Git Guardrails:**
   - Verified `.gitignore` rule for `commands/.retries.json`
   - Added pre-commit hook to prevent accidental staging of retries file
   - Ensured retries state only exists in `meta/retries.json`

**Validation Results:**

- ✅ No more IndentationError crashes
- ✅ No more `commands/.retries.json` git churn
- ✅ Clean no-op command processing with exit=0
- ✅ Proper git staging and commit flow
- ✅ Executor startup paths correctly resolved
- ✅ PM2 environment variables properly set

**Files Modified:**

- `/Users/sawyer/gitSync/ghost-bridge/publish_github.py` - Fixed indentation, restricted staging
- `/Users/sawyer/gitSync/ghost-bridge/executor.py` - Enhanced path handling, dotfile filtering
- `/Users/sawyer/gitSync/ghost-bridge/ecosystem.gpt-bridge.config.js` - PM2 configuration
- `/Users/sawyer/gitSync/ghost-bridge/_GPTsync/.git/hooks/pre-commit` - Git guardrail

**Current Status:** Ghost-bridge system is stable and processing commands correctly. No more flapping or git churn observed.

**Maintenance Notes:**

- Monitor PM2 logs: `pm2 logs gpt-executor -f`
- Check executor health: `pm2 status gpt-executor`
- Verify git staging: `git status` in `_GPTsync` repo
- All retries state properly managed in `meta/retries.json`

---
