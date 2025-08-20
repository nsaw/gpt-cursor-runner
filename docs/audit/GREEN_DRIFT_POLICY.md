# GREEN Drift Policy (v2.0.270)
- Required checks are frozen in `.github/required-checks.json`.
- ESLint warnings budget: 20 (fail if exceeded in CI sentry).
- Zero-tolerance: no `node -e` anywhere in active code or workflows.
- On first failure post-merge: auto-issue creation; fix-as-you-go, no bypass.
- **Auto-remediation**: Default='no auto-revert'; use manual 'Revert' via GitHub UI or protected bot once approved.
- **Artifacting**: SARIF-like drift findings emitted to `.cursor-cache/ROOT/.logs/drift-findings.json`.
- **Observability**: Weekly reports track checks parity, warning budget history, open drift issues, and MTTR to GREEN.
