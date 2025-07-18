#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const LogRotator = require('./log-rotation.js');

class TrustDaemon {
    constructor() {
        this.logRotator = new LogRotator();
        this.pidFile = 'logs/trust-daemon.pid';
        this.trustFile = 'logs/trust-state.json';
        this.operations = [];
        this.maxOperations = 10;
        this.trustThreshold = 0.8;
    }

    start() {
        console.log('🛡️  Starting Trust Daemon...');
        
        // Write PID file
        fs.writeFileSync(this.pidFile, process.pid.toString());
        
        // Initialize trust state
        this.initializeTrustState();
        
        // Start monitoring
        this.startMonitoring();
        
        console.log('🛡️  Trust Daemon started and monitoring');
    }

    stop() {
        console.log('🛡️  Stopping Trust Daemon...');
        
        if (fs.existsSync(this.pidFile)) {
            fs.unlinkSync(this.pidFile);
        }
        
        process.exit(0);
    }

    initializeTrustState() {
        const defaultState = {
            trustLevel: 1.0,
            operations: [],
            lastUpdate: new Date().toISOString(),
            violations: 0,
            totalOperations: 0
        };

        if (!fs.existsSync(this.trustFile)) {
            fs.writeFileSync(this.trustFile, JSON.stringify(defaultState, null, 2));
        }
    }

    startMonitoring() {
        // Monitor for signals
        process.on('SIGINT', () => this.stop());
        process.on('SIGTERM', () => this.stop());
        
        // Periodic trust assessment
        setInterval(() => {
            this.assessTrust();
        }, 30000); // Every 30 seconds
    }

    async assessTrust() {
        try {
            const state = this.loadTrustState();
            const newTrustLevel = this.calculateTrustLevel(state);
            
            state.trustLevel = newTrustLevel;
            state.lastUpdate = new Date().toISOString();
            
            this.saveTrustState(state);
            
            // Log trust assessment
            this.logRotator.writeLogEntry('trust-daemon.log', {
                action: 'trust-assessment',
                trustLevel: newTrustLevel,
                operations: state.operations.length,
                violations: state.violations
            });

            // Check if trust is too low
            if (newTrustLevel < this.trustThreshold) {
                this.handleLowTrust();
            }
        } catch (error) {
            console.error('Trust assessment error:', error);
        }
    }

    calculateTrustLevel(state) {
        if (state.totalOperations === 0) return 1.0;
        
        const successRate = (state.totalOperations - state.violations) / state.totalOperations;
        const recentOperations = state.operations.slice(-5);
        const recentSuccessRate = recentOperations.length > 0 
            ? recentOperations.filter(op => op.success).length / recentOperations.length 
            : 1.0;
        
        return (successRate * 0.7) + (recentSuccessRate * 0.3);
    }

    handleLowTrust() {
        console.log('⚠️  Trust level below threshold - initiating safety measures');
        
        this.logRotator.writeLogEntry('trust-daemon.log', {
            action: 'low-trust-alert',
            trustLevel: this.loadTrustState().trustLevel,
            threshold: this.trustThreshold
        });

        // Could implement additional safety measures here
        // For now, just log the event
    }

    recordOperation(operation) {
        const state = this.loadTrustState();
        
        const operationRecord = {
            timestamp: new Date().toISOString(),
            type: operation.type,
            success: operation.success,
            details: operation.details || {}
        };
        
        state.operations.push(operationRecord);
        state.totalOperations++;
        
        if (!operation.success) {
            state.violations++;
        }
        
        // Keep only recent operations
        if (state.operations.length > this.maxOperations) {
            state.operations = state.operations.slice(-this.maxOperations);
        }
        
        this.saveTrustState(state);
        
        // Log operation
        this.logRotator.writeLogEntry('trust-daemon.log', operationRecord);
    }

    canProceed(operationType) {
        const state = this.loadTrustState();
        const trustLevel = state.trustLevel;
        
        // High-risk operations require higher trust
        const highRiskOperations = ['git-push', 'deploy', 'delete', 'restart'];
        const requiredTrust = highRiskOperations.includes(operationType) ? 0.9 : 0.7;
        
        return trustLevel >= requiredTrust;
    }

    loadTrustState() {
        if (fs.existsSync(this.trustFile)) {
            return JSON.parse(fs.readFileSync(this.trustFile, 'utf8'));
        }
        return {
            trustLevel: 1.0,
            operations: [],
            lastUpdate: new Date().toISOString(),
            violations: 0,
            totalOperations: 0
        };
    }

    saveTrustState(state) {
        fs.writeFileSync(this.trustFile, JSON.stringify(state, null, 2));
    }

    getTrustStatus() {
        const state = this.loadTrustState();
        return {
            trustLevel: state.trustLevel,
            canProceed: state.trustLevel >= this.trustThreshold,
            operations: state.operations.length,
            violations: state.violations,
            lastUpdate: state.lastUpdate
        };
    }
}

// CLI usage
if (require.main === module) {
    const daemon = new TrustDaemon();
    const command = process.argv[2];

    switch (command) {
        case 'start':
            daemon.start();
            break;
        case 'stop':
            daemon.stop();
            break;
        case 'status':
            console.log(JSON.stringify(daemon.getTrustStatus(), null, 2));
            break;
        case 'record':
            const operation = JSON.parse(process.argv[3] || '{}');
            daemon.recordOperation(operation);
            console.log('Operation recorded');
            break;
        case 'check':
            const operationType = process.argv[3] || 'default';
            const canProceed = daemon.canProceed(operationType);
            console.log(`Can proceed with ${operationType}: ${canProceed}`);
            process.exit(canProceed ? 0 : 1);
            break;
        default:
            console.log('Usage: node trust-daemon.js [start|stop|status|record|check] [data]');
    }
}

module.exports = TrustDaemon; 