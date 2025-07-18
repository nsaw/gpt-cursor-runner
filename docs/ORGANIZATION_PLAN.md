# File Organization Plan for CYOPS Projects

## GPT-Cursor-Runner Project Organization

### Current Root Directory Files to Organize:

#### Configuration Files (→ config/)
- `.cursor-config.json`
- `.cursor-safeguards.json`
- `.eslintrc.js`
- `eslint.config.js`
- `.gitignore`
- `.dockerignore`
- `.orign-dockerignore.bak`
- `tsconfig.json` (if exists)
- `pyproject.toml`
- `setup.py`
- `requirements.txt`
- `package.json`
- `package-lock.json`
- `fly.toml`
- `Dockerfile`
- `env.example`
- `app.json` (if exists)
- `eas.json` (if exists)
- `metro.config.cjs` (if exists)

#### Documentation Files (→ docs/)
- `README.md`
- `CHANGELOG.md`
- `CURSOR_DEVELOPMENT_GUIDE.md`
- `CLOUDFLARE_TUNNEL_MIGRATION.md`
- `QUICK_START_GRANITE_MIGRATION.md`
- `SLACK_GRANITE_MIGRATION_GUIDE.md`
- `SLACK_COMMANDS_IMPLEMENTATION.md`
- `SLACK_COMMANDS_VERIFICATION.md`
- `SLACK_DASHBOARD_COMPLETION_SUMMARY.md`
- `SLACK_DISPATCH_USAGE.md`
- `SLACK_COMMAND_CHEATSHEET.md`
- `SECRETS_MANAGEMENT.md`
- `TERMINAL_SAFETY_PROTOCOL.md`
- `WATCHDOG_DAEMON.md`
- `WATCHDOG_REFACTOR_COMPLETION.md`
- `WATCHDOG_REFACTOR_SUMMARY.md`
- `SYSTEM_STATUS_REPORT.md`
- `SYSTEMS_GO_IMPLEMENTATION_SUMMARY.md`
- `TM_MOBILE_CURSOR_UPGRADE_ANALYSIS.md`
- `TODO_CLEANUP_SUMMARY.md`
- `TODO_COMPLETION_SUMMARY.md`
- `PERSONALIZATION_PROFILE.md`
- `CONTRIBUTING.md` (if exists)
- `SETUP.md` (if exists)
- `ANDROID_SETUP.md` (if exists)
- `FIREBASE_SETUP.md` (if exists)

#### Scripts and Automation (→ scripts/)
- `apply_all_patches.py`
- `test.py`
- `test.tsx`
- `test_slack_commands.py`
- `cursor_runner_selfcheck_v1.sh`
- `runner-diagnose.sh`
- `run-combined.sh`
- `setup-real-env.sh`
- `deploy-to-fly.sh`
- `post-cheatsheet.sh`
- `update-slack-app-manifest.sh`
- `vault-to-env.sh`
- `prestart.sh`
- `deploy-slack-app-manifest.sh`
- `setup-slack-commands-manual.sh`
- `register-all-slack-commands.sh`
- `watchdog.sh`
- `watchdog-cron-entries.txt`

#### Data and Logs (→ data/)
- `event-log.json`
- `patch-log.json`
- `test_ping.json`
- `patch-metrics.json`
- `feature-bundle_ui-dashboard_slash-preview_release.json`
- `logs.zip`
- `deploy.log`

#### Lock and State Files (→ state/)
- `.repair-bridge.lock`
- `.ghost-auto-init.lock`
- `.crash.lock`
- `.cursor-failed-blocks.json`
- `.runner.locked`
- `.cursor-patch-log.json`
- `status.md`

#### Slack Configuration (→ slack/)
- `slack-app-manifest.yaml`
- `slack-app-manifest-v2.yaml`

#### Temporary and Backup Files (→ temp/)
- `tmp_test_target.tsx.bak_20250707_000524`
- `tmp_test_target.tsx.bak_20250707_000523`

#### Test Files (→ tests/)
- `test-simple.tsx` (if exists)
- `test-unwrapped-text.tsx` (if exists)

### TM-Mobile-Cursor Project Organization

#### Configuration Files (→ config/)
- `.cursor-config.json`
- `.cursor-safeguards.json`
- `.eslintrc.cjs`
- `.gitignore`
- `app.json`
- `eas.json`
- `metro.config.cjs`
- `tsconfig.json`
- `package.json`
- `package-lock.json`

#### Documentation Files (→ docs/)
- `README.md`
- `CHANGELOG-UI-REFACTOR.md`
- `CONTRIBUTING.md`
- `ANDROID_SETUP.md`
- `FIREBASE_SETUP.md`
- `LINTING_PROGRESS_REPORT.md`
- `SETUP.md`
- `TAGCHIP_FIX_SUMMARY.md`
- `THEMING_ARCHITECTURE_FINAL.md`
- `THEMING_ENFORCEMENT_SUMMARY.md`
- `THEMING_REFACTOR_SUMMARY.md`
- `UI-REFINEMENT-FINAL-CHANGELOG.md`
- `role-audit-report.md`

#### Scripts and Automation (→ scripts/)
- `get-sha1.sh`
- `import-env-to-1pw.sh`
- `refactor-tokens.cjs`
- `fix-spacing-issues.cjs`

#### Data and Configuration (→ data/)
- `google-services.json`
- `index.ts`

#### Test Files (→ tests/)
- `test-simple.tsx`
- `test-unwrapped-text.tsx`

#### Temporary Files (→ temp/)
- `run`

## Implementation Strategy

### Phase 1: Create Directory Structure
1. Create new directories in both projects
2. Move files to appropriate directories
3. Update all import paths and references

### Phase 2: Update Configuration Files
1. Update package.json scripts to reflect new paths
2. Update pyproject.toml paths
3. Update any hardcoded file references

### Phase 3: Update Documentation
1. Update README files with new structure
2. Update any documentation that references old paths

### Phase 4: Verify Functionality
1. Run tests to ensure everything works
2. Check that all imports and references are correct
3. Verify build processes still work

## Directory Structure After Organization

### GPT-Cursor-Runner
```
gpt-cursor-runner/
├── config/           # Configuration files
├── docs/            # Documentation
├── scripts/         # Scripts and automation
├── data/            # Data files and logs
├── state/           # Lock and state files
├── slack/           # Slack configuration
├── temp/            # Temporary files
├── tests/           # Test files
├── assets/          # (existing)
├── gpt_cursor_runner/ # (existing)
├── server/          # (existing)
├── scripts/         # (existing - merge with new scripts/)
├── tasks/           # (existing)
├── logs/            # (existing)
├── patches/         # (existing)
├── summaries/       # (existing)
└── ... (other existing dirs)
```

### TM-Mobile-Cursor
```
mobile-native-fresh/
├── config/          # Configuration files
├── docs/            # Documentation
├── scripts/         # Scripts and automation
├── data/            # Data files
├── tests/           # Test files
├── temp/            # Temporary files
├── src/             # (existing)
├── assets/          # (existing)
├── backend/         # (existing)
├── android/         # (existing)
├── scripts/         # (existing - merge with new scripts/)
├── docs/            # (existing - merge with new docs/)
└── ... (other existing dirs)
``` 