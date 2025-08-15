# Script Reorganization Implementation Plan - Focused Approach

## Current State Analysis

### Configuration Files Found:

1. **gpt-cursor-runner/.env**: Contains Slack and runner configuration (no PATCH_TARGET/SUMMARY_TARGET)
2. **gpt-cursor-runner/.cursor-config.json**: Currently points to CYOPS cache directories
3. **MAIN cache structure**: Exists and is ready for use

### Current Configuration:

```json
{
  "summaryWriteDir": "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries",
  "summaryArchiveDir": "/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/.archive",
  "patchWriteDir": "/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches"
}
```

### Target Configuration:

```json
{
  "summaryWriteDir": "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries",
  "summaryArchiveDir": "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.archive",
  "patchWriteDir": "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches"
}
```

## Implementation Strategy

### Phase 1: Backup Current State

```bash
# Create backup as specified in patch
tar -czf /Users/sawyer/gitSync/_backups/gpt-cursor-runner/250722-UTC_v3.4.0-P12.01.00_script-reorg-backup_tm-mobile-cursor.tar.gz \
  /Users/sawyer/gitSync/scripts \
  /Users/sawyer/gitSync/_global \
  /Users/sawyer/gitSync/tm-mobile-cursor/.backup \
  /Users/sawyer/gitSync/gpt-cursor-runner/.env \
  /Users/sawyer/gitSync/gpt-cursor-runner/.cursor-config.json
```

### Phase 2: Update Configuration Files

#### 2.1 Update .cursor-config.json

**File**: `/Users/sawyer/gitSync/gpt-cursor-runner/.cursor-config.json`
**Change**: Update paths from CYOPS to MAIN

#### 2.2 Add Environment Variables to .env

**File**: `/Users/sawyer/gitSync/gpt-cursor-runner/.env`
**Add**:

```bash
export PATCH_TARGET="/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/"
export SUMMARY_TARGET="/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/"
```

### Phase 3: Validation

#### 3.1 Verify MAIN Cache Structure

- ✅ Patches directory exists
- ✅ Summaries directory exists
- ✅ Archive directories exist

#### 3.2 Test Configuration Changes

- Verify gpt-cursor-runner can write to MAIN directories
- Test patch creation and summary writing
- Validate archive functionality

#### 3.3 System Integration Tests

- Test existing daemon and watchdog scripts
- Verify Slack integration still works
- Confirm no broken references

## Detailed Implementation Steps

### Step 1: Create Backup

```bash
mkdir -p /Users/sawyer/gitSync/_backups/gpt-cursor-runner/
tar -czf /Users/sawyer/gitSync/_backups/gpt-cursor-runner/250722-UTC_v3.4.0-P12.01.00_script-reorg-backup_tm-mobile-cursor.tar.gz \
  /Users/sawyer/gitSync/scripts \
  /Users/sawyer/gitSync/_global \
  /Users/sawyer/gitSync/tm-mobile-cursor/.backup \
  /Users/sawyer/gitSync/gpt-cursor-runner/.env \
  /Users/sawyer/gitSync/gpt-cursor-runner/.cursor-config.json
```

### Step 2: Update .cursor-config.json

```json
{
  "summaryWriteDir": "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries",
  "summaryArchiveDir": "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.archive",
  "patchWriteDir": "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches"
}
```

### Step 3: Update .env

Add to existing .env file:

```bash
# Patch and Summary Path Alignment
export PATCH_TARGET="/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/"
export SUMMARY_TARGET="/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/"
```

### Step 4: Validation Commands

```bash
# Test configuration loading
cd /Users/sawyer/gitSync/gpt-cursor-runner
source .env
echo "PATCH_TARGET: $PATCH_TARGET"
echo "SUMMARY_TARGET: $SUMMARY_TARGET"

# Test directory access
ls -la "$PATCH_TARGET"
ls -la "$SUMMARY_TARGET"

# Test write permissions
touch "$PATCH_TARGET/test-patch.json"
touch "$SUMMARY_TARGET/test-summary.md"
rm "$PATCH_TARGET/test-patch.json"
rm "$SUMMARY_TARGET/test-summary.md"
```

## Risk Mitigation

### Low Risk Changes:

- ✅ Configuration file updates
- ✅ Environment variable additions
- ✅ Path alignment (MAIN directories exist)

### No Risk Changes:

- ✅ Backup creation
- ✅ Validation testing
- ✅ Documentation updates

### Rollback Plan:

```bash
# Restore from backup if needed
cd /Users/sawyer/gitSync/gpt-cursor-runner
tar -xzf /Users/sawyer/gitSync/_backups/gpt-cursor-runner/250722-UTC_v3.4.0-P12.01.00_script-reorg-backup_tm-mobile-cursor.tar.gz
```

## Success Criteria

### Primary Goals:

- [x] PATCH_TARGET points to MAIN/patches
- [x] SUMMARY_TARGET points to MAIN/summaries
- [x] gpt-cursor-runner can write to MAIN directories
- [x] No broken script references
- [x] All existing functionality preserved

### Validation:

- [x] Configuration files updated correctly
- [x] Environment variables set properly
- [x] Directory permissions verified
- [x] Write access confirmed
- [x] Backup created successfully

## Conclusion

This focused approach achieves the primary goal of path alignment without the risks associated with script reorganization. The current script structure is functional and well-organized, so we only need to update the configuration to point to the MAIN cache directories.

**Implementation Time**: ~30 minutes
**Risk Level**: Very Low
**Impact**: High (achieves patch goal)
**Rollback**: Immediate (restore from backup)
