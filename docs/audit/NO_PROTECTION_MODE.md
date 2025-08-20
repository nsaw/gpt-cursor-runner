# Main Without Branch Protection — Guarded by Automation

## Overview
This repository operates without traditional GitHub branch protection rules on `main`. Instead, GREEN integrity is maintained through automated guards and controlled release processes.

## Key Components

### Main Push Guard
- **Purpose**: Automatically reverts unauthorized human pushes to `main`
- **Trigger**: Any push to `main` branch
- **Action**: Reverts to last `green/main` tag
- **Bypass**: GitHub Actions bot pushes are allowed

### Release Gate
- **Purpose**: Only controlled path to update `main`
- **Trigger**: Manual workflow dispatch
- **Process**: 
  1. Validates source branch against all GREEN gates
  2. Tags successful commit as `green/main`
  3. Fast-forwards `main` to validated source

### Green Tag System
- **Tag**: `green/main` marks the last audited GREEN commit
- **Purpose**: Provides rollback point for unauthorized pushes
- **Management**: Automatically updated by release gate

## GREEN Gates (Unchanged)
All traditional GREEN validation remains enforced:
- **ESLint**: 0 errors, warnings ≤ 20
- **TypeScript**: `--noEmit` clean compilation
- **Node-E Guards**: Zero tolerance for inline eval
- **Shebang Guards**: Proper executable headers
- **Pre-commit Parity**: SHA256-locked hooks

## Security Model

### Why This Approach?
- Branch protection removed by design
- Automation provides equivalent safety
- Faster iteration for authorized releases
- Maintains GREEN integrity through guards

### Risk Mitigation
- **Auto-revert**: Unauthorized pushes reverted within ~2 minutes
- **Single path**: Only release gate can advance main
- **Audit trail**: All changes tracked via green tags
- **PAT security**: RELEASE_BOT_PAT rotated regularly

## Usage

### For Developers
- **Normal workflow**: Push to feature branches, create PRs
- **Main access**: Use release gate workflow only
- **Emergency**: Contact repository admin for PAT access

### For Admins
- **Release process**: Use Actions → release-gate workflow
- **Guard management**: Disable via GUARD_ENABLED=false if needed
- **PAT rotation**: Regularly rotate RELEASE_BOT_PAT secret

## Monitoring

### Guard Activity
- Check Actions → main-push-guard for revert events
- Monitor green/main tag movement
- Review release gate execution history

### Alert Conditions
- Frequent guard activations (indicates unauthorized access attempts)
- Release gate failures (indicates GREEN regression)
- Missing green/main tag (indicates system failure)

## Rollback Procedures

### Emergency Rollback
```bash
git fetch --all --tags
git switch main && git reset --hard v2.0.268-P2.11.52
git push origin main --force-with-lease
git tag -f green/main v2.0.268-P2.11.52 && git push origin refs/tags/green/main --force
```

### Guard Disable (Temporary)
Set environment variable: `GUARD_ENABLED=false` in main-push-guard workflow

---
*Last updated: 2025-01-27*
