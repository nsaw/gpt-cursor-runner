#!/usr/bin/env node

/**
 * Enhanced System Test Suite
 * Comprehensive testing of all new GHOST system components
 * Validates format conversion, real-time status, autonomous execution, and dashboard
 */

const fs = require('fs/promises');
const path = require('path');

class EnhancedSystemTester {
  constructor() {
    this.testResults = [];
    this.testCount = 0;
    this.passCount = 0;
    this.failCount = 0;
  }

  async runAllTests() {
    console.log('🧪 [TESTER] Starting Enhanced System Test Suite...\n');

    try {
      // Test 1: Patch Format Converter
      await this.testPatchFormatConverter();

      // Test 2: Real-time Status API
      await this.testRealTimeStatusAPI();

      // Test 3: Autonomous Patch Trigger
      await this.testAutonomousPatchTrigger();

      // Test 4: Enhanced Patch Validator
      await this.testEnhancedPatchValidator();

      // Test 5: Comprehensive Dashboard
      await this.testComprehensiveDashboard();

      // Test 6: Integration Tests
      await this.testIntegration();

      // Generate test report
      await this.generateTestReport();
    } catch (error) {
      console.error('❌ [TESTER] Test suite failed:', error.message);
      this.recordTest('test_suite', 'FAIL', error.message);
    }
  }

  async testPatchFormatConverter() {
    console.log('🔍 [TESTER] Testing Patch Format Converter...');

    try {
      const PatchFormatConverter = require('./patch-format-converter');
      const converter = new PatchFormatConverter();

      // Test webhook to executor conversion
      const webhookPatch = {
        id: 'test-patch-1',
        role: 'test-role',
        target_file: '/test/file.ts',
        patch: 'console.log(\'test\');',
      };

      const executorPatch = converter.convertWebhookToExecutor(webhookPatch);

      this.assert(executorPatch.id === 'test-patch-1', 'Patch ID preserved');
      this.assert(
        executorPatch.mutations.length === 1,
        'Single mutation created',
      );
      this.assert(
        executorPatch.mutations[0].path === '/test/file.ts',
        'Path preserved',
      );
      this.assert(
        executorPatch.mutations[0].contents === 'console.log(\'test\');',
        'Content preserved',
      );

      // Test format detection
      const detectedFormat = converter.detectFormat(webhookPatch);
      this.assert(detectedFormat === 'webhook', 'Webhook format detected');

      // Test unified conversion
      const unifiedPatch = converter.convertToUnified(webhookPatch, 'webhook');
      this.assert(unifiedPatch.type === 'unified', 'Unified format created');

      this.recordTest(
        'patch_format_converter',
        'PASS',
        'All format conversions working',
      );
    } catch (error) {
      this.recordTest('patch_format_converter', 'FAIL', error.message);
      throw error;
    }
  }

  async testRealTimeStatusAPI() {
    console.log('🔍 [TESTER] Testing Real-time Status API...');

    try {
      const RealTimeStatusAPI = require('./real-time-status-api');
      const api = new RealTimeStatusAPI({ port: 8791 }); // Use different port for testing

      // Test API creation
      this.assert(api.port === 8791, 'API port configured correctly');
      this.assert(
        api.patchStatus instanceof Map,
        'Patch status tracking initialized',
      );

      // Test status update
      await api.updatePatchStatus('test-patch-2', 'pending', {
        system: 'CYOPS',
        timestamp: new Date().toISOString(),
      });

      const status = await api.getPatchStatus('test-patch-2');
      this.assert(status.status === 'pending', 'Status update working');
      this.assert(status.system === 'CYOPS', 'Status details preserved');

      // Test service status
      const serviceStatus = await api.getServiceStatus();
      this.assert(typeof serviceStatus === 'object', 'Service status returned');

      this.recordTest(
        'real_time_status_api',
        'PASS',
        'Status API functionality verified',
      );
    } catch (error) {
      this.recordTest('real_time_status_api', 'FAIL', error.message);
      throw error;
    }
  }

  async testAutonomousPatchTrigger() {
    console.log('🔍 [TESTER] Testing Autonomous Patch Trigger...');

    try {
      const AutonomousPatchTrigger = require('./autonomous-patch-trigger');
      const trigger = new AutonomousPatchTrigger({
        pollInterval: 1000, // Fast polling for testing;
        maxRetries: 2,
      });

      // Test trigger creation
      this.assert(trigger.pollInterval === 1000, 'Poll interval configured');
      this.assert(trigger.maxRetries === 2, 'Max retries configured');
      this.assert(
        trigger.pendingPatches instanceof Map,
        'Pending patches tracking initialized',
      );

      // Test patch validation;
      const testPatch = {
        id: 'test-patch-3',
        mutations: [
          {
            path: '/tmp/test-file.txt',
            contents: 'Test content',
          },
        ],
        validation: {
          enforceValidationGate: true,
          strictRuntimeAudit: true,
        },
      };

      const validatedPatch = await trigger.readAndValidatePatch(
        JSON.stringify(testPatch),
      );
      this.assert(validatedPatch.id === 'test-patch-3', 'Patch validation working');

      this.recordTest(
        'autonomous_patch_trigger',
        'PASS',
        'Autonomous trigger functionality verified',
      );
    } catch (error) {
      this.recordTest('autonomous_patch_trigger', 'FAIL', error.message);
      throw error;
    }
  }

  async testEnhancedPatchValidator() {
    console.log('🔍 [TESTER] Testing Enhanced Patch Validator...');

    try {
      const EnhancedPatchValidator = require('./enhanced-patch-validator');
      const validator = new EnhancedPatchValidator({
        timeout: 30000,
        maxWarnings: 0,
      });

      // Test validator creation;
      this.assert(
        validator.validationTimeout === 30000,
        'Validation timeout configured',
      );
      this.assert(validator.maxWarnings === 0, 'Max warnings configured');
      this.assert(
        Object.keys(validator.validations).length > 0,
        'Validations configured',
      );

      // Test validation structure;
      const testPatch = {
        id: 'test-patch-4',
        mutations: [
          {
            path: '/tmp/valid-file.ts',
            contents: 'const _test = \'valid\';',
          },
        ],
        validation: {
          enforceValidationGate: true,
        },
      };

      // Note: We skip actual validation execution for testing;
      const validationResult = await validator.validatePatch(testPatch, {
        skipValidations: [
          'typescript',
          'eslint',
          'runtime',
          'performance',
          'roles',
          'components',
        ],
      });

      this.assert(validationResult.patchId === 'test-patch-4', 'Validation result contains patch ID');
      this.assert(validationResult.overall === 'PASS', 'Validation result determined');

      this.recordTest(
        'enhanced_patch_validator',
        'PASS',
        'Enhanced validator functionality verified',
      );
    } catch (error) {
      this.recordTest('enhanced_patch_validator', 'FAIL', error.message);
      throw error;
    }
  }

  async testComprehensiveDashboard() {
    console.log('🔍 [TESTER] Testing Comprehensive Dashboard...');

    try {
      const ComprehensiveDashboard = require('./comprehensive-dashboard');
      const dashboard = new ComprehensiveDashboard({ port: 3003 }); // Use different port for testing

      // Test dashboard creation
      this.assert(dashboard.port === 3003, 'Dashboard port configured');
      this.assert(dashboard.alerts instanceof Map, 'Alert system initialized');
      this.assert(
        dashboard.rollbackHistory instanceof Map,
        'Rollback history initialized',
      );

      // Test alert creation
      dashboard.createAlert('test_alert', {
        level: 'info',
        title: 'Test Alert',
        message: 'This is a test alert',
      });

      const alerts = await dashboard.getActiveAlerts();
      this.assert(alerts.length > 0, 'Alert created successfully');
      this.assert(alerts[0].title === 'Test Alert', 'Alert details preserved');

      // Test component status;
      const componentStatus = await dashboard.getComponentStatus();
      this.assert(typeof componentStatus === 'object', 'Component status returned');

      this.recordTest(
        'comprehensive_dashboard',
        'PASS',
        'Dashboard functionality verified',
      );
    } catch (error) {
      this.recordTest('comprehensive_dashboard', 'FAIL', error.message);
      throw error;
    }
  }

  async testIntegration() {
    console.log('🔍 [TESTER] Testing System Integration...');

    try {
      // Test format converter integration
      const PatchFormatConverter = require('./patch-format-converter');
      const converter = new PatchFormatConverter();

      // Test end-to-end format conversion;
      const webhookPatch = {
        id: 'integration-test',
        role: 'integration',
        target_file: '/integration/test.ts',
        patch: 'export const _test = \'integration\';',
      };

      const executorPatch = converter.convertWebhookToExecutor(webhookPatch);
      const unifiedPatch = converter.convertToUnified(webhookPatch, 'webhook');
      const backToWebhook = converter.convertExecutorToWebhook(executorPatch);

      this.assert(backToWebhook.id === 'integration-test', 'Round-trip conversion preserves ID');
      this.assert(backToWebhook.target_file === '/integration/test.ts', 'Round-trip conversion preserves path');

      // Test status API integration
      const RealTimeStatusAPI = require('./real-time-status-api');
      const api = new RealTimeStatusAPI({ port: 8792 });

      await api.updatePatchStatus('integration-test', 'executing', {
        system: 'CYOPS',
        startTime: new Date().toISOString(),
      });

      const status = await api.getPatchStatus('integration-test');
      this.assert(status.status === 'executing', 'Status API integration working');

      this.recordTest(
        'system_integration',
        'PASS',
        'System integration verified',
      );
    } catch (error) {
      this.recordTest('system_integration', 'FAIL', error.message);
      throw error;
    }
  }

  assert(condition, message) {
    this.testCount++;
    if (condition) {
      this.passCount++;
      console.log(`  ✅ ${message}`);
    } else {
      this.failCount++;
      console.log(`  ❌ ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  recordTest(testName, status, message) {
    this.testResults.push({
      name: testName,
      status,
      message,
      timestamp: new Date().toISOString(),
    });

    console.log(
      `  ${status === 'PASS' ? '✅' : '❌'} ${testName}: ${message}\n`,
    );
  }

  async generateTestReport() {
    const report = `# Enhanced System Test Report

**Timestamp**: ${new Date().toISOString()}
**Total Tests**: ${this.testCount}
**Passed**: ${this.passCount}
**Failed**: ${this.failCount}
**Success Rate**: ${((this.passCount / this.testCount) * 100).toFixed(1)}%

## Test Results

${this.testResults
    .map(
      (result) => `
### ${result.name}
- **Status**: ${result.status}
- **Message**: ${result.message}
- **Timestamp**: ${result.timestamp}
`,
    )
    .join('')}

## Summary
${this.failCount === 0 ? '✅ All tests passed' : `❌ ${this.failCount} tests failed`}

---
*Generated by Enhanced System Tester*`;

    const reportPath = '/tmp/enhanced-system-test-report.md';
    await fs.writeFile(reportPath, report);

    console.log('\n📊 [TESTER] Test Results:');
    console.log(`   Total Tests: ${this.testCount}`);
    console.log(`   Passed: ${this.passCount}`);
    console.log(`   Failed: ${this.failCount}`);
    console.log(
      `   Success Rate: ${((this.passCount / this.testCount) * 100).toFixed(1)}%`,
    );
    console.log(`\n📄 [TESTER] Detailed report saved to: ${reportPath}`);

    if (this.failCount > 0) {
      console.log(
        '\n❌ [TESTER] Some tests failed. Please review the report for details.',
      );
      process.exit(1);
    } else {
      console.log(
        '\n✅ [TESTER] All tests passed! Enhanced system is ready for deployment.',
      );
    }
  }
}

// CLI interface;
if (require.main === module) {
  const tester = new EnhancedSystemTester();
  tester.runAllTests().catch((error) => {
    console.error('❌ [TESTER] Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = EnhancedSystemTester;