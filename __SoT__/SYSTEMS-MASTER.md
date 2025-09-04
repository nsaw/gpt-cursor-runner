# SYSTEMS-MASTER - Source of Truth

**Date:** 2025-09-03T20:55:00.000Z  
**Version:** v2.3.61  
**Status:** ✅ **ACTIVE**  
**Domain:** CYOPS (GPT Cursor Runner)

## **SYSTEM ARCHITECTURE**

### **Three-Tier System Structure**
1. **CYOPS** (`/Users/sawyer/gitSync/gpt-cursor-runner`) - **Runner Infrastructure**
2. **MAIN** (`/Users/sawyer/gitSync/tm-mobile-cursor`) - **Mobile App Development**  
3. **UNIFIED** (`/Users/sawyer/gitSync/.cursor-cache`) - **Centralized Cache & Coordination**

### **Writer vs Mirrors Policy**
- **WRITER (Authoritative):** `/Users/sawyer/gitSync/.cursor-cache/{CYOPS|MAIN}/artifacts/`
- **DOCS MIRROR (Publish):** `/Users/sawyer/gitSync/_GPTsync/__{CYOPS|MAIN}-SYNC__/`
- **STATUS MIRROR (Publish):** `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/`

## **NB 2.0 NON-BLOCKING PATTERNS**

### **MANDATORY PATTERN**
```bash
./scripts/nb-safe-detach.sh <label> 18s bash -lc '<ABSOLUTE_COMMAND>'
```

### **FORBIDDEN PATTERNS**
- ❌ `{ … & }`, `( … ) &` (inline background groups)
- ❌ `disown` (explicitly banned)
- ❌ `tail -f` (unbounded)
- ❌ Raw `timeout` pipelines
- ❌ Unbounded `grep` without `-m 1`

## **ACCEPTANCE GATES**

### **Critical Validation Checks**
1. **TypeScript Compilation:** `npx tsc --noEmit --skipLibCheck`
2. **ESLint Validation:** `npx eslint . --ext .ts,.tsx --max-warnings=0`
3. **Contract Compliance:** `node scripts/tools/check-absolute-paths.js`
4. **Freeze Verification:** System state consistency
5. **Drift Detection:** Anti-drift policy enforcement

### **Status Reporting**
- **Health Endpoint:** `http://localhost:5052/health`
- **Acceptance Gates:** `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/acceptance-gates.json`
- **Drift Status:** `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/drift.json`

## **PATCH MANAGEMENT**

### **Patch Flow**
1. **Plain Text Input** → Slack commands or GPT directives
2. **Hardening** → Schema validation, SoT augmentation, rubric preflight
3. **Execution** → NB 2.0 patterns, validation gates, rollback protection
4. **Reporting** → Dual-domain summaries, status lights, proofs

### **Patch Structure**
```json
{
  "showInUI": true,
  "blockId": "<patch-id>",
  "description": "<short summary>",
  "target": "DEV|BRAUN",
  "version": "<version-string>",
  "mutations": [...],
  "validate": {...},
  "postMutationBuild": {...}
}
```

## **SERVICE ARCHITECTURE**

### **Core Services**
- **Live Executor:** `services/runner/live-executor-service.js`
- **Spool Watcher:** `services/runner/spool-watcher.js`
- **Path Audit:** `services/audit/path-audit-service.js`
- **Main Cutover:** `services/cutover/main-cutover-service.js`

### **Slack Integration**
- **Socket Mode:** Real-time command processing
- **Slash Commands:** 25+ commands for remote control
- **Webhook Processing:** Plain text → hardened patch conversion

## **COMPLIANCE ENFORCEMENT**

### **CI Hard-Block**
- **Wrapper Audit:** Enforces NB 2.0 patterns
- **Filename Guard:** Maximum 200 character limit
- **Path Enforcement:** Absolute paths only, no tilde usage
- **Contract Validation:** Build fails on violations

### **Monitoring**
- **Path Audit Service:** Hourly scans for compliance
- **Drift Detection:** 6-hour scheduled checks
- **Health Monitoring:** Continuous service validation
- **SLO Tracking:** Performance and reliability metrics

## **NORTH STAR VISION**

### **Remote Control Capability**
- **Plain English Input:** Type natural language directives
- **System Hardening:** Automatic patch validation and augmentation
- **Safe Execution:** NB 2.0 patterns with rollback protection
- **Dual-Domain Reporting:** CYOPS and MAIN domain summaries
- **Status Lights:** Real-time dashboard with proofs

### **Success Metrics**
- **Zero Wrapper Violations:** All commands use NB 2.0 patterns
- **Green Acceptance Gates:** All validation checks pass
- **Hands-Free Operations:** Automated patch execution and reporting
- **Dual-Domain Proofs:** Complete audit trail for both domains

## **CRITICAL FILES**

### **Configuration**
- **Package.json:** Dependencies and scripts
- **Ecosystem.config.js:** PM2 service definitions
- **Tsconfig.json:** TypeScript configuration
- **Eslintrc:** Code quality rules

### **Documentation**
- **README.md:** Project overview and setup
- **QUICK-START.md:** NB 2.0 patterns and common commands
- **SYSTEMS-MASTER.md:** This file (Source of Truth)

### **Status Files**
- **Health.json:** Service health status
- **Acceptance-gates.json:** Validation gate status
- **Drift.json:** Anti-drift policy status
- **Path-audit.json:** Path compliance status

---

**Last Updated:** 2025-09-03T20:55:00.000Z  
**Agent:** DEV (CYOPS)  
**Status:** ✅ **ACTIVE**
