## Branch Strategy Matrix

| Phase   | Feature Branch                     |
| ------- | ---------------------------------- |
| Phase 2 | feature/phase-2-validation         |
| Phase 3 | feature/phase-3-ui-rebuild         |
| Phase 4 | feature/phase-4-ghost-finalization |
| ...     | feature/phase-N-\*                 |

## Optional Staging Forks

- `staging/phase-3-testing`
- `review/phase-3-pr`

## Justification

✅ **Why Phase-Specific Feature Branches Are Critical**

| ✅ Benefit     | Explanation                                             |
| -------------- | ------------------------------------------------------- |
| Isolation      | Keeps partial progress or bugs from leaking into `main` |
| Rollback Power | You can nuke a branch without affecting `main`          |
| PR Clarity     | Enables clean, focused GitHub PRs                       |
| CI/CD Sanity   | Lint/test/deploy can be scoped per phase                |
| Parallel Work  | Collaborators can work in parallel safely               |
| Tag Safety     | Prevents tag pollution or overwrite on `main`           |
