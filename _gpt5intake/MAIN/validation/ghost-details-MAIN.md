### MAIN Validation, Targets, and Listener Map (Ghost/BRAUN)

- **Validation scripts (names and paths)**
  - /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts/ultra-runtime-validation.sh (npm run validate:ultra-runtime)
  - /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts/strict-runtime-validation.cjs (npm run validate:strict-runtime)
  - /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts/run-maestro-tests.sh
  - /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts/validate-device-runtime.sh
  - /Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/scripts/validate-dual-mount-device.sh

- **PASS criteria**
  - TypeScript: 0 blocking errors; <20 non-blocking in legacy/test only
  - ESLint: 0 blocking errors; <20 warnings in legacy/test only
  - Unit/integration tests: All pass (no critical failures)
  - Expo packager status reachable: curl http://localhost:8081/status contains packager-status:running
  - Maestro flows: no failures; visual regression no diffs
  - Simulator/device logs: no provider/runtime critical errors

- **Key directories (validation artifacts)**
  - Validation JSON/logs: /Users/sawyer/gitSync/.cursor-cache/MAIN/validation
  - Maestro screenshots (unified): /Users/sawyer/gitSync/.cursor-cache/MAIN/validation/screenshots{/,/diff,/current,/baseline,/.failed}
  - Unified project logs: /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/MAIN/

- **Summary and patch routing**
  - Summaries root: /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries
  - Summaries PASS: /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.completed
  - Summaries FAIL: /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.failed
  - Patches inbox: /Users/sawyer/gitSync/.cursor-cache/MAIN/patches
  - Patches PASS: /Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed
  - Patches FAIL: /Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.failed (if enabled by daemon policy)

- **Cursor/Ghost listening directories (exact subpaths)**
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/patches
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.completed
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.failed
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/patches/.archive
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.completed
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.failed
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.archive
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/.heartbeat
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/.logs
  - /Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/MAIN/
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/validation/
  - /Users/sawyer/gitSync/.cursor-cache/MAIN/validation/screenshots

- **Diff/log tail exclusions**
  - node*modules/**, .git/**, *.lock, _.png, _.jpg, _.jpeg, _.gif, \_.psd, ios/**, android/**, web-build/**, .expo/**, .expo-shared/\*\*

- **Webhooks / external endpoints referenced**
  - Expo packager health: http://localhost:8081/status
  - Maestro CLI (local): /Users/sawyer/.maestro/bin/maestro (flows under mobile-native-fresh/maestro)
  - No production webhooks are required for PASS; external Slack/tunnel endpoints are out of scope for runtime validation

- **Core scripts + dependency snapshot (high level)**
  - Node v18+/npm/npx
  - Expo 53 (CLI via npx)
  - TypeScript ~5.8.3, ESLint ^8.57.1 and custom plugins (eslint-plugin-thoughtmarks)
  - Jest ~29.7.0, jest-expo ^53.0.9
  - Maestro installed and on PATH (~/.maestro/bin)

- **Non-interactive helpers (CI-safe)**
  - validate:ultra-runtime (shell; uses timeouts, no prompts)
  - validate:strict-runtime (node; writes JSON results)
  - test:maestro:baseline/test:maestro:visual/test:maestro:screenshots (programmatic)
  - validate-expo-status.sh (non-blocking curl pattern)

- **Operational notes**
  - All curl/tail must follow the subshell + PID + sleep + disown pattern
  - On PASS: patch JSON and .summary.md are moved into .completed
  - On FAIL: the .summary.md is moved into .failed; patch may be left in inbox or mirrored to .failed per policy
  - Expo restarts are always guarded by kill-on-8081 and timeout start

Last updated: 2025-08-09T00:00:00Z
