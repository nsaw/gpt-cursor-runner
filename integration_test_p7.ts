#!/usr/bin/env ts-node

/**
 * GHOST 2.0 P7 Integration Test Suite
 * Tests all deployed P7 components for functionality and integration
 */

import * as fs from 'fs';
import * as path from 'path';

// Import P7 components
import { ConfigurationValidationEngine, startConfigurationValidationEngine } from './src-nextgen/ghost/validation/configurationValidationEngine';
import { MessageQueueSystem, startMessageQueueSystem } from './src-nextgen/ghost/queue/messageQueueSystem';
import { HealthCheckAggregator, startHealthCheckAggregator } from './src-nextgen/ghost/monitoring/healthCheckAggregator';
import { AutonomousDecisionEngine, startAutonomousDecisionEngine } from './src-nextgen/ghost/autonomy/autonomousDecisionEngine';
import { GhostGptRelayCore, startGhostGptRelayCore } from './src-nextgen/ghost/relay/ghostGptRelayCore';
import { GhostAutopilotHealer, startGhostAutopilotHealer } from './src-nextgen/ghost/healer/ghostAutopilotHealer';

// Import schema validation
import { 
  validateGptRelayInput, 
  validateCliCommand, 
  validatePatchGeneratorPayload,
  validateFeedbackIngestion,
  validateMessageQueue,
  validateHealthCheck
} from './src-nextgen/ghost/validation/schemas';

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
    const testConfig = {
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
    const testSchema = {
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

  private async runTest(testName: string, testFn: () => Promise<boolean>): Promise<TestResult> {
    const startTime = Date.now();
    try {
      const success = await testFn();
      const duration = Date.now() - startTime;
      return {
        testName,
        status: success ? 'PASS' : 'FAIL',
        message: success ? 'Test completed successfully' : 'Test failed',
        duration
      };
    } catch (error) {
      const duration = Date.now() - startTime;
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
    return this.runTest('Configuration Validation Engine', async () => {
      const engine = new ConfigurationValidationEngine();
      
      // Test configuration loading
      const config = engine.getConfig();
      if (!config.validation.enabled) return false;

      // Test schema validation
      const testData = { testProperty: 'test-value', testNumber: 50 };
      const validation = await engine.validateConfiguration(this.testConfigPath, 'test-schema');
      
      return validation.success;
    });
  }

  async testMessageQueueSystem(): Promise<TestResult> {
    return this.runTest('Message Queue System', async () => {
      const queue = new MessageQueueSystem();
      
      // Test message enqueueing
      const testMessage = {
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

      const messageId = await queue.enqueueMessage(testMessage);
      return messageId.length > 0;
    });
  }

  async testHealthCheckAggregator(): Promise<TestResult> {
    return this.runTest('Health Check Aggregator', async () => {
      const aggregator = new HealthCheckAggregator();
      
      // Test system health retrieval
      const health = aggregator.getSystemHealth();
      return health.overallScore >= 0 && health.overallScore <= 100;
    });
  }

  async testAutonomousDecisionEngine(): Promise<TestResult> {
    return this.runTest('Autonomous Decision Engine', async () => {
      const engine = new AutonomousDecisionEngine();
      
      // Test system state retrieval
      const systemState = engine.getSystemState();
      return ['optimal', 'degraded', 'critical', 'unknown'].includes(systemState);
    });
  }

  async testGhostGptRelayCore(): Promise<TestResult> {
    return this.runTest('Ghost GPT Relay Core', async () => {
      const relay = new GhostGptRelayCore();
      
      // Test configuration loading
      const config = relay.getConfig();
      return config.safety.enabled && config.sanitization.enabled;
    });
  }

  async testGhostAutopilotHealer(): Promise<TestResult> {
    return this.runTest('Ghost Autopilot Healer', async () => {
      const healer = new GhostAutopilotHealer();
      
      // Test configuration loading
      const config = healer.getConfig();
      return config.safety.enabled && config.actions.restart.enabled;
    });
  }

  async testSchemaValidation(): Promise<TestResult> {
    return this.runTest('Schema Validation', async () => {
      // Test GPT Relay Input validation
      const validGptInput = {
        command: 'test-command',
        priority: 'medium' as const,
        timeout: 5000,
        maxRetries: 3,
        source: 'test'
      };
      const gptInputValid = validateGptRelayInput(validGptInput);

      // Test CLI Command validation
      const validCliCommand = {
        command: 'ls',
        timeout: 5000,
        user: 'test-user'
      };
      const cliCommandValid = validateCliCommand(validCliCommand);

      // Test Message Queue validation
      const validMessageQueue = {
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
      const messageQueueValid = validateMessageQueue(validMessageQueue);

      return gptInputValid && cliCommandValid && messageQueueValid;
    });
  }

  async testComponentIntegration(): Promise<TestResult> {
    return this.runTest('Component Integration', async () => {
      // Test that all components can be instantiated together
      const validationEngine = new ConfigurationValidationEngine();
      const messageQueue = new MessageQueueSystem();
      const healthAggregator = new HealthCheckAggregator();
      const decisionEngine = new AutonomousDecisionEngine();
      const relayCore = new GhostGptRelayCore();
      const autopilotHealer = new GhostAutopilotHealer();

      // Verify all components are properly initialized
      const validationConfig = validationEngine.getConfig();
      const queueConfig = messageQueue.getConfig();
      const healthConfig = healthAggregator.getConfig();
      const relayConfig = relayCore.getConfig();
      const healerConfig = autopilotHealer.getConfig();

      return validationConfig.validation.enabled &&
             queueConfig.persistence.enabled &&
             healthConfig.monitoring.enabled &&
             relayConfig.safety.enabled &&
             healerConfig.safety.enabled;
    });
  }

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting GHOST 2.0 P7 Integration Test Suite...\n');

    const tests = [
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

    let passCount = 0;
    let failCount = 0;
    let totalDuration = 0;

    for (const result of this.results) {
      const statusIcon = result.status === 'PASS' ? '✅' : '❌';
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
    const report = {
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

    const reportPath = '/tmp/p7-integration-test-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);

    // Create summary markdown
    const summaryPath = '/tmp/p7-integration-test-summary.md';
    const summaryContent = `# GHOST 2.0 P7 Integration Test Summary

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
    } catch (error) {
      console.warn('Warning: Could not clean up test files:', error);
    }
  }
}

// Main execution
async function main() {
  const testSuite = new P7IntegrationTestSuite();
  
  try {
    await testSuite.runAllTests();
  } catch (error) {
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