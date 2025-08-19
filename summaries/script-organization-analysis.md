# Script Organization and Directory Structure Analysis

## Overview

Analysis of script distribution, ownership, and organizational patterns across the `/Users/sawyer/gitSync` workspace based on tree structure audits from 2025-07-22.

## Top-Level Directory Structure

```
/Users/sawyer/gitSync/
├── .cursor/                    # Cursor IDE configuration
├── .cursor-cache/              # Cursor cache with unified project tracking
├── AndroidStudioProjects/      # Android development projects
├── Koder/                      # Koder-related projects
├── Projects/                   # General project directory
├── RECOVERY/                   # Recovery/backup systems
├── ThoughtPilot-AI/            # AI project
├── Thoughtmarks-landing/       # Landing page project
├── _backups/                   # Backup directory
├── _global/                    # Global shared resources and tools
├── dev-tools/                  # Development utilities
├── gpt-cursor-runner/          # Main GPT cursor runner project (CYOPS)
├── gpt-cursor-runner-clean/    # Clean version of runner
├── meshMaker/                  # Mesh creation tool
├── scripts/                    # Global scripts directory
├── thoughtmarks-mobile/        # Mobile app project
├── tm-filesync/                # File synchronization tool
└── tm-mobile-cursor/           # Mobile cursor project (MAIN)
```

## Script Distribution Analysis

### 1. Global Scripts (`/Users/sawyer/gitSync/scripts/`)

**Purpose**: Cross-project utility scripts
**Count**: 13 files (10 .sh, 3 .py)
**Key Scripts**:

- `ask-gpt.sh` (237B) - GPT interaction wrapper
- `ask_gpt_cli.sh` (310B) - CLI GPT interface
- `audit-tm-layout.sh` (434B) - Layout auditing
- `bridge_daemon.py` (375B) - Bridge daemon
- `check-global-integrity.sh` (366B) - Integrity checking
- `gpt-bridge-watchdog.sh` (646B) - Bridge monitoring
- `gpt-hotkey.sh` (219B) - Hotkey integration
- `gpt-refresh-summaries.sh` (161B) - Summary refresh
- `gpt-vault-env.sh` (1K) - Vault environment setup
- `local_gpt_shell.py` (6K) - Local GPT shell
- `run-local-shell.sh` (78B) - Shell execution
- `scan-src-nextgen.sh` (364B) - Source scanning
- `tree-trimmed.py` (2K) - Tree trimming utility

### 2. Global Tools (`/Users/sawyer/gitSync/_global/`)

**Purpose**: System-wide tools and enforcement
**Key Components**:

- `VAULT/` - Secret management
  - `vault-manager.sh` (7K) - Vault management
- `dev-tools/` - Development utilities
  - `gen-launchd-watchdog.js` (11K) - LaunchD watchdog
  - `sync-env-daemon.js` (7K) - Environment sync daemon
  - `sync-to-1pw.js` (3K) - 1Password sync
  - `vault-sync-env.js` (6K) - Vault environment sync
  - `cloudflare/generate_launchd.sh` (2K) - Cloudflare setup
  - `enforcement/scripts/tunnel-start-if-backend-ready.sh` (451B) - Tunnel management
  - `mobile-builds/import-env-to-1pw.sh` (1K) - Mobile build env import
- `enforcement/` - System enforcement
  - `agent.sh` (8K) - Agent enforcement
  - `install.sh` (8K) - Installation
  - `watchdog.js` (19K) - System watchdog
  - `scripts/safe-run.sh` (1K) - Safe execution
- `scripts/` - Global scripts
  - `migrate-secrets-to-secretkeeper.sh` (1K) - Secret migration
  - `tunnel-watchdog.sh` (740B) - Tunnel monitoring
- Root level scripts
  - `vault-to-env.sh` (494B) - Vault to environment
  - `vault.sh` (859B) - Vault operations

### 3. Main Project (`/Users/sawyer/gitSync/tm-mobile-cursor/`)

**Purpose**: Mobile cursor project (MAIN)
**Scripts**: Limited to backup directory

- `.backup/` contains 4 files:
  - `fetch-client-secrets.sh` (730B)
  - `fix-onpress-accessibility.js` (1K)
  - `fix-onpress-broken.js` (2K)
  - `fix-onpress-stuck.js` (807B)

### 4. CYOPS Project (`/Users/sawyer/gitSync/gpt-cursor-runner/`)

**Purpose**: GPT cursor runner (CYOPS)
**Scripts**: Extensive Python ecosystem with 85+ packages
**Key Components**:

- Full Python virtual environment with comprehensive dependencies
- Testing framework (pytest)
- Code formatting (black, autopep8)
- Development tools and utilities

## Unified Cache Structure Analysis

The `.cursor-cache/` directory implements a sophisticated project tracking system:

### Structure:

```
.cursor-cache/
├── CYOPS/                      # gpt-cursor-runner project tracking
│   ├── ghost/                  # Ghost process management
│   ├── patches/                # Patch management
│   └── summaries/              # Summary tracking
├── MAIN/                       # tm-mobile-cursor project tracking
│   ├── patches/                # Phase-based patch system
│   │   ├── phase-0/ through phase-4/
│   │   ├── src-nextgen/
│   │   └── docs/
│   └── summaries/              # Summary tracking
└── ROOT/                       # Root-level tracking
    ├── patches/                # Root patches
    └── summaries/              # Root summaries
```

### Patch System:

- **Phase-based development**: 5 phases (0-4) with completion tracking
- **Documentation**: Technical, strategy, and phase-specific docs
- **Archive system**: Comprehensive backup and archival
- **Heartbeat monitoring**: Process health tracking

## Organizational Patterns & Issues

### Strengths:

1. **Clear separation of concerns**: Global vs project-specific scripts
2. **Comprehensive monitoring**: Heartbeat and archive systems
3. **Phase-based development**: Structured patch management
4. **Secret management**: Centralized vault system
5. **Enforcement layer**: System-wide rules and monitoring

### Areas for Improvement:

#### 1. Script Duplication

- **Issue**: Multiple vault management scripts across directories
  - `_global/VAULT/vault-manager.sh` (7K)
  - `_global/dev-tools/vault-manager.sh` (7K)
  - `_global/vault.sh` (859B)
  - `_global/vault-to-env.sh` (494B)
- **Recommendation**: Consolidate into single vault management system

#### 2. Inconsistent Naming

- **Issue**: Mixed naming conventions
  - `ask-gpt.sh` vs `ask_gpt_cli.sh`
  - `gpt-vault-env.sh` vs `vault-to-env.sh`
- **Recommendation**: Standardize naming convention

#### 3. Script Distribution

- **Issue**: Scripts scattered across multiple directories
- **Current**: 13 in `/scripts/`, 8+ in `_global/`, 4 in `tm-mobile-cursor/.backup/`
- **Recommendation**: Consolidate by function and ownership

#### 4. Size Disparities

- **Issue**: Script sizes vary dramatically (78B to 19K)
- **Recommendation**: Standardize script complexity and documentation

#### 5. Ownership Ambiguity

- **Issue**: Some scripts lack clear ownership or purpose
- **Recommendation**: Add ownership headers and purpose documentation

## Recommendations for Reorganization

### 1. Script Consolidation

```
/Users/sawyer/gitSync/scripts/
├── gpt/                        # GPT-related scripts
├── vault/                      # Vault management
├── enforcement/                # System enforcement
├── development/                # Development utilities
└── maintenance/                # Maintenance scripts
```

### 2. Ownership Matrix

- **Global scripts**: Cross-project utilities
- **Project scripts**: Project-specific functionality
- **System scripts**: Infrastructure and enforcement
- **Development scripts**: Build and development tools

### 3. Documentation Standards

- Add purpose headers to all scripts
- Document dependencies and requirements
- Include usage examples
- Specify ownership and maintenance responsibility

### 4. Monitoring Integration

- Integrate all scripts with the heartbeat system
- Add logging and error tracking
- Implement script health monitoring

## Conclusion

The current structure shows sophisticated project management with comprehensive monitoring and phase-based development. However, script organization needs consolidation to reduce duplication, standardize naming, and clarify ownership. The unified cache system provides an excellent foundation for improved organization.

**Next Steps**:

1. Audit and consolidate duplicate scripts
2. Standardize naming conventions
3. Implement ownership documentation
4. Create script dependency mapping
5. Integrate with existing monitoring systems
