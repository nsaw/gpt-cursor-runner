# POLICIES - Source of Truth

**Date:** 2025-09-03T20:55:00.000Z  
**Version:** v2.3.61  
**Status:** ✅ **ACTIVE**  
**Domain:** CYOPS (GPT Cursor Runner)

## **ENFORCEMENT POLICIES**

### **NB 2.0 Non-Blocking Pattern Enforcement**
- **MANDATORY:** All terminal commands must use `./scripts/nb-safe-detach.sh`
- **FORBIDDEN:** `{ … & }`, `( … ) &`, `disown`, `tail -f`, raw `timeout`
- **ENFORCEMENT:** CI hard-block fails build on violations
- **SCOPE:** All operations across all contexts

### **Path Enforcement Policy**
- **ABSOLUTE PATHS ONLY:** All paths must start with `/Users/sawyer/gitSync/`
- **NO TILDE:** Never use `~` notation
- **FILENAME GUARD:** Maximum 200 characters
- **ENFORCEMENT:** Contract validation fails on violations

### **Writer vs Mirrors Policy**
- **WRITER (Authoritative):** `/Users/sawyer/gitSync/.cursor-cache/{CYOPS|MAIN}/artifacts/`
- **DOCS MIRROR (Publish):** `/Users/sawyer/gitSync/_GPTsync/__{CYOPS|MAIN}-SYNC__/`
- **STATUS MIRROR (Publish):** `/Users/sawyer/gitSync/gpt-cursor-runner/public/status/`
- **ENFORCEMENT:** Path audit service monitors compliance

### **Git Force Protection Policy**
- **NEVER USE `--force`:** All git operations must be safe
- **NO EXCEPTIONS:** Even with user approval, prefer alternatives
- **ENFORCEMENT:** Pre-commit hooks prevent force operations
- **SCOPE:** All git operations across all projects

## **VALIDATION POLICIES**

### **Acceptance Gates Policy**
- **TypeScript:** `npx tsc --noEmit --skipLibCheck` must pass
- **ESLint:** `npx eslint . --ext .ts,.tsx --max-warnings=0` must pass
- **Contract:** `node scripts/tools/check-absolute-paths.js` must pass
- **Freeze:** System state consistency must be maintained
- **Drift:** Anti-drift policy must be enforced

### **Patch Validation Policy**
- **Schema Validation:** All patches must conform to schema
- **SoT Augmentation:** Patches must be augmented with Source of Truth
- **Rubric Preflight:** Patches must pass rubric validation
- **Execution Proof:** Patches must provide execution proof
- **Rollback Capability:** Patches must support rollback

### **Service Health Policy**
- **Port Availability:** Services must check port availability before starting
- **Process Monitoring:** Services must monitor for existing instances
- **Graceful Shutdown:** Services must handle SIGINT/SIGTERM
- **Health Checks:** Services must provide health endpoints
- **Error Logging:** Services must log startup failures

## **SECURITY POLICIES**

### **Secret Management Policy**
- **NO HARDCODED SECRETS:** All secrets must use environment variables
- **VAULT INTEGRATION:** Use 1Password Vault for credential storage
- **ENCRYPTION:** All sensitive data must be encrypted
- **ACCESS CONTROL:** Limit access to sensitive information
- **AUDIT TRAIL:** Log all secret access

### **Backup Policy**
- **HEALTHY STATES ONLY:** Never backup broken or troubleshooting states
- **ABSOLUTE PATHS:** All backup paths must be absolute
- **TARIGNORE COMPLIANCE:** All backups must exclude system files
- **TIMESTAMPED NAMING:** Use `YYMMDD_UTC_<patch-id>.tar.gz` format
- **VALIDATION:** Verify backup integrity before completion

## **COMPLIANCE POLICIES**

### **CI Hard-Block Policy**
- **Wrapper Audit:** Enforces NB 2.0 patterns
- **Filename Guard:** Enforces 200 character limit
- **Path Enforcement:** Enforces absolute paths
- **Contract Validation:** Enforces contract compliance
- **ENFORCEMENT:** Build fails on any violation

### **Drift Detection Policy**
- **6-Hour Scans:** Scheduled drift detection every 6 hours
- **Threshold Monitoring:** Monitor drift thresholds
- **Auto-Remediation:** Automatic remediation hooks
- **Alert System:** Slack alerts on drift detection
- **Weekly Reports:** Comprehensive drift reports

### **Path Audit Policy**
- **Hourly Scans:** Scan for artifacts outside allowed roots
- **Violation Detection:** Detect and report violations
- **Public Status:** Update public status mirrors
- **Alert System:** Alert on violations
- **Compliance Tracking:** Track compliance metrics

## **OPERATIONAL POLICIES**

### **Service Management Policy**
- **PM2 Integration:** Use PM2 for service management
- **Process Monitoring:** Monitor service health
- **Auto-Recovery:** Automatic service recovery
- **Resource Limits:** Set appropriate resource limits
- **Log Management:** Proper log rotation and cleanup

### **Monitoring Policy**
- **Health Endpoints:** All services must provide health endpoints
- **Status Reporting:** Regular status reporting
- **Alert Thresholds:** Set appropriate alert thresholds
- **Dashboard Integration:** Integrate with status dashboard
- **SLO Tracking:** Track service level objectives

### **Documentation Policy**
- **Source of Truth:** Maintain single source of truth
- **Version Control:** Track documentation versions
- **Update Process:** Regular documentation updates
- **Access Control:** Control documentation access
- **Audit Trail:** Maintain documentation audit trail

## **EMERGENCY POLICIES**

### **Rollback Policy**
- **Immediate Rollback:** Rollback on critical failures
- **State Preservation:** Preserve system state before changes
- **Recovery Procedures:** Document recovery procedures
- **Testing:** Test rollback procedures regularly
- **Communication:** Communicate rollback status

### **Incident Response Policy**
- **Detection:** Rapid incident detection
- **Response:** Immediate response procedures
- **Communication:** Clear communication protocols
- **Documentation:** Document all incidents
- **Post-Mortem:** Conduct post-mortem analysis

---

**Last Updated:** 2025-09-03T20:55:00.000Z  
**Agent:** DEV (CYOPS)  
**Status:** ✅ **ACTIVE**
