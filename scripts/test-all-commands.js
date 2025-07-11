#!/usr/bin/env node

/**
 * Test All Slack Commands Script
 * ENHANCED: Added retry logic, validation, UUID tracking, dashboard notifications
 */

const https = require('https');
const fs = require('fs');
const crypto = require('crypto');

// Configuration
const DASHBOARD_WEBHOOK = 'https://gpt-cursor-runner.fly.dev/slack/commands';
const LOG_FILE = './logs/command-test-results.json';
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Generate operation UUID for tracking
const OPERATION_UUID = crypto.randomUUID();
const START_TIME = Date.now();

const commands = [
  '/dashboard', '/patch-approve', '/patch-revert', '/pause-runner', '/status-runner',
  '/show-roadmap', '/roadmap', '/kill', '/toggle-runner-on', '/toggle-runner-off',
  '/toggle-runner-auto', '/theme', '/theme-status', '/theme-fix', '/patch-preview',
  '/revert-phase', '/log-phase-status', '/cursor-mode', '/whoami', '/lock-runner',
  '/unlock-runner', '/alert-runner-crash', '/proceed', '/again', '/manual-revise',
  '/manual-append', '/interrupt', '/troubleshoot', '/troubleshoot-oversight', '/send-with',
  '/gpt-slack-dispatch', '/cursor-slack-dispatch', '/gpt-ping', '/approve-screenshot',
  '/continue-runner', '/restart-runner', '/restart-runner-gpt', '/retry-last-failed',
  '/command-center', '/patch-status', '/read-secret'
];

const results = [];
const testMetrics = {
  totalTests: 0,
  successfulTests: 0,
  failedTests: 0,
  retriedTests: 0,
  totalRetries: 0
};

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] [${OPERATION_UUID}] ${message}`;
  console.log(logEntry);
}

function notifyDashboard(message, level = 'INFO') {
  const data = JSON.stringify({
    command: '/alert-runner-crash',
    text: `[COMMAND-TEST] ${level}: ${message}`,
    user_name: 'command-test-suite',
    channel_id: 'testing'
  });

  const options = {
    hostname: 'gpt-cursor-runner.fly.dev',
    port: 443,
    path: '/slack/commands',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    log(`Dashboard notification sent: ${res.statusCode}`);
  });

  req.on('error', (err) => {
    log(`Dashboard notification failed: ${err.message}`, 'ERROR');
  });

  req.write(data);
  req.end();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testCommandWithRetry(command, retryCount = 0) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      command: command,
      text: `test-${OPERATION_UUID}`,
      user_name: 'test-suite',
      channel_id: 'testing'
    });

    const options = {
      hostname: 'gpt-cursor-runner.fly.dev',
      port: 443,
      path: '/slack/commands',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      },
      timeout: 10000 // 10 second timeout
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        const success = res.statusCode === 200 && !responseData.includes('❌');
        const result = {
          command,
          status: success ? '✅' : '❌',
          response: responseData.substring(0, 200) + (responseData.length > 200 ? '...' : ''),
          statusCode: res.statusCode,
          retryCount,
          timestamp: new Date().toISOString(),
          operationUuid: OPERATION_UUID
        };
        
        if (retryCount > 0) {
          result.retryMetadata = {
            originalAttempt: retryCount,
            retryDelay: RETRY_DELAY * retryCount
          };
        }
        
        results.push(result);
        resolve(result);
      });
    });

    req.on('error', (error) => {
      const result = {
        command,
        status: '❌',
        response: `Error: ${error.message}`,
        statusCode: 0,
        retryCount,
        timestamp: new Date().toISOString(),
        operationUuid: OPERATION_UUID,
        error: error.message
      };
      
      if (retryCount > 0) {
        result.retryMetadata = {
          originalAttempt: retryCount,
          retryDelay: RETRY_DELAY * retryCount
        };
      }
      
      results.push(result);
      resolve(result);
    });

    req.on('timeout', () => {
      req.destroy();
      const result = {
        command,
        status: '❌',
        response: 'Error: Request timeout',
        statusCode: 0,
        retryCount,
        timestamp: new Date().toISOString(),
        operationUuid: OPERATION_UUID,
        error: 'timeout'
      };
      
      if (retryCount > 0) {
        result.retryMetadata = {
          originalAttempt: retryCount,
          retryDelay: RETRY_DELAY * retryCount
        };
      }
      
      results.push(result);
      resolve(result);
    });

    req.write(data);
    req.end();
  });
}

async function testCommand(command) {
  log(`Testing command: ${command}`);
  testMetrics.totalTests++;
  
  let result = await testCommandWithRetry(command);
  
  // Retry logic for failed tests
  if (result.status === '❌' && result.retryCount < MAX_RETRIES) {
    testMetrics.retriedTests++;
    log(`Command ${command} failed, retrying... (attempt ${result.retryCount + 1}/${MAX_RETRIES})`, 'WARNING');
    
    for (let retry = 1; retry <= MAX_RETRIES; retry++) {
      await sleep(RETRY_DELAY * retry); // Exponential backoff
      testMetrics.totalRetries++;
      
      result = await testCommandWithRetry(command, retry);
      
      if (result.status === '✅') {
        log(`Command ${command} succeeded on retry ${retry}`, 'SUCCESS');
        break;
      } else if (retry === MAX_RETRIES) {
        log(`Command ${command} failed after ${MAX_RETRIES} retries`, 'ERROR');
        notifyDashboard(`Command ${command} failed after ${MAX_RETRIES} retries`, 'ERROR');
      }
    }
  }
  
  if (result.status === '✅') {
    testMetrics.successfulTests++;
  } else {
    testMetrics.failedTests++;
  }
  
  return result;
}

function validateTestEnvironment() {
  log('🔍 Validating test environment...');
  
  // Check if we can reach the test endpoint
  return new Promise((resolve) => {
    const testData = JSON.stringify({
      command: '/whoami',
      text: 'test-connection',
      user_name: 'test-validator',
      channel_id: 'testing'
    });

    const options = {
      hostname: 'gpt-cursor-runner.fly.dev',
      port: 443,
      path: '/slack/commands',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': testData.length
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode === 200) {
        log('✅ Test environment validated');
        resolve(true);
      } else {
        log(`❌ Test environment validation failed: ${res.statusCode}`, 'ERROR');
        resolve(false);
      }
    });

    req.on('error', (error) => {
      log(`❌ Test environment validation failed: ${error.message}`, 'ERROR');
      resolve(false);
    });

    req.on('timeout', () => {
      log('❌ Test environment validation timeout', 'ERROR');
      resolve(false);
    });

    req.write(testData);
    req.end();
  });
}

async function runTests() {
  log('🧪 Starting comprehensive command test suite...');
  notifyDashboard('Starting comprehensive command test suite', 'INFO');
  
  // Validate test environment
  if (!(await validateTestEnvironment())) {
    log('❌ Test environment validation failed - aborting tests', 'ERROR');
    notifyDashboard('Test environment validation failed - aborting tests', 'ERROR');
    process.exit(1);
  }
  
  log(`🧪 Testing all ${commands.length} registered slash commands...\n`);
  
  const startTime = Date.now();
  
  for (let i = 0; i < commands.length; i++) {
    const command = commands[i];
    process.stdout.write(`Testing ${command}... `);
    
    const result = await testCommand(command);
    console.log(result.status);
    
    // Progress notification every 10 commands
    if ((i + 1) % 10 === 0) {
      const progress = ((i + 1) / commands.length * 100).toFixed(1);
      log(`Progress: ${progress}% (${i + 1}/${commands.length})`);
      notifyDashboard(`Test progress: ${progress}% (${i + 1}/${commands.length})`, 'INFO');
    }
  }

  const totalTime = Date.now() - startTime;
  
  console.log('\n📊 Test Results:');
  console.log('================');
  
  console.log(`✅ Successful: ${testMetrics.successfulTests}`);
  console.log(`❌ Failed: ${testMetrics.failedTests}`);
  console.log(`🔄 Retried: ${testMetrics.retriedTests}`);
  console.log(`📈 Success Rate: ${((testMetrics.successfulTests / testMetrics.totalTests) * 100).toFixed(1)}%`);
  console.log(`⏱️  Total Time: ${totalTime}ms`);
  console.log(`🔄 Total Retries: ${testMetrics.totalRetries}`);
  
  // Detailed results
  console.log('\n📋 Detailed Results:');
  results.forEach(result => {
    const retryInfo = result.retryCount > 0 ? ` (retry ${result.retryCount})` : '';
    console.log(`${result.status} ${result.command} (${result.statusCode})${retryInfo}`);
  });

  // Save comprehensive results
  const comprehensiveResults = {
    metadata: {
      operationUuid: OPERATION_UUID,
      startTime: new Date(START_TIME).toISOString(),
      endTime: new Date().toISOString(),
      totalTime: totalTime,
      totalCommands: commands.length
    },
    metrics: testMetrics,
    results: results,
    summary: {
      successful: testMetrics.successfulTests,
      failed: testMetrics.failedTests,
      retried: testMetrics.retriedTests,
      successRate: ((testMetrics.successfulTests / testMetrics.totalTests) * 100).toFixed(1)
    }
  };
  
  fs.writeFileSync(LOG_FILE, JSON.stringify(comprehensiveResults, null, 2));
  console.log(`\n💾 Comprehensive results saved to ${LOG_FILE}`);
  
  // Final dashboard notification
  const successRate = ((testMetrics.successfulTests / testMetrics.totalTests) * 100).toFixed(1);
  if (testMetrics.failedTests === 0) {
    log('🎉 All command tests passed successfully!', 'SUCCESS');
    notifyDashboard(`All ${commands.length} command tests passed successfully! (${successRate}% success rate)`, 'SUCCESS');
  } else {
    log(`⚠️  ${testMetrics.failedTests} command tests failed`, 'WARNING');
    notifyDashboard(`${testMetrics.failedTests} command tests failed out of ${commands.length} (${successRate}% success rate)`, 'WARNING');
  }
  
  // Exit with appropriate code
  process.exit(testMetrics.failedTests === 0 ? 0 : 1);
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  notifyDashboard(`Test suite error: ${reason}`, 'ERROR');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'ERROR');
  notifyDashboard(`Test suite crashed: ${error.message}`, 'ERROR');
  process.exit(1);
});

runTests().catch((error) => {
  log(`Test suite failed: ${error.message}`, 'ERROR');
  notifyDashboard(`Test suite failed: ${error.message}`, 'ERROR');
  process.exit(1);
}); 