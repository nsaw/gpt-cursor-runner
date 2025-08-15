# 🚦 **MULTITUNNEL PORT/TUNNEL HARDENING & HEALTH SYSTEM — COMPLETION CHECKLIST**

---

### **PORT ASSIGNMENT**

- [ ] **5051:** Python Ghost Runner (Slack commands/webhooks) – `slack.thoughtmarks.app` → `localhost:5051`
- [ ] **5555:** RESERVED (not used—clarified in all configs/scripts)
- [ ] **8787:** Flask Dashboard (Python, monitor) – `gpt-cursor-runner.thoughtmarks.app` → `localhost:8787`
- [x] **8788:** Telemetry API (Node.js, internal) – **running, connected to dashboard** (PM2 process `telemetry-api`)
- [ ] **8789:** Telemetry Orchestrator (Node.js, PM2 managed)
- [ ] **8081:** Expo/Metro (Node.js, DEV only, always localhost) – `expo-thoughtmarks.thoughtmarks.app` → `localhost:8081`
- [ ] **9091:** Expo Go (public/remote) – `deciding-externally-caiman.ngrok-free.app`
- [ ] **4000:** MAIN Backend API (tm-mobile-cursor)
- [ ] **3001:** Ghost Relay (Node.js, internal relay)

---

### **TUNNEL FAILOVER CHAINS**

#### **Slack Webhook**

- [ ] **Primary:** `slack.thoughtmarks.app`
- [ ] **Secondary:** `webhook-thoughtmarks.thoughtmarks.app`
- [ ] **Tertiary:** `ghost-thoughtmarks.thoughtmarks.app`
- [ ] **(localhost only as final, rare fallback for debugging)**

Slack → slack.thoughtmarks.app (Cloudflare Tunnel) ─┬─> gpt-cursor-runner.fly.dev (Fly, Primary)
├─> DEV Tunnel (Secondary)
└─> Localhost (Tertiary, only if forced)

#### **Flask Dashboard**

- [ ] **Primary:** `gpt-cursor-runner.thoughtmarks.app`
- [ ] **Secondary:** `health-thoughtmarks.thoughtmarks.app`
- [ ] **Tertiary:** `ghost-thoughtmarks.thoughtmarks.app`

#### **Expo Go**

- [ ] **Primary:** `expo-thoughtmarks.thoughtmarks.app`
- [ ] **Secondary:** `deciding-externally-caiman.ngrok-free.app`
- [ ] **Tertiary:** `DEV-thoughtmarks.thoughtmarks.app`
- [ ] **Expo DEV (8081):** \[ ] Confirmed always localhost only, never public

---

### **SCRIPTS, WATCHDOGS, AND PM2**

- [ ] **Unified boot/manager scripts:** Only start 1 process per port; error/exit on conflict
- [ ] **Tunnel failover automation:** Scripts switch tunnel/DNS to next remote if primary fails
- [ ] **Watchdogs:** Each watches its assigned service, port, tunnel
  - [ ] Alert, auto-repair, and escalate if failure
  - [ ] Self-watch (monitor the monitor)

- [x] **PM2 configs:** Canonical ecosystem at `/Users/sawyer/gitSync/gpt-cursor-runner/config/ecosystem.config.js` (root ecosytem archived). All PM2 daemons use correct port; dependency validation done.

---

### **HEALTH ENDPOINTS & VALIDATION**

- [ ] **All `/api/health`, `/monitor`, `/health` endpoints exist and return correct status (JSON/HTML)** (Flask now exposes `/health` alias)
- [ ] **Telemetry API (8788) is running and dashboard can connect**
- [ ] **Cloudflare tunnels and ngrok all restart and proxy as required**
- [ ] **Public URLs resolve as expected at each layer**

---

### **DOCUMENTATION & CONFIGS**

- [ ] **All config/docs updated:**
  - [ ] \_UNIFIED-MASTER-OPS.md /Users/sawyer/gitSync/gpt-cursor-runner/docs/\_UNIFIED-MASTER-OPS.md
  - [ ] SYSTEMS_CONFIGURATION.md /Users/sawyer/gitSync/gpt-cursor-runner/docs/current/SYSTEMS_CONFIGURATION.md
  - [ ] \_COMPREHENSIVE-DEPENDENCY.md /Users/sawyer/gitSync/gpt-cursor-runner/docs/\_COMPREHENSIVE-DEPENDENCY.md
  - [ ] WEBHOOK_SETUP.md /Users/sawyer/gitSync/gpt-cursor-runner/docs/current/WEBHOOK_SETUP.md
  - [ ] WATCHDOG_SYSTEM.md/Users/sawyer/gitSync/gpt-cursor-runner/docs/current/WATCHDOG_SYSTEM.md

- [ ] **For each endpoint:**
  - [ ] Port, service, tunnel/fallback order, health endpoint, config notes documented
  - [ ] Table: Port | Service | Tunnel | Health Endpoint | Fallback Notes

---

### **FINAL VALIDATION**

- [ ] **Simulate failover at each tunnel/layer; validate fallback to remote-only**
- [ ] **No endpoint defaults to localhost except Expo DEV (8081)**
- [ ] **All watchdogs, health checks, PM2, and services working**
- [ ] **Alert system triggers/escalates if any endpoint fails and cannot recover**
- [ ] **Dashboard and logs mark system “GREEN” only if all layers pass**
- [ ] **ALL DOCUMENTATION UPDATED**
- [ ] **ALL /SCRIPTS/CORE/ UNIFIED BOOT SCRIPTS AND SHELLS UPDATED**

/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-boot.sh
/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-manager.sh
/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-reboot.sh
/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-shutdown.sh
/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-status.sh
/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-test.sh

---

### **NONCRITICAL (BUT APPRECIATED)**

- [ ] **Update or assign any unassigned tunnels (ghost, health, webhook, dev, etc) as needed for tertiary failover**
- [ ] **Add/validate any future remote endpoints as they come online**

---

UPDATED 2500807 NS
