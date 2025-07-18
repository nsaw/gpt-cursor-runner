#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const LogRotator = require('./log-rotation.js');
const SystemsGoHandshake = require('./systems-go-handshake.js');
const TrustDaemon = require('./trust-daemon.js');
const SummaryCleanup = require('./summary-cleanup.js');

class SystemVerifier {
    constructor() {
        this.logRotator = new LogRotator();
        this.tests = [];
        this.results = [];
    }

    async runAllTests() {
        console.log('🔍 Starting Comprehensive System Verification...\n');
        
        this.tests = [
            { name: 'Log Rotation System', test: () => this.testLogRotation() },
            { name: 'Systems-Go Handshake', test: () => this.testSystemsGoHandshake() },
            { name: 'Trust Daemon', test: () => this.testTrustDaemon() },
            { name: 'Summary Cleanup', test: () => this.testSummaryCleanup() },
            { name: 'File Structure', test: () => this.testFileStructure() },
            { name: 'Script Permissions', test: () => this.testScriptPermissions() },
            { name: 'Log Directory', test: () => this.testLogDirectory() },
            { name: 'JSON Log Format', test: () => this.testJsonLogFormat() },
            { name: 'Error Handling', test: () => this.testErrorHandling() },
            { name: 'Integration Test', test: () => this.testIntegration() }
        ];

        for (const test of this.tests) {
            try {
                console.log(`Testing: ${test.name}...`);
                const result = await test.test();
                this.results.push({ name: test.name, ...result });
                
                if (result.passed) {
                    console.log(`✅ ${test.name}: ${result.message}`);
                } else {
                    console.log(`❌ ${test.name}: ${result.message}`);
                }
            } catch (error) {
                const result = { name: test.name, passed: false, message: error.message };
                this.results.push(result);
                console.log(`❌ ${test.name}: ${error.message}`);
            }
        }

        this.generateReport();
        return this.results;
    }

    testLogRotation() {
        try {
            const logRotationPath = 'scripts/log-rotation.js';
            if (!fs.existsSync(logRotationPath)) {
                return { passed: false, message: 'Log rotation script not found' };
            }

            // Test basic functionality
            const LogRotator = require('./log-rotation.js');
            const rotator = new LogRotator();
            
            // Test writing a log entry
            rotator.writeLogEntry('test-verification.log', { test: 'verification' });
            
            // Test reading logs
            const logs = rotator.readRecentLogs('test-verification.log', 1);
            
            // Cleanup test file
            const testLogPath = 'logs/test-verification.log';
            if (fs.existsSync(testLogPath)) {
                fs.unlinkSync(testLogPath);
            }

            return { passed: true, message: 'Log rotation functional' };
        } catch (error) {
            return { passed: false, message: `Log rotation error: ${error.message}` };
        }
    }

    testSystemsGoHandshake() {
        try {
            const handshakePath = 'scripts/systems-go-handshake.js';
            if (!fs.existsSync(handshakePath)) {
                return { passed: false, message: 'Systems-go handshake script not found' };
            }

            const handshake = new SystemsGoHandshake();
            
            // Test basic functionality
            const status = handshake.getLastHandshake();
            
            return { passed: true, message: 'Systems-go handshake available' };
        } catch (error) {
            return { passed: false, message: `Systems-go handshake error: ${error.message}` };
        }
    }

    testTrustDaemon() {
        try {
            const trustDaemonPath = 'scripts/trust-daemon.js';
            if (!fs.existsSync(trustDaemonPath)) {
                return { passed: false, message: 'Trust daemon script not found' };
            }

            const daemon = new TrustDaemon();
            
            // Test basic functionality
            const status = daemon.getTrustStatus();
            
            return { passed: true, message: 'Trust daemon available' };
        } catch (error) {
            return { passed: false, message: `Trust daemon error: ${error.message}` };
        }
    }

    testSummaryCleanup() {
        try {
            const cleanupPath = 'scripts/summary-cleanup.js';
            if (!fs.existsSync(cleanupPath)) {
                return { passed: false, message: 'Summary cleanup script not found' };
            }

            const cleanup = new SummaryCleanup();
            
            // Test basic functionality
            const status = cleanup.getStatus();
            
            return { passed: true, message: 'Summary cleanup available' };
        } catch (error) {
            return { passed: false, message: `Summary cleanup error: ${error.message}` };
        }
    }

    testFileStructure() {
        const requiredFiles = [
            'scripts/log-rotation.js',
            'scripts/systems-go-handshake.js',
            'scripts/trust-daemon.js',
            'scripts/summary-cleanup.js',
            'logs',
            'summaries'
        ];

        const missing = [];
        for (const file of requiredFiles) {
            if (!fs.existsSync(file)) {
                missing.push(file);
            }
        }

        if (missing.length > 0) {
            return { passed: false, message: `Missing files: ${missing.join(', ')}` };
        }

        return { passed: true, message: 'All required files present' };
    }

    testScriptPermissions() {
        const scripts = [
            'scripts/log-rotation.js',
            'scripts/systems-go-handshake.js',
            'scripts/trust-daemon.js',
            'scripts/summary-cleanup.js'
        ];

        const notExecutable = [];
        for (const script of scripts) {
            if (fs.existsSync(script)) {
                const stats = fs.statSync(script);
                if (!(stats.mode & fs.constants.S_IXUSR)) {
                    notExecutable.push(script);
                }
            }
        }

        if (notExecutable.length > 0) {
            return { passed: false, message: `Not executable: ${notExecutable.join(', ')}` };
        }

        return { passed: true, message: 'All scripts executable' };
    }

    testLogDirectory() {
        try {
            if (!fs.existsSync('logs')) {
                fs.mkdirSync('logs', { recursive: true });
            }

            // Test write permissions
            const testFile = 'logs/test-write.log';
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);

            return { passed: true, message: 'Log directory writable' };
        } catch (error) {
            return { passed: false, message: `Log directory error: ${error.message}` };
        }
    }

    testJsonLogFormat() {
        try {
            const LogRotator = require('./log-rotation.js');
            const rotator = new LogRotator();
            
            // Write test entry
            rotator.writeLogEntry('test-json.log', { test: 'json-format' });
            
            // Read and validate JSON
            const logs = rotator.readRecentLogs('test-json.log', 1);
            
            if (logs.length === 0) {
                return { passed: false, message: 'No logs found' };
            }

            const log = logs[0];
            if (!log.timestamp || !log.test) {
                return { passed: false, message: 'Invalid JSON log format' };
            }

            // Cleanup
            const testLogPath = 'logs/test-json.log';
            if (fs.existsSync(testLogPath)) {
                fs.unlinkSync(testLogPath);
            }

            return { passed: true, message: 'JSON log format valid' };
        } catch (error) {
            return { passed: false, message: `JSON log error: ${error.message}` };
        }
    }

    testErrorHandling() {
        try {
            const LogRotator = require('./log-rotation.js');
            const rotator = new LogRotator();
            
            // Test with invalid data
            rotator.writeLogEntry('test-error.log', null);
            
            // Test reading non-existent file
            const logs = rotator.readRecentLogs('non-existent.log', 1);
            
            if (logs.length !== 0) {
                return { passed: false, message: 'Error handling failed' };
            }

            // Cleanup
            const testLogPath = 'logs/test-error.log';
            if (fs.existsSync(testLogPath)) {
                fs.unlinkSync(testLogPath);
            }

            return { passed: true, message: 'Error handling working' };
        } catch (error) {
            return { passed: false, message: `Error handling test failed: ${error.message}` };
        }
    }

    testIntegration() {
        try {
            // Test full integration workflow
            const LogRotator = require('./log-rotation.js');
            const rotator = new LogRotator();
            
            // Write test entry
            rotator.writeLogEntry('integration-test.log', { 
                test: 'integration',
                timestamp: new Date().toISOString()
            });
            
            // Read back
            const logs = rotator.readRecentLogs('integration-test.log', 1);
            
            if (logs.length === 0) {
                return { passed: false, message: 'Integration test failed' };
            }

            // Cleanup
            const testLogPath = 'logs/integration-test.log';
            if (fs.existsSync(testLogPath)) {
                fs.unlinkSync(testLogPath);
            }

            return { passed: true, message: 'Integration test passed' };
        } catch (error) {
            return { passed: false, message: `Integration test error: ${error.message}` };
        }
    }

    generateReport() {
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        const failed = total - passed;

        console.log('\n📊 Verification Report:');
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.filter(r => !r.passed).forEach(result => {
                console.log(`  - ${result.name}: ${result.message}`);
            });
        }

        // Log verification results
        this.logRotator.writeLogEntry('verification.log', {
            action: 'system-verification',
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: { passed, failed, total, successRate: (passed / total) * 100 }
        });

        // Save detailed report
        const reportPath = 'logs/verification-report.json';
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            results: this.results,
            summary: { passed, failed, total, successRate: (passed / total) * 100 }
        }, null, 2));

        console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }

    getLastVerification() {
        const reportPath = 'logs/verification-report.json';
        if (fs.existsSync(reportPath)) {
            try {
                return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
            } catch (error) {
                return null;
            }
        }
        return null;
    }
}

// CLI usage
if (require.main === module) {
    const verifier = new SystemVerifier();
    const command = process.argv[2];

    switch (command) {
        case 'verify':
            verifier.runAllTests().then(results => {
                const failed = results.filter(r => !r.passed).length;
                process.exit(failed > 0 ? 1 : 0);
            });
            break;
        case 'report':
            const lastVerification = verifier.getLastVerification();
            if (lastVerification) {
                console.log(JSON.stringify(lastVerification, null, 2));
            } else {
                console.log('No verification report found');
            }
            break;
        default:
            console.log('Usage: node verify-systems.js [verify|report]');
    }
}

module.exports = SystemVerifier; 