# 🧭 Thoughtmarks Task Index — Full Cursor Hybrid Map

This file is the **canonical execution map** for all Cursor hybrid blocks across `v1.3.2` and `v1.4.0`. It enforces execution order, branch safety, and boot-validation logic.

---

## ✅ v1.3.2 — Functional System Enforcement

This is Phase 1 of the system lifecycle. You **must complete this full pass** before beginning any UI refactor or theme work.

| Phase | File Path                                                                           | Description                                  |
| ----- | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| 1     | tasks/v1.3.2/1_v1.3.2_deeplink-siri.cursor-instruction.json                         | Deep Link + Siri Shortcut Handler            |
| 2     | tasks/v1.3.2/2_v1.3.2_auth-onboarding.cursor-instruction.json                       | SignIn, SignUp, Role Onboarding              |
| 3     | tasks/v1.3.2/3_v1.3.2_pin-premium-role.cursor-instruction.json                      | PIN Gating & Premium Upgrade Wrappers        |
| 3.5   | tasks/v1.3.2/3.5_v1.3.2_tokens-refactor.cursor-instruction.json                     | Refactor `tokens` → `designTokens` usage     |
| 4     | tasks/v1.3.2/4_v1.3.2_storekit-premium.cursor-instruction.json                      | StoreKit Purchase, Upgrade, Restore          |
| 4.5   | tasks/v1.3.2/4.5_v1.3.2_syntax-safe-validation.cursor-instruction.json              | ✅ HARD STOP: Boot-safe, lint-pass validator |
| 5     | tasks/v1.3.2/5_v1.3.2_hydration-init.cursor-instruction.json                        | Theme/Auth Hydration Restore & Token Sync    |
| 6     | tasks/v1.3.2/6_v1.3.2_clickable-crawl.cursor-instruction.json                       | Clickable Routing + Missing Page Audit       |
| 7     | tasks/v1.3.2/7_v1.3.2_final-validation.cursor-instruction.json                      | Dry QA Pass + Global Function Audit          |
| 8     | tasks/v1.3.2/8_v1.3.2_unified-clickable-theme-role-enforcer.cursor-instruction.json | Role/Theme Enforcement for All Clickables    |

> ⚠️ `Phase 4.5` must pass **`tsc`, `eslint`, and `expo start`** boot checks before moving forward.

---

## 🧪 v1.4.0 — UI Role Refactor (Phase 2)

These begin on a **new branch**. You must have passed all v1.3.2 phases before starting.

| Phase | File Path                                                               | Description                              |
| ----- | ----------------------------------------------------------------------- | ---------------------------------------- |
| 1     | tasks/v1.4.0/1_v1.4.0_auto-roleview-mapping.cursor-instruction.json     | Apply Roles to Clickables & Containers   |
| 2     | tasks/v1.4.0/2_v1.4.0_theme-role-global-enforce.cursor-instruction.json | Theme Token Overlay by Role Type         |
| 3     | tasks/v1.4.0/3_v1.4.0_glass-morphism-ui.cursor-instruction.json         | Apply Glass Morphism to Cards, Sections  |
| 4     | tasks/v1.4.0/4_v1.4.0_ui-refactor-preflight.cursor-instruction.json     | Surgical Prep of Layout, Casing, Spacing |
| 5     | tasks/v1.4.0/5_v1.4.0_clickable-validation.cursor-instruction.json      | Post-Refactor Navigation + Click Check   |
| 6     | tasks/v1.4.0/6_v1.4.0_final-ui-validation.cursor-instruction.json       | ✅ End State Visual + Routing Integrity  |

---

## 🔐 Safety Enforcement

- All blocks perform:
  - `tsc --noEmit`
  - `eslint`
  - `expo start` boot loop until clean
- Backups created:
  - `.tar.gz` to `/Users/sawyer/gitSync/tm-safety_backups`
  - Pre-run Git commits + tags using `scripts/backup-tag-push.sh`

---

## 📂 Folder Structure

| Path                        | Purpose                                    |
| --------------------------- | ------------------------------------------ |
| `/tasks/v1.3.2/`            | System Functional Blocks + Docs            |
| `/tasks/v1.4.0/`            | UI Refactor + Visual Overhaul Instructions |
| `/scripts/`                 | Git + Safety Utilities                     |
| `/mobile-native-fresh/src/` | App + UI Components                        |
| `/references/`              | Style Guide, Git Rules, Cursor Examples    |
| `/docs/`                    | ROADMAP, AUDIT-RESULTS, CHANGELOG          |
| `/Archive/`                 | ⛔ Deprecated Blocks (Do Not Run)          |

---

## 🛑 Do Not Proceed Without This

You **must pass Phase 4.5 (Safe Syntax Boot Validation)** before executing:

- Any hydration or global theme restoration
- Any UI enforcement, clickability blocks, or morphism overlays

**Failure to boot → rollback to last safe Git tag immediately.**

---

## 🧪 Cursor Usage Quickstart

Run safe validation loop:

```bash
cursor run tasks/v1.3.2/4.5_v1.3.2_syntax-safe-validation.cursor-instruction.json
```

After full functional restore:

```bash
cursor run tasks/v1.3.2/5_v1.3.2_hydration-init.cursor-instruction.json
```

To begin UI refactor (on new branch):

```bash
cursor run tasks/v1.4.0/1_v1.4.0_auto-roleview-mapping.cursor-instruction.json
```

---

> This document supersedes all prior task maps and must be synced with `.cursor-config.json` blockLibrary settings.
