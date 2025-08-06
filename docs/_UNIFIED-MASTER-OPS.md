## 🟩 **CYOPS-GPT Unified Ops: AIO Reference & Checklist**

---

### **System Management Shortcuts**

* **Boot:** `./scripts/core/unified-boot.sh`
* **Shutdown:** `./scripts/core/unified-shutdown.sh`
* **Restart:** `./scripts/core/unified-reboot.sh`
* **Test (All):** `./scripts/core/unified-test.sh`
* **Check Status:** `./scripts/core/unified-status.sh`
* **Manager Shell:** `./scripts/core/unified-manager.sh [start|stop|restart|monitor|recover|list]`

---

### **Critical PM2 & Python Processes**

* **PM2 (14/14 online):**

  * alert-engine-daemon
  * autonomous-decision-daemon
  * dashboard-uplink
  * dual-monitor
  * enhanced-doc-daemon
  * flask-dashboard (port 8787)
  * ghost-bridge (port 5051)
  * ghost-relay
  * ghost-runner
  * ghost-viewer
  * metrics-aggregator-daemon
  * patch-executor
  * summary-monitor
  * telemetry-orchestrator (port 8789)
* **Python Daemons:**

  * patch\_executor\_daemon.py
  * braun\_daemon.py
  * summary\_watcher\_daemon.py
  * dashboard\_daemon.py

---

### **Ports & Public Access**

* **Active Ports:** 8787 (Flask UI), 8788 (Telemetry API), 8789 (Telemetry Orchestrator), 8081 (Expo/Metro)
* **Dashboard:** [gpt-cursor-runner.thoughtmarks.app/monitor](https://gpt-cursor-runner.thoughtmarks.app/monitor)
* **API Status:** `/api/status`
* **Daemon Status:** `/api/daemon-status`
* **Telemetry:** `/api/telemetry`

---

### **Cloudflare Tunnels**

* dev-thoughtmarks
* expo-thoughtmarks
* ghost-thoughtmarks
* gpt-cursor-runner (public)
* gpt-liveFile
* health-thoughtmarks
* webhook-thoughtmarks

---

### **Unified Logging System**

* **All service logs:** `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`
* **Service logs are auto-rotated, auto-refreshed, and unified for all dashboard APIs.**

---

### **Expected Daemons & Watchdogs (Minimal List)**

* **Daemons:** alert-engine-daemon, autonomous-decision-daemon, dashboard-uplink, dual-monitor, enhanced-doc-daemon, flask-dashboard, ghost-bridge, ghost-relay, ghost-runner, ghost-viewer, metrics-aggregator-daemon, patch-executor, summary-monitor, telemetry-orchestrator
* **Watchdogs:** patch-executor-watchdog.sh, summary-watcher-watchdog.sh, dual-monitor-watchdog.sh, and similar for each daemon
* **Tunnels:** Cloudflare endpoints above, Fly.io as appropriate

---

### **Validation & Health Checklist**

* [ ] All 14 PM2-managed services **online** (`pm2 list`)
* [ ] All Python daemons **running** (check with `ps aux | grep daemon`)
* [ ] **Dashboard API** endpoints return healthy status for all daemons
* [ ] **Cloudflare tunnels** show “active” in dashboard/tunnel list
* [ ] **Unified logging**: logs exist and update for each service
* [ ] **No critical process in “stopped” or “errored” state** (PM2 or dashboard)
* [ ] **Dashboard UI**: All panels green, service logs display correctly, live agent health/queue shown
* [ ] **Service logs** auto-refresh, wrap, and display latest output without overflow

---

### **Critical Recommendations**

* **Always use unified-manager.sh for orchestration and monitoring.**
* **After any manual service change, run `pm2 save`.**
* **If dashboard/monitor panels show yellow/red:**

  * Check daemon health in PM2 and Python processes
  * Verify logs at `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`
  * Confirm tunnels and ports are up, no conflicts or port kills pending
* **Keep log rotation scripts and watchdogs active.**
* **Update unified-manager.sh when adding/removing any critical service.**

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

* alert-engine-daemon
* autonomous-decision-daemon
* dashboard-uplink
* dual-monitor
* enhanced-doc-daemon
* flask-dashboard (port 8787)
* ghost-bridge (port 5051)
* ghost-relay
* ghost-runner
* ghost-viewer
* metrics-aggregator-daemon
* patch-executor
* summary-monitor
* telemetry-orchestrator (port 8789)

#### **Python Daemons:**

* patch\_executor\_daemon.py
* braun\_daemon.py
* summary\_watcher\_daemon.py
* dashboard\_daemon.py

---

### **C. Critical Ports & Endpoints**

* **8787:** Flask Dashboard (Python, Public)
* **8788:** Telemetry API (Node.js)
* **8789:** Telemetry Orchestrator (Node.js)
* **8081:** Expo/Metro (Node.js)
* **4000:** MAIN Backend API

---

### **D. Tunnel & Network Validation**

* Cloudflare tunnels (7 total, all active):

  * gpt-cursor-runner.thoughtmarks.app (Dashboard)
  * webhook-thoughtmarks.thoughtmarks.app
  * ghost-thoughtmarks.thoughtmarks.app
  * dev-thoughtmarks
  * expo-thoughtmarks
  * gpt-liveFile
  * health-thoughtmarks

---

### **E. Unified Logging System**

* **Unified Log Root:** `/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/`

  * All service, daemon, and watchdog logs are migrated and consolidated here.
  * Dashboard log API reads from this root.
  * All legacy logs/PM2 logs/watcher logs point here.

#### **Log Producers (examples):**

* flask-dashboard.log, ghost-runner.log, ghost-bridge.log, ghost-relay.log, ghost-viewer.log, enhanced-doc-daemon.log, summary-monitor.log, dual-monitor.log, dashboard-uplink.log, telemetry-orchestrator.log, metrics-aggregator-daemon.log, alert-engine-daemon.log, patch-executor.log, autonomous-decision-daemon.log, ngrok-tunnel.log
* MAIN Backend API: `tm-mobile-cursor/mobile-native-fresh/backend/logs/app.log`
* Expo Dev/Web: `tm-mobile-cursor/mobile-native-fresh/logs/`

---

### **F. Full Health Validation**

**Required:**

* All PM2 processes: **Online** (zero restarts, except as expected)
* All critical ports: **Listening**
* All API endpoints: **HTTP 200 + correct JSON**

  * `/api/status`, `/api/daemon-status`, `/api/telemetry`
* Dashboard `/monitor`: **All green panels** (no “unknown”, “warning”, or “error”)
* All Cloudflare tunnels: **Active/Connected**
* Unified logs: **Visible, wrapped, no overflow, auto-refresh in UI**
* Dual-agent panels (CYOPS/MAIN) **showing queue, patch, exec, summary, status**

---

### **G. Watchdogs & Patch Systems**

* All 14 watchdog scripts present, logging to unified root
* Patch delivery, summary watcher, and execution history: visible in dashboard

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

* **flask-dashboard** (dashboard/app.py, port 8787)
* **ghost-runner** (scripts/core/ghost-runner.js)
* **ghost-bridge** (scripts/core/ghost-bridge.js, port 5051)
* **ghost-relay** (scripts/ghost/ghost-relay.js)
* **ghost-viewer** (scripts/ghost/ghost-viewer.js)
* **enhanced-doc-daemon** (scripts/daemons/enhanced-doc-daemon.js)
* **metrics-aggregator-daemon** (scripts/daemons/metrics-aggregator-daemon.js)
* **alert-engine-daemon** (scripts/daemons/alert-engine-daemon.js)
* **autonomous-decision-daemon** (scripts/daemons/autonomous-decision-daemon.js)
* **telemetry-orchestrator-daemon** (scripts/daemons/telemetry-orchestrator-daemon.js, port 8789)
* **dashboard-uplink** (scripts/watchdogs/dashboard-uplink.js)
* **patch-executor** (Node or Python: scripts/daemons/patch\_executor\_daemon.py)
* **summary-monitor** (scripts/daemons/summary\_watcher\_daemon.py)
* **braun-daemon** (scripts/daemons/braun\_daemon.py)
* **dual-monitor** (scripts/monitor/dual-monitor-server.js)
* **doc-daemon** (scripts/daemons/doc-daemon.js)
* **dashboard-daemon** (scripts/daemons/dashboard\_daemon.py)
* **Webhook API** (Flask, port 5555)
* **Status server** (server/status-server.js, port 3222)
* **Express server** (server/index.js, port 5052)
* **gpt\_cursor\_runner** (gpt\_cursor\_runner/main.py, port 5051)

---

**Every entry above must be running for a fully healthy, “all green” system!**
Use this as a daily or pre-release “all critical online” checklist.

---

### **J. Recovery / Troubleshooting**

* Use unified-manager for all recovery (`start`, `restart`, `recover`)
* Investigate logs in `.cursor-cache/ROOT/.logs/` for any failed service
* If dashboard not green: check `pm2 list`, unified-status, all tunnels, all logs

---

**This is your definitive, daily-use system reference.**
Everything in the above list must pass for a healthy, “all green” system!
**Print this. Paste this. Pin this. Every engineer, SRE, and AI agent uses this as the source of truth.**
