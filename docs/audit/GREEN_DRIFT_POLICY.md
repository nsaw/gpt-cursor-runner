# GREEN Drift Policy (v2.0.269)
- Required checks are frozen in `.github/required-checks.json`.
- ESLint warnings budget: 20 (fail if exceeded in CI sentry).
- Zero-tolerance: no `node -e` anywhere in active code or workflows.
- On first failure post-merge: auto-issue creation; fix-as-you-go, no bypass.
