# Source of Truth (SoT) Directory

**Date:** 2025-09-03T20:55:00.000Z  
**Version:** v2.3.61  
**Status:** ✅ **ACTIVE**  
**Domain:** CYOPS (GPT Cursor Runner)

## **PURPOSE**

This directory contains the **Source of Truth** files for the GPT Cursor Runner system. These files define the authoritative policies, contracts, schemas, and validation rules that govern the entire system.

## **CRITICAL FILES**

### **SYSTEMS-MASTER.md**
- **Purpose:** Main system architecture and configuration
- **Contains:** System structure, NB 2.0 patterns, acceptance gates, patch management
- **Status:** ✅ **ACTIVE**

### **POLICIES.md**
- **Purpose:** Enforcement policies and rules
- **Contains:** NB 2.0 enforcement, path enforcement, validation policies, security policies
- **Status:** ✅ **ACTIVE**

### **CONTRACTS.md**
- **Purpose:** System contracts and agreements
- **Contains:** NB 2.0 contract, path enforcement contract, validation contracts, service contracts
- **Status:** ✅ **ACTIVE**

### **PATCH-SCHEMA.json**
- **Purpose:** JSON schema for patch validation
- **Contains:** Complete patch schema with validation rules
- **Status:** ✅ **ACTIVE**

### **ACCEPTANCE-GATES.json**
- **Purpose:** Acceptance gate definitions
- **Contains:** TypeScript, ESLint, contract, freeze, drift validation gates
- **Status:** ✅ **ACTIVE**

### **RUBRIC.json**
- **Purpose:** Validation rubric for system compliance
- **Contains:** Scoring criteria, validation rules, compliance thresholds
- **Status:** ✅ **ACTIVE**

## **USAGE**

### **For Patches**
- All patches must conform to `PATCH-SCHEMA.json`
- All patches must pass `RUBRIC.json` validation (≥95%)
- All patches must pass `ACCEPTANCE-GATES.json` validation

### **For Services**
- All services must comply with `CONTRACTS.md` requirements
- All services must follow `POLICIES.md` enforcement rules
- All services must maintain `SYSTEMS-MASTER.md` architecture

### **For Validation**
- Use `ACCEPTANCE-GATES.json` for automated validation
- Use `RUBRIC.json` for compliance scoring
- Use `CONTRACTS.md` for contract validation

## **MAINTENANCE**

### **Updates**
- All SoT files must be versioned
- All updates must be documented
- All changes must be validated

### **Backup**
- SoT files are backed up with system backups
- SoT files are mirrored to `_GPTsync/__CYOPS-SYNC__/`
- SoT files are tracked in git

### **Validation**
- SoT files must pass schema validation
- SoT files must be consistent with each other
- SoT files must be tested before deployment

## **INTEGRATION**

### **CI/CD**
- SoT files are validated in CI pipeline
- SoT files are enforced in pre-commit hooks
- SoT files are monitored for drift

### **Services**
- Services read SoT files for configuration
- Services validate against SoT files
- Services report compliance to SoT files

### **Documentation**
- SoT files are the authoritative source
- Documentation must reference SoT files
- Documentation must be consistent with SoT files

## **SECURITY**

### **Access Control**
- SoT files are read-only in production
- SoT files are version controlled
- SoT files are audited for changes

### **Integrity**
- SoT files are checksummed
- SoT files are signed
- SoT files are validated

## **EMERGENCY PROCEDURES**

### **Recovery**
- SoT files can be restored from backups
- SoT files can be restored from git
- SoT files can be restored from mirrors

### **Rollback**
- SoT files support version rollback
- SoT files support configuration rollback
- SoT files support policy rollback

---

**Last Updated:** 2025-09-03T20:55:00.000Z  
**Agent:** DEV (CYOPS)  
**Status:** ✅ **ACTIVE**
