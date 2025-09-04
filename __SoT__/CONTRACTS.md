# CONTRACTS - Source of Truth

**Date:** 2025-09-03T20:55:00.000Z  
**Version:** v2.3.61  
**Status:** ✅ **ACTIVE**  
**Domain:** CYOPS (GPT Cursor Runner)

## **SYSTEM CONTRACTS**

### **NB 2.0 Contract**
```json
{
  "contract": "NB_2_0_PATTERN",
  "version": "v2.3.58",
  "enforcement": "CRITICAL",
  "requirements": {
    "pattern": "./scripts/nb-safe-detach.sh <label> 18s bash -lc '<ABSOLUTE_COMMAND>'",
    "forbidden": [
      "{ … & }",
      "( … ) &", 
      "disown",
      "tail -f",
      "raw timeout",
      "unbounded grep"
    ],
    "enforcement": "CI_HARD_BLOCK"
  }
}
```

### **Path Enforcement Contract**
```json
{
  "contract": "PATH_ENFORCEMENT",
  "version": "v2.3.58",
  "enforcement": "CRITICAL",
  "requirements": {
    "absolute_paths_only": true,
    "no_tilde": true,
    "filename_limit": 200,
    "base_path": "/Users/sawyer/gitSync/",
    "enforcement": "CONTRACT_VALIDATION"
  }
}
```

### **Writer vs Mirrors Contract**
```json
{
  "contract": "WRITER_MIRRORS_POLICY",
  "version": "v2.3.58",
  "enforcement": "HIGH",
  "requirements": {
    "writer_roots": [
      "/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/",
      "/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/"
    ],
    "mirror_roots": [
      "/Users/sawyer/gitSync/_GPTsync/__CYOPS-SYNC__/",
      "/Users/sawyer/gitSync/_GPTsync/__MAIN-SYNC__/",
      "/Users/sawyer/gitSync/gpt-cursor-runner/public/status/"
    ],
    "enforcement": "PATH_AUDIT_SERVICE"
  }
}
```

## **VALIDATION CONTRACTS**

### **Acceptance Gates Contract**
```json
{
  "contract": "ACCEPTANCE_GATES",
  "version": "v2.3.61",
  "enforcement": "CRITICAL",
  "requirements": {
    "typescript": {
      "command": "npx tsc --noEmit --skipLibCheck",
      "required": true,
      "timeout": 30
    },
    "eslint": {
      "command": "npx eslint . --ext .ts,.tsx --max-warnings=0",
      "required": true,
      "timeout": 30
    },
    "contract": {
      "command": "node scripts/tools/check-absolute-paths.js",
      "required": true,
      "timeout": 15
    },
    "freeze": {
      "command": "system state consistency check",
      "required": true,
      "timeout": 10
    },
    "drift": {
      "command": "anti-drift policy enforcement",
      "required": true,
      "timeout": 10
    }
  }
}
```

### **Patch Validation Contract**
```json
{
  "contract": "PATCH_VALIDATION",
  "version": "v2.3.61",
  "enforcement": "CRITICAL",
  "requirements": {
    "schema_validation": {
      "required": true,
      "schema": "patch-schema-v2.3.61.json"
    },
    "sot_augmentation": {
      "required": true,
      "source": "SYSTEMS-MASTER.md"
    },
    "rubric_preflight": {
      "required": true,
      "threshold": 95
    },
    "execution_proof": {
      "required": true,
      "format": "summary.md"
    },
    "rollback_capability": {
      "required": true,
      "backup": "timestamped"
    }
  }
}
```

## **SERVICE CONTRACTS**

### **Health Endpoint Contract**
```json
{
  "contract": "HEALTH_ENDPOINT",
  "version": "v2.3.61",
  "enforcement": "HIGH",
  "requirements": {
    "endpoint": "/health",
    "port": 5052,
    "response_format": "json",
    "required_fields": [
      "status",
      "timestamp",
      "services",
      "acceptance_gates"
    ],
    "timeout": 5
  }
}
```

### **Service Management Contract**
```json
{
  "contract": "SERVICE_MANAGEMENT",
  "version": "v2.3.61",
  "enforcement": "HIGH",
  "requirements": {
    "pm2_integration": true,
    "process_monitoring": true,
    "auto_recovery": true,
    "graceful_shutdown": true,
    "health_checks": true,
    "error_logging": true
  }
}
```

## **SECURITY CONTRACTS**

### **Secret Management Contract**
```json
{
  "contract": "SECRET_MANAGEMENT",
  "version": "v2.3.61",
  "enforcement": "CRITICAL",
  "requirements": {
    "no_hardcoded_secrets": true,
    "vault_integration": "1Password",
    "encryption": true,
    "access_control": true,
    "audit_trail": true
  }
}
```

### **Backup Contract**
```json
{
  "contract": "BACKUP_POLICY",
  "version": "v2.3.61",
  "enforcement": "HIGH",
  "requirements": {
    "healthy_states_only": true,
    "absolute_paths": true,
    "tarignore_compliance": true,
    "timestamped_naming": "YYMMDD_UTC_<patch-id>.tar.gz",
    "integrity_validation": true
  }
}
```

## **COMPLIANCE CONTRACTS**

### **CI Hard-Block Contract**
```json
{
  "contract": "CI_HARD_BLOCK",
  "version": "v2.3.61",
  "enforcement": "CRITICAL",
  "requirements": {
    "wrapper_audit": {
      "enforced": true,
      "pattern": "NB_2_0_PATTERN"
    },
    "filename_guard": {
      "enforced": true,
      "limit": 200
    },
    "path_enforcement": {
      "enforced": true,
      "absolute_paths": true
    },
    "contract_validation": {
      "enforced": true,
      "build_fails": true
    }
  }
}
```

### **Drift Detection Contract**
```json
{
  "contract": "DRIFT_DETECTION",
  "version": "v2.3.61",
  "enforcement": "HIGH",
  "requirements": {
    "scan_interval": "6_hours",
    "threshold_monitoring": true,
    "auto_remediation": true,
    "alert_system": "slack",
    "weekly_reports": true
  }
}
```

## **OPERATIONAL CONTRACTS**

### **Monitoring Contract**
```json
{
  "contract": "MONITORING",
  "version": "v2.3.61",
  "enforcement": "HIGH",
  "requirements": {
    "health_endpoints": true,
    "status_reporting": true,
    "alert_thresholds": true,
    "dashboard_integration": true,
    "slo_tracking": true
  }
}
```

### **Documentation Contract**
```json
{
  "contract": "DOCUMENTATION",
  "version": "v2.3.61",
  "enforcement": "MEDIUM",
  "requirements": {
    "source_of_truth": true,
    "version_control": true,
    "update_process": true,
    "access_control": true,
    "audit_trail": true
  }
}
```

## **EMERGENCY CONTRACTS**

### **Rollback Contract**
```json
{
  "contract": "ROLLBACK_POLICY",
  "version": "v2.3.61",
  "enforcement": "CRITICAL",
  "requirements": {
    "immediate_rollback": true,
    "state_preservation": true,
    "recovery_procedures": true,
    "testing": true,
    "communication": true
  }
}
```

### **Incident Response Contract**
```json
{
  "contract": "INCIDENT_RESPONSE",
  "version": "v2.3.61",
  "enforcement": "HIGH",
  "requirements": {
    "detection": "rapid",
    "response": "immediate",
    "communication": "clear",
    "documentation": true,
    "post_mortem": true
  }
}
```

---

**Last Updated:** 2025-09-03T20:55:00.000Z  
**Agent:** DEV (CYOPS)  
**Status:** ✅ **ACTIVE**
