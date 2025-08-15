# SYSTEM PROCESS & PORT CHEATSHEET

## Comprehensive Reference for All Running Systems, Ports, and Tunnels

**Generated**: 2025-07-20 19:30:00  
**Scope**: All gitSync projects and systems  
**Status**: DNS Propagating - Systems Ready for Configuration Updates

---

## 🚀 ACTIVE PROCESSES & PORTS

### **Currently Running Systems**

| Process                | PID   | Port | Service       | Status    | Purpose                  |
| ---------------------- | ----- | ---- | ------------- | --------- | ------------------------ |
| **Expo Dev Server**    | 86811 | 8081 | Metro Bundler | ✅ Active | React Native development |
| **Backend API**        | 23346 | 4000 | Express.js    | ✅ Active | Backend services         |
| **Cloudflared Runner** | 17388 | 5555 | Tunnel        | ✅ Active | runner.thoughtmarks.app  |
| **Cloudflared Ghost**  | 17390 | 5556 | Tunnel        | ✅ Active | ghost.thoughtmarks.app   |
| **Realtime Monitor**   | 92899 | N/A  | Node.js       | ✅ Active | System monitoring        |
| **Patch Executor**     | 92850 | N/A  | Node.js       | ✅ Active | Patch processing         |
| **Summary Monitor**    | 92809 | N/A  | Node.js       | ✅ Active | Summary tracking         |
| **Ghost Bridge**       | 92758 | N/A  | Node.js       | ✅ Active | gpt-cursor-runner bridge |

### **Port Assignments**

| Port     | Service         | URL                               | Status      | Purpose             |
| -------- | --------------- | --------------------------------- | ----------- | ------------------- |
| **4000** | Backend API     | `http://localhost:4000`           | ✅ Active   | Express.js server   |
| **8081** | Expo Dev Server | `http://localhost:8081`           | ✅ Active   | React Native dev    |
| **5555** | Runner Tunnel   | `https://runner.thoughtmarks.app` | ✅ Active   | Main runner service |
| **5556** | Ghost Tunnel    | `https://ghost.thoughtmarks.app`  | ⏳ DNS      | Secondary runner    |
| **5051** | Python Flask    | `http://localhost:5051`           | ❌ Inactive | Webhook handler     |
| **3000** | Alternative API | `http://localhost:3000`           | ❌ Inactive | Backup API          |

---

## 🌐 TUNNEL CONFIGURATION

### **Active Tunnels**

| Tunnel     | Hostname                  | Tunnel ID                              | Connector ID                                            | Status    | Service        |
| ---------- | ------------------------- | -------------------------------------- | ------------------------------------------------------- | --------- | -------------- |
| **Runner** | `runner.thoughtmarks.app` | `f1545c78-1a94-408f-ba6b-9c4223b4c2bf` | `f1545c78-1a94-408f-ba6b-9c4223b4c2bf.cfargotunnel.com` | ✅ Active | localhost:5555 |
| **Ghost**  | `ghost.thoughtmarks.app`  | `c9a7bf54-dab4-4c9f-a05d-2022f081f4e0` | `c9a7bf54-dab4-4c9f-a05d-2022f081f4e0.cfargotunnel.com` | ⏳ DNS    | localhost:5556 |

### **Tunnel Commands**

```bash
# Check tunnel status
cloudflared tunnel list

# Test tunnel connectivity
curl -I https://runner.thoughtmarks.app
curl -I https://ghost.thoughtmarks.app

# View tunnel logs
cloudflared tunnel info f1545c78-1a94-408f-ba6b-9c4223b4c2bf
cloudflared tunnel info c9a7bf54-dab4-4c9f-a05d-2022f081f4e0
```

---

## 🔧 CONFIGURATION FILES TO UPDATE

### **Environment Files**

| File          | Location                                   | Updates Needed               | Status     |
| ------------- | ------------------------------------------ | ---------------------------- | ---------- |
| `.env`        | `/Users/sawyer/gitSync/gpt-cursor-runner/` | Update URLs to new hostnames | ⏳ Pending |
| `env.example` | `/Users/sawyer/gitSync/gpt-cursor-runner/` | Update example URLs          | ⏳ Pending |
| `.env.local`  | `/Users/sawyer/gitSync/gpt-cursor-runner/` | Update local URLs            | ⏳ Pending |

### **Package.json Files**

| File           | Location                                                      | Updates Needed          | Status     |
| -------------- | ------------------------------------------------------------- | ----------------------- | ---------- |
| `package.json` | `/Users/sawyer/gitSync/gpt-cursor-runner/`                    | Update scripts and URLs | ⏳ Pending |
| `package.json` | `/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/` | Update dev scripts      | ⏳ Pending |

### **Configuration Files**

| File                     | Location                                   | Updates Needed     | Status     |
| ------------------------ | ------------------------------------------ | ------------------ | ---------- |
| `fly.toml`               | `/Users/sawyer/gitSync/gpt-cursor-runner/` | Update app URLs    | ⏳ Pending |
| `Dockerfile`             | `/Users/sawyer/gitSync/gpt-cursor-runner/` | Update environment | ⏳ Pending |
| `autolinter_config.json` | `/Users/sawyer/gitSync/gpt-cursor-runner/` | Update paths       | ⏳ Pending |

### **Script Files**

| File   | Location             | Updates Needed        | Status     |
| ------ | -------------------- | --------------------- | ---------- |
| `*.sh` | All gitSync projects | Update URLs and paths | ⏳ Pending |
| `*.js` | All gitSync projects | Update API endpoints  | ⏳ Pending |
| `*.py` | All gitSync projects | Update webhook URLs   | ⏳ Pending |

---

## 🚀 BOOT & STARTUP SCRIPTS

### **Primary Boot Scripts**

| Script                           | Location                                           | Purpose                | Status          |
| -------------------------------- | -------------------------------------------------- | ---------------------- | --------------- |
| `boot-all-systems.sh`            | `/Users/sawyer/gitSync/tm-mobile-cursor/scripts/`  | Main boot orchestrator | ⏳ Needs Update |
| `system-control.sh`              | `/Users/sawyer/gitSync/tm-mobile-cursor/scripts/`  | Boot wrapper           | ⏳ Needs Update |
| `start-ghost-runner-external.sh` | `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/` | Ghost runner startup   | ⏳ Needs Update |

### **Daemon Management**

| Script                         | Location                                           | Purpose          | Status          |
| ------------------------------ | -------------------------------------------------- | ---------------- | --------------- |
| `continuous-daemon-manager.sh` | `/Users/sawyer/gitSync/tm-mobile-cursor/scripts/`  | Daemon lifecycle | ⏳ Needs Update |
| `watchdog-ghost-runner.sh`     | `/Users/sawyer/gitSync/gpt-cursor-runner/scripts/` | Ghost monitoring | ⏳ Needs Update |

---

## 🔄 UPDATE COMMANDS

### **Environment Files**

```bash
# Update gpt-cursor-runner environment
cd /Users/sawyer/gitSync/gpt-cursor-runner
sed -i '' 's|http://localhost:5555|https://runner.thoughtmarks.app|g' .env*
sed -i '' 's|http://localhost:5051|https://ghost.thoughtmarks.app|g' .env*
```

### **Package.json Files**

```bash
# Update package.json scripts
find /Users/sawyer/gitSync -name "package.json" -exec sed -i '' 's|localhost:5555|runner.thoughtmarks.app|g' {} \;
find /Users/sawyer/gitSync -name "package.json" -exec sed -i '' 's|localhost:5051|ghost.thoughtmarks.app|g' {} \;
```

### **Configuration Files**

```bash
# Update fly.toml
cd /Users/sawyer/gitSync/gpt-cursor-runner
sed -i '' 's|gpt-cursor-runner.fly.dev|runner.thoughtmarks.app|g' fly.toml

# Update Dockerfile
sed -i '' 's|localhost:5555|runner.thoughtmarks.app|g' Dockerfile
```

### **Script Files**

```bash
# Update all shell scripts
find /Users/sawyer/gitSync -name "*.sh" -exec sed -i '' 's|localhost:5555|runner.thoughtmarks.app|g' {} \;
find /Users/sawyer/gitSync -name "*.sh" -exec sed -i '' 's|localhost:5051|ghost.thoughtmarks.app|g' {} \;

# Update all JavaScript files
find /Users/sawyer/gitSync -name "*.js" -exec sed -i '' 's|localhost:5555|runner.thoughtmarks.app|g' {} \;
find /Users/sawyer/gitSync -name "*.js" -exec sed -i '' 's|localhost:5051|ghost.thoughtmarks.app|g' {} \;

# Update all Python files
find /Users/sawyer/gitSync -name "*.py" -exec sed -i '' 's|localhost:5555|runner.thoughtmarks.app|g' {} \;
find /Users/sawyer/gitSync -name "*.py" -exec sed -i '' 's|localhost:5051|ghost.thoughtmarks.app|g' {} \;
```

---

## 🛡️ SECURITY & SECRETS

### **Secret Management**

| Secret                        | Location                      | Status          | Action           |
| ----------------------------- | ----------------------------- | --------------- | ---------------- |
| Cloudflare Tunnel Credentials | `/Users/sawyer/.cloudflared/` | ✅ Active       | No change needed |
| Slack Tokens                  | Environment files             | ⏳ Needs Update | Update URLs      |
| API Keys                      | Environment files             | ⏳ Needs Update | Update endpoints |

### **Vault Integration**

```bash
# Export secrets to vault
cd /Users/sawyer/gitSync/tm-mobile-cursor
./scripts/op-config.sh warp-export

# Import secrets from vault
./scripts/op-config.sh warp-import
```

---

## 📊 MONITORING & HEALTH

### **Health Check URLs**

| Service     | Health URL                               | Status    |
| ----------- | ---------------------------------------- | --------- |
| Runner      | `https://runner.thoughtmarks.app/health` | ✅ Active |
| Ghost       | `https://ghost.thoughtmarks.app/health`  | ⏳ DNS    |
| Development | `http://localhost:4000/health`           | ✅ Active |

### **Monitoring Commands**

```bash
# Check all processes
ps aux | grep -E "(node|python|ngrok|expo|cloudflared)" | grep -v grep

# Check all ports
lsof -i -P | grep LISTEN

# Test connectivity
curl -I https://runner.thoughtmarks.app
curl -I https://ghost.thoughtmarks.app
```

---

## 🔧 TROUBLESHOOTING

### **Common Issues**

#### **Port Conflicts**

```bash
# Check for port conflicts
lsof -i:5555
lsof -i:5556
lsof -i:4000
lsof -i:8081

# Kill conflicting processes
kill -9 $(lsof -t -i:5555)
kill -9 $(lsof -t -i:5556)
```

#### **Tunnel Issues**

```bash
# Restart tunnels
cloudflared tunnel stop f1545c78-1a94-408f-ba6b-9c4223b4c2bf
cloudflared tunnel run f1545c78-1a94-408f-ba6b-9c4223b4c2bf

# Check tunnel logs
cloudflared tunnel info f1545c78-1a94-408f-ba6b-9c4223b4c2bf
```

#### **Process Issues**

```bash
# Restart all systems
cd /Users/sawyer/gitSync/tm-mobile-cursor
./scripts/system-control.sh restart

# Check daemon status
./scripts/continuous-daemon-manager.sh status
```

---

## 📋 DNS PROPAGATION STATUS

### **DNS Records Required**

| Type  | Name     | Value                                                   | Status         |
| ----- | -------- | ------------------------------------------------------- | -------------- |
| CNAME | `runner` | `f1545c78-1a94-408f-ba6b-9c4223b4c2bf.cfargotunnel.com` | ✅ Active      |
| CNAME | `ghost`  | `c9a7bf54-dab4-4c9f-a05d-2022f081f4e0.cfargotunnel.com` | ⏳ Propagating |

### **DNS Propagation Check**

```bash
# Check DNS propagation
nslookup runner.thoughtmarks.app
nslookup ghost.thoughtmarks.app

# Test connectivity
curl -I https://runner.thoughtmarks.app
curl -I https://ghost.thoughtmarks.app
```

---

## 🎯 NEXT ACTIONS

### **Immediate (While DNS Propagates)**

1. **Update all environment files** with new hostnames
2. **Update all package.json files** with new URLs
3. **Update all configuration files** with new endpoints
4. **Update all script files** with new paths
5. **Test all connectivity** after DNS propagation

### **Post-DNS Propagation**

1. **Verify all tunnels** are working
2. **Test all endpoints** are accessible
3. **Update external references** to new URLs
4. **Monitor system health** for 24 hours
5. **Document any issues** and resolve

### **Validation Checklist**

- [ ] All environment files updated
- [ ] All package.json files updated
- [ ] All configuration files updated
- [ ] All script files updated
- [ ] DNS propagation complete
- [ ] All tunnels working
- [ ] All endpoints accessible
- [ ] All systems healthy

---

## 📚 REFERENCES

### **Documentation Files**

| File                                  | Purpose                      | Status      |
| ------------------------------------- | ---------------------------- | ----------- |
| `TUNNEL_DNS_READY_SUMMARY.md`         | Tunnel configuration summary | ✅ Complete |
| `WARP_TUNNEL_FINALIZATION_SUMMARY.md` | WARP tunnel setup            | ✅ Complete |
| `TM-MOBILE-CURSOR-MASTER-MANIFEST.md` | System manifest              | ✅ Complete |

### **Configuration Files**

| File                                          | Purpose             | Status    |
| --------------------------------------------- | ------------------- | --------- |
| `/Users/sawyer/.cloudflared/config.yml`       | Main tunnel config  | ✅ Active |
| `/Users/sawyer/.cloudflared/ghost-config.yml` | Ghost tunnel config | ✅ Active |

---

**Cheatsheet Created**: 2025-07-20 19:30:00  
**Status**: DNS Propagating - Ready for Configuration Updates  
**Next Action**: Update all configuration files with new hostnames  
**Priority**: High (complete before DNS propagation finishes)
