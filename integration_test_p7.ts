#!/usr/bin/env ts-node

/**
 * GHOST 2.0 P7 Integration Test Suite
 * Tests all deployed P7 components for functionality and integration
 */

import { _{ _* as fs } } from 'fs';
import { _{ _* as path } } from 'path';

// Import P7 components
import { _{ _{ ConfigurationValidationEngine, _startConfigurationValidationEngine } } } from './src-nextgen/ghost/validation/configurationValidationEngine';
import { _{ _{ MessageQueueSystem, _startMessageQueueSystem } } } from './src-nextgen/ghost/queue/messageQueueSystem';
import { _{ _{ HealthCheckAggregator, _startHealthCheckAggregator } } } from './src-nextgen/ghost/monitoring/healthCheckAggregator';
import { _{ _{ AutonomousDecisionEngine, _startAutonomousDecisionEngine } } } from './src-nextgen/ghost/autonomy/autonomousDecisionEngine';
import { _{ _{ GhostGptRelayCore, _startGhostGptRelayCore } } } from './src-nextgen/ghost/relay/ghostGptRelayCore';
import { _{ _{ GhostAutopilotHealer, _startGhostAutopilotHealer } } } from './src-nextgen/ghost/healer/ghostAutopilotHealer';

// Import schema validation
import { _{ _{ 
  validateGptRelayInput, _validateCliCommand, _validatePatchGeneratorPayload, _validateFeedbackIngestion, _validateMessageQueue, _validateHealthCheck
} } } from './src-nextgen/ghost/validation/schemas';

interface TestResult {
  testName: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration: number;
  details?: any;
}

class P7IntegrationTestSuite {
  private results: TestResult[] = [];
  private testConfigPath = '/tmp/test-config.json';
  private testSchemaPath = '/tmp/test-schema.json';

  constructor() {
    this.setupTestEnvironment();
  }

  private setupTestEnvironment(): void {
    // Create test configuration
    const _testConfig = {
      validation: {
        enabled: true,
        strictMode: false,
        autoSanitize: true,
        backupBeforeValidation: true,
        maxBackups: 5
      },
      security: {
        enabled: true,
        inputSanitization: true,
        sensitiveFieldDetection: true,
        injectionPrevention: true,
        encryption: false
      },
      rollback: {
        enabled: true,
        autoRollback: true,
        rollbackThreshold: 2,
        maxRollbackAttempts: 3
      },
      audit: {
        enabled: true,
        logAllChanges: true,
        logSensitiveData: false,
        retentionDays: 7
      },
      conflict: {
        enabled: true,
        autoResolution: true,
        conflictDetection: true,
        mergeStrategies: ['last-wins', 'merge', 'manual']
      }
    };

    // Create test schema
    const _testSchema = {
      id: 'test-schema',
      name: 'Test Configuration Schema',
      version: '1.0.0',
      description: 'Schema for integration testing',
      properties: {
        testProperty: {
          type: 'string',
          required: true,
          sanitize: true,
          validation: 'string-validation'
        },
        testNumber: {
          type: 'number',
          required: false,
          min: 0,
          max: 100
        }
      },
      required: ['testProperty'],
      additionalProperties: false
    };

    fs.writeFileSync(this.testConfigPath, JSON.stringify(testConfig, null, 2));
    fs.writeFileSync(this.testSchemaPath, JSON.stringify(testSchema, null, 2));
  }

  private async runTest(_testName: string, _testFn: () => Promise<boolean>): Promise<TestResult> {
    const _startTime = Date.now();
    try {
      const _success = await testFn();
      const _duration = Date.now() - startTime;
      return {
        testName,
        status: success ? 'PASS' : 'FAIL',
        message: success ? 'Test completed successfully' : 'Test failed',
        duration
      };
    } catch (_error) {
      const _duration = Date.now() - startTime;
      return {
        testName,
        status: 'FAIL',
        message: `Test failed with error: ${error}`,
        duration,
        details: error
      };
    }
  }

  async testConfigurationValidationEngine(): Promise<TestResult> {
    return this.runTest(_'Configuration Validation Engine', _async () => {
      const _engine = new ConfigurationValidationEngine();
      
      // Test configuration loading
      const _config = engine.getConfig();
      if (!config.validation.enabled) return false;

      // Test schema validation
      const _testData = { testProperty: 'test-value', testNumber: 50 };
      const _validation = await engine.validateConfiguration(this.testConfigPath, 'test-schema');
      
      return validation.success;
    });
  }

  async testMessageQueueSystem(): Promise<TestResult> {
    return this.runTest(_'Message Queue System', _async () => {
      const _queue = new MessageQueueSystem();
      
      // Test message enqueueing
      const _testMessage = {
        id: 'test-msg-1',
        timestamp: new Date().toISOString(),
        priority: 'medium' as const,
        source: 'test',
        destination: 'test',
        type: 'data' as const,
        payload: { test: 'data' },
        headers: {},
        retryCount: 0,
        maxRetries: 3,
        persistent: true,
        ordered: false
      };

      const _messageId = await queue.enqueueMessage(testMessage);
      return messageId.length > 0;
    });
  }

  async testHealthCheckAggregator(): Promise<TestResult> {
    return this.runTest(_'Health Check Aggregator', _async () => {
      const _aggregator = new HealthCheckAggregator();
      
      // Test system health retrieval
      const _health = aggregator.getSystemHealth();
      return health.overallScore >= 0 && health.overallScore <= 100;
    });
  }

  async testAutonomousDecisionEngine(): Promise<TestResult> {
    return this.runTest(_'Autonomous Decision Engine', _async () => {
      const _engine = new AutonomousDecisionEngine();
      
      // Test system state retrieval
      const _systemState = engine.getSystemState();
      return ['optimal', 'degraded', 'critical', 'unknown'].includes(systemState);
    });
  }

  async testGhostGptRelayCore(): Promise<TestResult> {
    return this.runTest(_'Ghost GPT Relay Core', _async () => {
      const _relay = new GhostGptRelayCore();
      
      // Test configuration loading
      const _config = relay.getConfig();
      return config.safety.enabled && config.sanitization.enabled;
    });
  }

  async testGhostAutopilotHealer(): Promise<TestResult> {
    return this.runTest(_'Ghost Autopilot Healer', _async () => {
      const _healer = new GhostAutopilotHealer();
      
      // Test configuration loading
      const _config = healer.getConfig();
      return config.safety.enabled && config.actions.restart.enabled;
    });
  }

  async testSchemaValidation(): Promise<TestResult> {
    return this.runTest(_'Schema Validation', _async () => {
      // Test GPT Relay Input validation
      const _validGptInput = {
        command: 'test-command',
        priority: 'medium' as const,
        timeout: 5000,
        maxRetries: 3,
        source: 'test'
      };
      const _gptInputValid = validateGptRelayInput(validGptInput);

      // Test CLI Command validation
      const _validCliCommand = {
        command: 'ls',
        timeout: 5000,
        user: 'test-user'
      };
      const _cliCommandValid = validateCliCommand(validCliCommand);

      // Test Message Queue validation
      const _validMessageQueue = {
        queue: 'test-queue',
        message: {
          id: 'test-msg',
          type: 'data' as const,
          priority: 'medium' as const,
          payload: { test: 'data' },
          persistent: true,
          ordered: false
        }
      };
      const _messageQueueValid = validateMessageQueue(validMessageQueue);

      return gptInputValid && cliCommandValid && messageQueueValid;
    });
  }

  async testComponentIntegration(): Promise<TestResult> {
    return this.runTest(_'Component Integration', _async () => {
      // Test that all components can be instantiated together
      const _validationEngine = new ConfigurationValidationEngine();
      const _messageQueue = new MessageQueueSystem();
      const _healthAggregator = new HealthCheckAggregator();
      const _decisionEngine = new AutonomousDecisionEngine();
      const _relayCore = new GhostGptRelayCore();
      const _autopilotHealer = new GhostAutopilotHealer();

      // Verify all components are properly initialized
      const _validationConfig = validationEngine.getConfig();
      const _queueConfig = messageQueue.getConfig();
      const _healthConfig = healthAggregator.getConfig();
      const _relayConfig = relayCore.getConfig();
      const _healerConfig = autopilotHealer.getConfig();

      return validationConfig.validation.enabled &&
             queueConfig.persistence.enabled &&
             healthConfig.monitoring.enabled &&
             relayConfig.safety.enabled &&
             healerConfig.safety.enabled;
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting GHOST 2.0 P7 Integration Test Suite...\n');

    const _tests = [
      this.testConfigurationValidationEngine(),
      this.testMessageQueueSystem(),
      this.testHealthCheckAggregator(),
      this.testAutonomousDecisionEngine(),
      this.testGhostGptRelayCore(),
      this.testGhostAutopilotHealer(),
      this.testSchemaValidation(),
      this.testComponentIntegration()
    ];

    this.results = await Promise.all(tests);

    this.printResults();
    this.generateReport();
  }

  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(60));

    let _passCount = 0;
    let _failCount = 0;
    let _totalDuration = 0;

    for (const result of this.results) {
      const _statusIcon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`${statusIcon} ${result.testName}: ${result.status} (${result.duration}ms)`);
      console.log(`   ${result.message}`);
      
      if (result.status === 'PASS') passCount++;
      else failCount++;
      
      totalDuration += result.duration;
    }

    console.log('\n' + '=' .repeat(60));
    console.log(`📈 Summary: ${passCount} PASSED, ${failCount} FAILED`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);
    console.log(`🎯 Success Rate: ${((passCount / this.results.length) * 100).toFixed(1)}%`);
  }

  private generateReport(): void {
    const _report = {
      timestamp: new Date().toISOString(),
      testSuite: 'GHOST 2.0 P7 Integration Tests',
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.status === 'PASS').length,
        failed: this.results.filter(r => r.status === 'FAIL').length,
        successRate: (this.results.filter(r => r.status === 'PASS').length / this.results.length) * 100
      }
    };

    const _reportPath = '/tmp/p7-integration-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Create summary markdown
    const _summaryPath = '/tmp/p7-integration-test-summary.md';
    const _summaryContent = `# GHOST 2.0 P7 Integration Test Summary

**Timestamp:** ${report.timestamp}
**Test Suite:** ${report.testSuite}

## Results
- **Total Tests:** ${report.summary.total}
- **Passed:** ${report.summary.passed}
- **Failed:** ${report.summary.failed}
- **Success Rate:** ${report.summary.successRate.toFixed(1)}%

## Test Details
${this.results.map(r => `- ${r.status === 'PASS' ? '✅' : '❌'} **${r.testName}**: ${r.message} (${r.duration}ms)`).join('\n')}

## Status
${report.summary.successRate >= 90 ? '🟢 **EXCELLENT** - All critical components working correctly' : 
  report.summary.successRate >= 75 ? '🟡 **GOOD** - Most components working, minor issues detected' :
  '🔴 **NEEDS ATTENTION** - Significant issues detected'}

## Next Steps
${report.summary.successRate >= 90 ? 
  '- Proceed with Phase 8 development\n- Deploy to staging environment\n- Begin production preparation' :
  '- Review failed tests\n- Fix identified issues\n- Re-run integration tests\n- Address component dependencies'}
`;

    fs.writeFileSync(summaryPath, summaryContent);
    console.log(`📝 Summary report saved to: ${summaryPath}`);
  }

  cleanup(): void {
    // Clean up test files
    try {
      if (fs.existsSync(this.testConfigPath)) fs.unlinkSync(this.testConfigPath);
      if (fs.existsSync(this.testSchemaPath)) fs.unlinkSync(this.testSchemaPath);
    } catch (_error) {
      console.warn('Warning: Could not clean up test files:', error);
    }
  }
}

// Main execution
async function main() {
  const _testSuite = new P7IntegrationTestSuite();
  
  try {
    await testSuite.runAllTests();
  } catch (_error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  } finally {
    testSuite.cleanup();
  }
}

if (require.main === module) {
  main();
}

export { P7IntegrationTestSuite }; 
