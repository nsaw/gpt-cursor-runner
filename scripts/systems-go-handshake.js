#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const LogRotator = require('./log-rotation.js');

class SystemsGoHandshake {
    constructor() {
        this.logRotator = new LogRotator();
        this.handshakeFile = 'logs/systems-go-handshake.json';
        this.requiredSystems = [
            'cursor-autopilot',
            'log-rotation',
            'trust-daemon',
            'summary-cleanup',
            'verification-system'
        ];
    }

    async performHandshake() {
        const handshake = {
            timestamp: new Date().toISOString(),
            status: 'initiating',
            systems: {},
            overall: false
        };

        console.log('🤝 Initiating Systems-Go Handshake...');

        // Check each required system
        for (const system of this.requiredSystems) {
            const systemStatus = await this.checkSystem(system);
            handshake.systems[system] = systemStatus;
            
            if (systemStatus.status === 'operational') {
                console.log(`✅ ${system}: ${systemStatus.message}`);
            } else {
                console.log(`❌ ${system}: ${systemStatus.message}`);
            }
        }

        // Determine overall status
        const operationalSystems = Object.values(handshake.systems)
            .filter(sys => sys.status === 'operational').length;
        
        handshake.overall = operationalSystems === this.requiredSystems.length;
        handshake.status = handshake.overall ? 'systems-go' : 'systems-hold';

        // Log the handshake
        this.logRotator.writeLogEntry('systems-go-handshake.log', handshake);

        // Save handshake state
        fs.writeFileSync(this.handshakeFile, JSON.stringify(handshake, null, 2));

        if (handshake.overall) {
            console.log('🚀 SYSTEMS-GO: All critical systems operational');
            return true;
        } else {
            console.log('⏸️  SYSTEMS-HOLD: Some systems require attention');
            return false;
        }
    }

    async checkSystem(systemName) {
        switch (systemName) {
            case 'cursor-autopilot':
                return this.checkCursorAutopilot();
            case 'log-rotation':
                return this.checkLogRotation();
            case 'trust-daemon':
                return this.checkTrustDaemon();
            case 'summary-cleanup':
                return this.checkSummaryCleanup();
            case 'verification-system':
                return this.checkVerificationSystem();
            default:
                return { status: 'unknown', message: 'Unknown system' };
        }
    }

    checkCursorAutopilot() {
        try {
            const configPath = 'config/.cursor-config.json';
            if (!fs.existsSync(configPath)) {
                return { status: 'error', message: 'Cursor config not found' };
            }

            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const autopilotEnabled = config.autopilot && config.autopilot.enabled;
            
            return {
                status: autopilotEnabled ? 'operational' : 'warning',
                message: autopilotEnabled ? 'Autopilot enabled' : 'Autopilot disabled'
            };
        } catch (error) {
            return { status: 'error', message: `Config error: ${error.message}` };
        }
    }

    checkLogRotation() {
        try {
            const logRotationPath = 'scripts/log-rotation.js';
            if (!fs.existsSync(logRotationPath)) {
                return { status: 'error', message: 'Log rotation script not found' };
            }

            // Test log rotation functionality
            const testLog = 'logs/test-rotation.log';
            this.logRotator.writeLogEntry('test-rotation.log', { test: true });
            
            if (fs.existsSync(testLog)) {
                fs.unlinkSync(testLog);
                return { status: 'operational', message: 'Log rotation functional' };
            } else {
                return { status: 'error', message: 'Log rotation test failed' };
            }
        } catch (error) {
            return { status: 'error', message: `Log rotation error: ${error.message}` };
        }
    }

    checkTrustDaemon() {
        try {
            const trustDaemonPath = 'scripts/trust-daemon.js';
            if (!fs.existsSync(trustDaemonPath)) {
                return { status: 'error', message: 'Trust daemon not found' };
            }

            // Check if trust daemon is running
            const pidFile = 'logs/trust-daemon.pid';
            if (fs.existsSync(pidFile)) {
                const pid = fs.readFileSync(pidFile, 'utf8').trim();
                try {
                    execSync(`kill -0 ${pid}`, { stdio: 'ignore' });
                    return { status: 'operational', message: 'Trust daemon running' };
                } catch {
                    return { status: 'warning', message: 'Trust daemon PID stale' };
                }
            } else {
                return { status: 'warning', message: 'Trust daemon not running' };
            }
        } catch (error) {
            return { status: 'error', message: `Trust daemon error: ${error.message}` };
        }
    }

    checkSummaryCleanup() {
        try {
            const cleanupScript = 'scripts/summary-cleanup.js';
            if (!fs.existsSync(cleanupScript)) {
                return { status: 'error', message: 'Summary cleanup script not found' };
            }

            // Check summaries directory
            const summariesDir = 'summaries';
            if (!fs.existsSync(summariesDir)) {
                return { status: 'operational', message: 'No summaries to clean' };
            }

            const summaryFiles = fs.readdirSync(summariesDir)
                .filter(file => file.endsWith('.md'))
                .length;

            return {
                status: 'operational',
                message: `${summaryFiles} summary files found`
            };
        } catch (error) {
            return { status: 'error', message: `Summary cleanup error: ${error.message}` };
        }
    }

    checkVerificationSystem() {
        try {
            const verificationScript = 'scripts/verify-systems.js';
            if (!fs.existsSync(verificationScript)) {
                return { status: 'error', message: 'Verification script not found' };
            }

            return { status: 'operational', message: 'Verification system available' };
        } catch (error) {
            return { status: 'error', message: `Verification error: ${error.message}` };
        }
    }

    getLastHandshake() {
        if (fs.existsSync(this.handshakeFile)) {
            try {
                return JSON.parse(fs.readFileSync(this.handshakeFile, 'utf8'));
            } catch (error) {
                return null;
            }
        }
        return null;
    }

    isSystemsGo() {
        const handshake = this.getLastHandshake();
        return handshake && handshake.overall === true;
    }
}

// CLI usage
if (require.main === module) {
    const handshake = new SystemsGoHandshake();
    const command = process.argv[2];

    switch (command) {
        case 'check':
            handshake.performHandshake().then(success => {
                process.exit(success ? 0 : 1);
            });
            break;
        case 'status':
            const lastHandshake = handshake.getLastHandshake();
            if (lastHandshake) {
                console.log(JSON.stringify(lastHandshake, null, 2));
            } else {
                console.log('No handshake data available');
            }
            break;
        default:
            console.log('Usage: node systems-go-handshake.js [check|status]');
    }
}

module.exports = SystemsGoHandshake; 