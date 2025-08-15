# Ultra Runtime Validation System

## Overview

This comprehensive validation system provides **"no optimism" protection** for the mobile app by combining multiple validation approaches with proper non-blocking patterns. It follows the MUST-README_GLOBAL-PATCH-ENFORCEMENT.md guidelines and addresses the specific runtime issues you've been experiencing.

## Critical Validation Requirements

A patch or commit is considered valid ONLY if it meets ALL of these requirements:

### Static Analysis

- **TypeScript**: 0 blocking errors, <20 warnings (allowed only in legacy/test files)
- **ESLint**: 0 blocking errors, <20 warnings (allowed only in legacy/test files)

### Runtime Validation

- **Provider/Context**: 0 errors (any "must be used within a Provider" = FAIL)
- **Runtime Logs**: 0 critical errors in logs, console, simulator, or device
- **UI/Visual**: 0 Maestro test failures or visual regressions
- **Component**: 0 registration or mounting errors

### Test Coverage

- **Unit Tests**: 100% pass rate for critical paths
- **Integration Tests**: 0 failures in core functionality
- **Provider Audit**: 0 provider wrapping issues

### Performance (Future)

- **Load Time**: < 2s initial render
- **Memory Usage**: < 200MB peak
- **Frame Rate**: > 55fps for critical paths

## Components

### 1. Provider Audit Utilities (`src-nextgen/utils/auditProviderUsage.tsx`)

**Purpose**: Automated detection of provider/context wrapping issues that cause "must be used within a Provider" errors.

**Features**:

- Tests all screens with their required providers
- Catches missing provider wrapping before runtime
- Provides detailed error reporting
- Supports all major providers: VoiceRecorderProvider, ThemeProvider, AuthProvider, NavigationProvider

**Critical Requirements**:

- **MUST FAIL CI/CD** if any screen/hook throws a provider error
- **MUST FAIL BUILD** if any provider is missing or incorrectly wrapped
- **MUST BLOCK DEPLOYMENT** if provider audit fails
- **ZERO TOLERANCE** for provider/context runtime errors

**Usage**:

```bash
npm run test:provider-audit
```

### 2. Hook Usage Audit Script (`scripts/audit-hooks.js`)

**Purpose**: Static analysis to find all uses of context hooks and identify potential provider wrapping issues.

**Features**:

- Scans all TypeScript/TSX files for hook usage
- Identifies files that may need provider wrapping
- Provides detailed usage breakdown
- Generates recommendations for fixes

**Validation Requirements**:

- **Manual Review Required**: Results must be reviewed by developer
- **Hard Enforcement**: Must be tied to provider audit tests
- **Zero Tolerance**: Any unprotected hook usage blocks deployment
- **Documentation**: All hook usage must be mapped to providers

**Usage**:

```bash
npm run audit:hooks
```

### 3. Jest Test Suite (`__tests__/providerAudit.test.tsx`)

**Purpose**: Automated testing of provider/hook combinations to catch runtime errors.

**Features**:

- Tests each screen with its required providers
- Fails if any screen throws provider errors
- Integrates with CI/CD pipeline
- Provides clear error messages

**Critical Test Requirements**:

- **100% Pass Rate Required**: All provider tests must pass
- **No Skip/Pending**: All tests must be active and passing
- **CI/CD Integration**: Must block pipeline on any failure
- **Runtime Simulation**: Must test actual component mounting

**Usage**:

```bash
npm run test:provider-audit
```

### 4. Ultra Runtime Validation Script (`scripts/ultra-runtime-validation.sh`)

**Purpose**: Comprehensive validation that combines all approaches with proper non-blocking patterns.

**Features**:

- 14-step validation process
- Non-blocking patterns for all commands
- Timeout protection for all operations
- Comprehensive error detection
- Integration with existing validation scripts

**Critical Validation Rules**:

- **Early Exit**: Must fail fast on critical errors
- **Zero Tolerance**: Any critical error blocks deployment
- **Non-Blocking**: All commands must use timeout and background patterns
- **Log Analysis**: Must verify all background task outputs
- **Hard Failures**: TypeScript, ESLint, Provider, Runtime, UI errors are blocking
- **Soft Warnings**: Only allowed in pre-approved legacy/test files

**Usage**:

```bash
npm run validate:ultra-runtime
```

## Validation Steps

The ultra validation script performs these steps in order. **Any critical failure halts execution immediately.**

1. **Toolchain Validation**: Node.js, npm, npx, Expo CLI
   - _Critical Failure_: Any tool missing or incorrect version

2. **TypeScript Compilation**: Static type checking
   - _Critical Failure_: Any blocking error
   - _Soft Warning_: <20 warnings in legacy/test files only

3. **ESLint Validation**: Code quality and style
   - _Critical Failure_: Any blocking error
   - _Soft Warning_: <20 warnings in legacy/test files only

4. **Unit/Integration Tests**: Jest test suite
   - _Critical Failure_: Any test failure in critical paths
   - _Soft Warning_: Skipped tests in non-critical paths

5. **Provider Audit Tests**: Provider/hook usage validation
   - _Critical Failure_: Any provider error or missing wrapper
   - _Zero Tolerance_: All provider tests must pass

6. **Hook Usage Audit**: Static analysis of hook usage
   - _Critical Failure_: Any unprotected hook usage
   - _Manual Review_: Required for new hook implementations

7. **Expo/Metro Boot**: Non-blocking Expo server startup
   - _Critical Failure_: Server fails to start
   - _Warning_: Slow startup (>30s)

8. **Expo Status Check**: Verify server is responding
   - _Critical Failure_: Server not responding
   - _Warning_: High latency (>2s)

9. **Maestro Visual/Regression Tests**: UI automation testing
   - _Critical Failure_: Any test failure or visual regression
   - _Zero Tolerance_: All UI tests must pass

10. **Simulator Log Analysis**: Runtime error detection
    - _Critical Failure_: Any runtime error in logs
    - _Zero Tolerance_: Provider/context errors

11. **Device Runtime Validation**: Device-specific error checking
    - _Critical Failure_: Any device-specific crash
    - _Warning_: Performance issues

12. **Dual Mount Validation**: Legacy/NextGen compatibility
    - _Critical Failure_: Any mounting error
    - _Warning_: Legacy compatibility issues

13. **Screenshot/UI Diff Validation**: Visual regression testing
    - _Critical Failure_: Any visual regression
    - _Warning_: Minor pixel differences (<1%)

14. **Final Health Check**: Overall system health
    - _Critical Failure_: Any remaining error condition
    - _Warning_: Resource usage above thresholds

**NOTE**: Expo/Metro boot success does NOT guarantee runtime or UI validation. All logs and screens must be verified.

## Non-Blocking Patterns

All commands use proper non-blocking patterns to prevent terminal blocking:

### Standard Pattern

```bash
(
  timeout Xs command &
  PID=$!
  sleep Y
  disown $PID
) >/dev/null 2>&1 &
```

### Timeout Guidelines

- **Short operations**: 10s max (toolchain checks, status checks)
- **Medium operations**: 30s max (TypeScript, ESLint, provider audits)
- **Long operations**: 60s max (tests, device validation)
- **Expo operations**: 120s max (server startup, bundling)

### Error Prevention

- **Always use timeout**: Prevents infinite hanging
- **Background execution**: Keeps terminal responsive
- **Process disowning**: Prevents zombie processes
- **Output redirection**: Prevents log flooding

## Error Detection

The system detects and reports these critical error patterns:

### Provider/Context Errors

- `must be used within a Provider`
- `No provider found`
- `Provider.*not found`
- `Context.*not found`
- `useContext.*called outside`

### Runtime Errors

- `TypeError`
- `undefined is not an object`
- `Cannot read property`
- `Invariant Violation`
- `Component.*has not been registered`

### UI/Visual Errors

- Maestro test failures
- Visual regressions
- Screenshot mismatches
- Navigation errors

### Test Failures

- Jest test failures
- Provider audit failures
- Hook usage violations
- Critical integration failures

## Integration with Existing Scripts

The ultra validation script integrates with these existing validation scripts:

1. **validate-device-runtime.sh**: Device-specific error detection
2. **validate-dual-mount-device.sh**: Legacy/NextGen compatibility
3. **strict-runtime-validation.cjs**: Node.js-based validation
4. **validate-runtime-alternative.sh**: Alternative validation approach

### Integration Requirements

- All integrated scripts must follow non-blocking patterns
- All integrated scripts must use proper timeout protection
- All integrated scripts must provide clear error reporting
- All integrated scripts must respect critical failure thresholds

## Configuration

### Environment Variables

- `ROOT_DIR`: Project root directory
- `LOG_DIR`: Log output directory
- `VALIDATION_DIR`: Validation results directory
- `EXPO_PORT`: Expo development server port

### Output Directories

- Logs: `/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh/logs`
- Validation results: `/Users/sawyer/gitSync/.cursor-cache/MAIN/validation`

## Error Handling

### Critical Failures (Exit Code 1)

These errors MUST halt execution and block deployment:

1. **Static Analysis**
   - TypeScript: Any blocking error
   - ESLint: Any blocking error
   - Provider Audit: Any provider error
   - Hook Usage: Any unprotected hook

2. **Runtime Validation**
   - Expo: Server fails to start
   - Simulator: Any runtime error
   - Device: Any crash or fatal error
   - UI: Any Maestro test failure

3. **Visual Validation**
   - Screenshots: Any visual regression
   - UI Components: Any rendering error
   - Navigation: Any routing error

### Non-Critical Warnings

These issues may continue execution but must be logged:

1. **Legacy/Test Files Only**
   - TypeScript: <20 warnings
   - ESLint: <20 warnings
   - Test Coverage: Non-critical path gaps

2. **Performance Warnings**
   - Expo: Slow startup (>30s)
   - API: High latency (>2s)
   - UI: Minor visual differences (<1%)

3. **Development Mode Only**
   - Hook Usage: New implementations (with review)
   - Device: Non-fatal performance issues
   - Legacy: Compatibility warnings

### Zero Tolerance Areas

These MUST NEVER be ignored or marked as warnings:

1. **Provider/Context Errors**
   - Missing providers
   - Incorrect provider hierarchy
   - Unprotected hook usage

2. **Runtime Errors**
   - TypeError or undefined errors
   - Component registration failures
   - Navigation state corruption

3. **Critical UI/UX**
   - Major visual regressions
   - Navigation failures
   - Data loss scenarios

## Benefits

1. **No Terminal Blocking**: All commands use proper non-blocking patterns
2. **Comprehensive Coverage**: Tests all critical aspects of the app
3. **Early Error Detection**: Catches issues before they reach production
4. **Automated Validation**: Reduces manual testing effort
5. **Clear Error Reporting**: Provides actionable error messages
6. **CI/CD Integration**: Works with automated pipelines

## Troubleshooting

### Common Issues and Required Actions

1. **Expo Server Not Starting**
   - _Critical Check_: Port 8081 availability
   - _Required Action_: Kill any existing Metro processes
   - _Validation_: Must see "Expo server running" in logs

   ```bash
   # Kill existing processes
   kill $(lsof -ti:8081) || true
   ```

2. **Provider Audit Failures**
   - _Critical Check_: Provider hierarchy in App.tsx
   - _Required Action_: Fix ALL provider wrapping issues
   - _Validation_: Must pass provider audit with zero errors

   ```bash
   # Run focused provider audit
   npm run test:provider-audit -- --verbose
   ```

3. **Hook Usage Issues**
   - _Critical Check_: All hooks inside providers
   - _Required Action_: Fix ANY unprotected hook usage
   - _Validation_: Must pass hook audit with zero errors

   ```bash
   # Run detailed hook analysis
   npm run audit:hooks -- --verbose
   ```

4. **Simulator Log Errors**
   - _Critical Check_: No runtime/provider errors
   - _Required Action_: Fix ALL runtime errors
   - _Validation_: Clean simulator logs required
   ```bash
   # Monitor simulator logs
   xcrun simctl spawn booted log stream --level error
   ```

### Debug Modes

1. **Verbose Provider Validation**

   ```bash
   npm run test:provider-audit -- --verbose
   ```

2. **Detailed Hook Analysis**

   ```bash
   npm run audit:hooks -- --verbose
   ```

3. **Full Runtime Validation**

   ```bash
   bash scripts/ultra-runtime-validation.sh --debug
   ```

4. **UI/Visual Testing**
   ```bash
   npm run test:maestro:visual -- --verbose
   ```

### Critical Error Resolution

1. **Provider/Context Errors**
   - MUST fix immediately
   - MUST NOT continue deployment
   - MUST verify fix with provider audit

2. **Runtime Errors**
   - MUST capture full stack trace
   - MUST fix root cause
   - MUST verify in both dev/prod

3. **Visual Regressions**
   - MUST document with screenshots
   - MUST fix UI discrepancies
   - MUST pass Maestro tests

## Future Enhancements

### Phase 1: Performance & Resource Monitoring

1. **Performance Metrics**
   - Load time validation (<2s initial render)
   - Frame rate monitoring (>55fps)
   - Animation smoothness validation
   - Startup time optimization

2. **Memory & Resource Usage**
   - Memory consumption limits (<200MB)
   - CPU usage thresholds
   - Battery impact analysis
   - Background resource usage

### Phase 2: Network & API Validation

1. **Network Testing**
   - API endpoint validation
   - WebSocket connection testing
   - Offline mode validation
   - Network error handling

2. **API Integration**
   - Response time validation
   - Error handling coverage
   - Rate limiting tests
   - Data consistency checks

### Phase 3: Accessibility & Security

1. **Accessibility Testing**
   - Screen reader compatibility
   - Color contrast validation
   - Touch target size checks
   - Navigation accessibility

2. **Security Scanning**
   - Dependency vulnerability checks
   - Runtime security validation
   - API security testing
   - Data encryption verification

## Contributing

### Adding New Validation Steps

1. **Non-Blocking Pattern Compliance**

   ```bash
   # Required pattern
   (
     timeout Xs command &
     PID=$!
     sleep Y
     disown $PID
   ) >/dev/null 2>&1 &
   ```

2. **Timeout Protection**
   - Short operations: 10s max
   - Medium operations: 30s max
   - Long operations: 60s max
   - Expo operations: 120s max

3. **Error Handling**
   - Must define critical failures
   - Must specify warning thresholds
   - Must document resolution steps
   - Must include validation checks

4. **Documentation Updates**
   - Add to README.md
   - Update error handling section
   - Document debug commands
   - Include troubleshooting steps

5. **Testing Requirements**
   - Must pass existing validation
   - Must include new test cases
   - Must verify non-blocking
   - Must test error scenarios

6. **Deployment Checklist**
   - [ ] Non-blocking pattern verified
   - [ ] Timeouts implemented
   - [ ] Error handling complete
   - [ ] Documentation updated
   - [ ] Tests passing
   - [ ] CI/CD integration verified

## Summary: Ultra Runtime Validation Implementation

### Updated Script Features

The `ultra-runtime-validation.sh` script has been updated with the following strict validation requirements:

#### Critical Validation Table

| Step               | Hard Fail? | Allow <20? | Implementation                                      |
| ------------------ | ---------- | ---------- | --------------------------------------------------- |
| TypeScript         | YES        | YES        | 0 blocking errors, <20 warnings in legacy/test only |
| ESLint             | YES        | YES        | 0 blocking errors, <20 warnings in legacy/test only |
| Unit Tests         | YES        | NO         | Fail on critical test error, allow skipped tests    |
| Provider Audit     | YES        | NO         | Any provider error = fail, zero tolerance           |
| Hook Usage Audit   | YES        | NO         | Any unprotected hook = fail, hard enforcement       |
| Expo Boot          | YES        | NO         | Must pass, server must run                          |
| Maestro/Visual     | YES        | NO         | Any diff/fail = hard fail, UI validation required   |
| Simulator Log Scan | YES        | NO         | Any error pattern = fail, zero tolerance            |
| Device Validation  | YES        | NO         | Any critical error = fail, hard failures            |
| Dual Mount         | YES        | NO         | Any mounting error = fail, hard failures            |
| Screenshot/UI Diff | YES        | NO         | Any visual regression = fail, hard failures         |
| Final Health Check | YES        | NO         | Any critical issue = fail, comprehensive validation |

#### Zero Tolerance Areas

1. **Provider/Context Errors**: Any "must be used within a Provider" error blocks deployment
2. **Runtime Errors**: Any TypeError, undefined, or component registration error blocks deployment
3. **UI/Visual Regressions**: Any Maestro test failure or visual regression blocks deployment
4. **Critical Test Failures**: Any Jest or provider audit failure blocks deployment
5. **Unprotected Hook Usage**: Any hook not wrapped in provider blocks deployment

#### Non-Blocking Pattern Enforcement

- All commands use `timeout` with appropriate limits
- All long-running processes use background execution with `disown`
- All output is properly redirected to prevent terminal blocking
- All error detection includes detailed logging and context

#### Error Detection Improvements

- Enhanced pattern matching for provider/context errors
- Comprehensive runtime error detection in simulator logs
- Visual regression detection in Maestro tests
- Critical failure detection in device validation
- Health check validation for overall system state

This implementation provides the "no optimism" protection requested, ensuring that any critical error will block deployment and require immediate resolution.
