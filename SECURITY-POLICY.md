# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

Please report security vulnerabilities to the maintainers via private channels.

## Green Gate Requirements

### Branch Protection Rules

The `main` branch is protected with the following rules:

- **Require pull request reviews before merging**
  - Require 1 approving review
  - Dismiss stale pull request approvals when new commits are pushed
  - Require review from code owners

- **Require status checks to pass before merging**
  - ESLint: 0 errors, ≤20 warnings
  - TypeScript: Clean compilation
  - Tests: All tests must pass
  - Pre-commit hook: Must pass on staged files

- **Restrict pushes that create files that match the specified patterns**
  - Block force pushes to main branch
  - Block deletions of the main branch

### Pre-commit Hook Requirements

All commits to the main branch must pass the pre-commit hook:

- **Node-based execution**: Uses `scripts/nb2_precommit_guard.sh`
- **Staged files only**: Only lints files staged for commit
- **Exclusions enforced**: Ignores `node_modules/`, `_gpt5intake/`, `_backups/`, `.cursor-cache/`, `dist/`, `coverage/`
- **ESLint validation**: 0 errors, ≤20 warnings maximum
- **Automatic blocking**: Commits are blocked if validation fails

### CI/CD Protection

- **Deploy guards**: All deployments require successful test runs
- **Green state enforcement**: Only green builds can be deployed
- **Automated validation**: ESLint, TypeScript, and tests run on every push
- **Manual override prevention**: No force-push to main without explicit approval

### Code Quality Standards

- **ESLint compliance**: All JavaScript/TypeScript files must pass linting
- **TypeScript strict mode**: All type errors must be resolved
- **Test coverage**: Critical paths must have test coverage
- **Documentation**: Security-relevant code must be documented

### Emergency Procedures

In case of security incidents:

1. **Immediate response**: Block affected endpoints/services
2. **Assessment**: Evaluate scope and impact
3. **Fix**: Apply security patches
4. **Verification**: Ensure fixes are effective
5. **Communication**: Notify stakeholders
6. **Post-mortem**: Document lessons learned

## Compliance

This security policy is enforced through:

- Automated CI/CD pipelines
- Pre-commit hooks
- Branch protection rules
- Code review requirements
- Regular security audits

All contributors must comply with these requirements to maintain the security and integrity of the codebase.
