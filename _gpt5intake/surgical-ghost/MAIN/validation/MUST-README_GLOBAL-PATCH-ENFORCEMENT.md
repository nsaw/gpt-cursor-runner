# MAIN Patch Formatting & Versioning Guide (STRICT, 2025-08-03)

```
/Users/sawyer/gitSync/
├── .cursor-cache/              # UNIFIED TARGET
│   ├── CYOPS/
│   │   ├── summaries/          # ONLY location for summary files FOR CYOPS
│   │   ├── patches/            # ONLY location for patch target execution FOR CYOPS
│   │   └── .logs/              # ONLY location for LOGS
│   └── MAIN/
│       ├── summaries/          # ONLY location for summary files FOR MAIN
│       └── patches/            # ONLY location for patch target execution FOR MAIN
├── _backups/                   # LOCAL 'FREEZER' TAR.GZ BACKUP TARGET
│   ├── tm-safety_backups/      # BACKUP TARGET FOR MAIN
│   └── gpt-cursor-runner/      # BACKUP TARGET FOR CYOPS (GHOST-RUNNER AKA GHOST)
├── gpt-cursor-runner/          # Project: CYOPS (AGENT DEV)
├── tm-mobile-cursor/           # Project: MAIN (AGENT BRAUN) PROJECT REPO
│   └── mobile-native-fresh/    # MAIN PROJECT ROOT
├── thoughtpilot-commercial/    # COMMERCIAL PACKAGING OF GHOST, 'THOUGHTMARKS AI'
│
.
.
.
└── [other projects]/
```

# PATCH ENFORCEMENT & FORMAT RULES — BRAUN/MAIN (STRICT, 2025-08-06)

patch_block_must_include:

- blockId: "Versioned patch identifier (see versioning rules)"
- phase: "Patch phase (e.g. '6.5.01')"
- description: "Human-readable summary of patch"
- enforcement_flags:
  - enforceValidationGate: true
  - strictRuntimeAudit: true
  - runDryCheck: true
  - forceRuntimeTrace: true
  - requireMutationProof: true
  - requireServiceUptime: true
  - blockCommitOnError: true
  - watchConsole: true
- execution:
  - autoReleaseTimeoutMs: 30000 # or >30s if required
  - onReloadHang: "Move to background and resume automatically"
- preMutationBuild: "(optional) Pre-check commands (e.g. backup, lint, tsc)"
- postMutationBuild:
  shell: - "npm run validate:ultra-runtime" - "pre-commit run --all-files" # Automated fix cycle (non-blocking): repeatedly apply safe fixers then re-validate until thresholds are met or max attempts reached - |
  (
  cd /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh
  ATTEMPTS=0; MAX_ATTEMPTS=5
  while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do # Apply ESLint/text fixers (safe)
  timeout 30s npm run lint:fix-all &
  PID1=$!; sleep 5; disown $PID1
              # Re-run TypeScript + ESLint checks (non-blocking guards)
              timeout 30s npx tsc --noEmit --skipLibCheck & PID2=$!; sleep 5; disown $PID2
              timeout 30s npx eslint . --ext .ts,.tsx --max-warnings=0 & PID3=$!; sleep 5; disown $PID3
              ATTEMPTS=$((ATTEMPTS+1))
  done
  ) >/dev/null 2>&1 & - "(timeout 30s npx tsc --noEmit --skipLibCheck & disown)" - "(timeout 30s npx eslint . --ext .ts,.tsx --max-warnings=0 & disown)" - "(timeout 30s npm run test:unit -- --watchAll=false & disown)" - |
  (
  kill $(lsof -ti:8081) 2>/dev/null || true
            cd /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh
            timeout 30s npx expo start --ios --clear &
            PID=$!
  sleep 15
  disown $PID
          ) >/dev/null 2>&1 &
        - "(timeout 30s npm run test:maestro:baseline & disown)"
        - "(timeout 30s npm run test:maestro:visual & disown)"
        - |
          (
            if curl --silent --max-time 10 http://localhost:8081/status 2>/dev/null | grep -q 'packager-status:running'; then
              echo "✅ Expo packager running"
            else
              echo "❌ Expo packager not running"
            fi
          ) &
          PID=$!
  sleep 10
  disown $PID

  # All steps MUST run non-blocking (timeout + disown)

  # Patch is INVALID if any command above fails, or if validation logs are missing

- validate: "(optional) Standalone validation steps; MUST include Maestro/visual regression"
- successCriteria:
  - "TypeScript: 0 blocking errors, <20 non-blocking errors/warnings (legacy/test only)"
  - "ESLint: 0 blocking errors, <20 warnings (legacy/test only)"
  - "Expo app launches, renders navigation, NO critical runtime errors"
  - "Unit/integration tests: All PASS"
  - "Maestro visual validation: 0 diffs/failures; must parse and reject on any fail"
  - "Expo/Metro running, interactive"
  - "On PASS: patch JSON and its .summary.md moved to their respective .completed/ folders"
- failureMode: "(optional) Abort/rollback on ANY failed gate, log and exit"
- summaryFile: "Absolute path to .md summary file for each patch"

validation_and_enforcement_rules:

- All postMutationBuild.shell steps MUST run, log output, and return a non-error status to be marked as PASS
- No patch can mark as complete unless ALL gates pass (tsc, eslint, tests, expo, maestro, runtime)
- Patch is INVALID if Maestro/screenshot regression fails, or Expo/app fails to launch or refresh
- Patch is INVALID if Node.js tools (npm, npx) are missing or fail
- Patch is INVALID if any required dependency (component, service, screen) is missing at runtime
- On ANY gate fail, patch must HALT, rollback, and write a summary
- validate:ultra-runtime MUST run an automated, silent fix cycle (ESLint fixers, text fixers) and re-run TypeScript/ESLint until thresholds are satisfied or MAX_ATTEMPTS is reached; exceeding MAX_ATTEMPTS = FAIL
- All curl and tail operations MUST follow the project disown pattern (subshell + PID capture + sleep + disown)

artifact_targets:
validation: - "/Users/sawyer/gitSync/.cursor-cache/MAIN/validation" # strict/ultra runtime results (JSON, logs) - "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/maestro/test-results" # Maestro JUnit + screenshots
screenshots: - "/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/maestro/test-results/screenshots"
summaries: - "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries" # live summaries root - "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.completed" # PASS - "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.failed" # FAIL
logs: - "/Users/sawyer/gitSync/.cursor-cache/MAIN/.logs" - "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.heartbeat"

listening_directories (Cursor/Ghost watchers):

- "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches" # patch inbox
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed"
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.failed"
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.archive"
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries"
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.completed"
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.failed"
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.archive"
- "/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/MAIN/" # unified logs root
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/validation/" # validation artifacts
- "/Users/sawyer/gitSync/.cursor-cache/MAIN/validation/screenshots" # unified screenshots

post_run_file_movements:
on_success (PASS): - "Move patch JSON -> /Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed/" - "Move summary .md -> /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.completed/"
on_failure (FAIL): - "Move summary .md -> /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.failed/" - "Patch JSON may remain for re-run or be mirrored to /Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.failed/ per daemon policy"

exclude_globs_for_diffs_and_log_tails:

- "node_modules/\*\*"
- ".git/\*\*"
- "\*.lock"
- "\*.png"
- "\*.jpg"
- "\*.jpeg"
- "\*.gif"
- "\*.psd"
- "ios/\*\*"
- "android/\*\*"
- "web-build/\*\*"
- ".expo/\*\*"
- ".expo-shared/\*\*"

# 🚨 CRITICAL RUNTIME VALIDATION ENFORCEMENT SUMMARY

**Agent:** BRAUN (MAIN)  
**Date:** 2025-08-07  
**Status:** CRITICAL FAILURE (NO ADVANCEMENT ALLOWED)

## VALIDATION REQUIREMENTS

- [x] Node.js, npm, npx present and functional
- [x] TypeScript: 0 blocking errors
- [x] ESLint: 0 blocking errors (legacy/test warnings OK)
- [x] Unit tests: All pass (no critical failures)
- [x] Expo server: Boots, packs, and is reachable on :8081
- [x] App boots in simulator/device (not just builds!)
- [x] Maestro/screenshot UI: All diffs green, no errors in baseline/regression
- [x] **Manual console/terminal check for runtime errors and context/provider bugs**
- [x] NO patch may pass unless all above checks are GREEN

## ROOT CAUSE ANALYSIS

- Runtime errors (e.g., "useVoiceRecorder must be used within a VoiceRecorderProvider") bypassed validation because post-mutation checks were not actually run/parsed.
- Expo/Metro server and simulator logs must be parsed for errors after every refresh.
- Maestro/visual regression not enforced on last batch.

## HARDENING STEPS

1. Added direct shell validation (see `validate-runtime.sh`)
2. Provider composition statically and dynamically audited
3. Validation gates are now **non-bypassable** (must parse logs, runtime, and visual checks)
4. Zero optimism: NO PASS unless app is proven running, error-free, and visually correct in simulator

**No phase or patch advancement allowed until this process is followed and summary logs prove green at every step.**

---

_Last revised: 2025-08-07_

---

# PATH ENFORCEMENT AND SRC-LOCK / SRC-NEXTGEN-LOCK

forbidden_patterns:

- 'src/' in root directory
- 'src-nextgen/' in root directory
- 'src/' in ./mobile-native-fresh
- Direct mutation of node_modules or system files
- Skipping any validation, even if summary says PASS

patch_naming_and_location:

- All patches must be named: 'patch-v\*'
- All patches placed: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/<subdir>'
- No patches allowed outside this structure

versioning_format:
example: 'patch-v1.4.9999(P6.5.01)\_slug-description.json'
breakdown: - vX.Y.ZZ = major.minor.patch - (PN.MM.SS) = Phase.Section.Subsection - slug = kebab-case patch name

# KEY ENFORCEMENT:

enforcement_summary:

- Expo refresh and Maestro validation are MANDATORY and non-bypassable
- Success requires both code (tsc/eslint/tests) AND visual validation (maestro/screenshots)
- No patch may skip validation, backgrounding, or summary writeback
- Audit/rollback required on every failure, with explicit summary update
- No exceptions without written override from the Captain

last_revised: "2025-08-06 by GPT/BRAUN enforcement"

---

**Last revised: 2025-08-05 by GPT/BRAUN enforcement.**
