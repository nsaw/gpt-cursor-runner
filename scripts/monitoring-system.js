#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const LogRotator = require('./log-rotation.js');

class MonitoringSystem {
    constructor() {
        this.logRotator = new LogRotator();
        this.monitoringInterval = 30000; // 30 seconds
        this.healthThresholds = {
            cpu: 80, // CPU usage threshold
            memory: 85, // Memory usage threshold
            disk: 90, // Disk usage threshold
            processes: 5 // Minimum required processes
        };
        this.monitoring = false;
    }

    start() {
        console.log('🔍 Starting Comprehensive Monitoring System...');
        this.monitoring = true;
        this.monitor();
        
        // Set up periodic monitoring
        setInterval(() => {
            if (this.monitoring) {
                this.monitor();
            }
        }, this.monitoringInterval);
    }

    stop() {
        console.log('🛑 Stopping Monitoring System...');
        this.monitoring = false;
    }

    async monitor() {
        try {
            const healthData = {
                timestamp: new Date().toISOString(),
                system: 'tm-mobile-cursor',
                checks: {}
            };

            // Check system resources
            healthData.checks.resources = await this.checkSystemResources();
            
            // Check critical processes
            healthData.checks.processes = await this.checkCriticalProcesses();
            
            // Check file system health
            healthData.checks.filesystem = await this.checkFileSystem();
            
            // Check log health
            healthData.checks.logs = await this.checkLogHealth();
            
            // Determine overall health
            healthData.overall = this.determineOverallHealth(healthData.checks);
            
            // Log health data
            this.logRotator.writeLogEntry('monitoring-system.log', healthData);
            
            // Alert if health is poor
            if (healthData.overall.status === 'poor') {
                this.handlePoorHealth(healthData);
            }
            
            return healthData;
        } catch (error) {
            console.error('Monitoring error:', error);
            this.logRotator.writeLogEntry('monitoring-system.log', {
                timestamp: new Date().toISOString(),
                error: 'Monitoring failed',
                details: error.message
            });
        }
    }

    async checkSystemResources() {
        try {
            // Get CPU usage (simplified)
            const cpuUsage = Math.floor(Math.random() * 100); // Placeholder
            
            // Get memory usage
            const memInfo = execSync('vm_stat', { encoding: 'utf8' });
            const memoryUsage = this.parseMemoryUsage(memInfo);
            
            // Get disk usage
            const diskInfo = execSync('df -h .', { encoding: 'utf8' });
            const diskUsage = this.parseDiskUsage(diskInfo);
            
            return {
                cpu: {
                    usage: cpuUsage,
                    status: cpuUsage < this.healthThresholds.cpu ? 'good' : 'warning'
                },
                memory: {
                    usage: memoryUsage,
                    status: memoryUsage < this.healthThresholds.memory ? 'good' : 'warning'
                },
                disk: {
                    usage: diskUsage,
                    status: diskUsage < this.healthThresholds.disk ? 'good' : 'warning'
                }
            };
        } catch (error) {
            return {
                error: error.message,
                status: 'error'
            };
        }
    }

    async checkCriticalProcesses() {
        const processes = [
            { name: 'trust-daemon', pattern: 'trust-daemon.js' },
            { name: 'log-rotation', pattern: 'log-rotation.js' },
            { name: 'systems-go', pattern: 'systems-go-handshake.js' }
        ];

        const results = {};
        let runningCount = 0;

        for (const process of processes) {
            try {
                const isRunning = this.isProcessRunning(process.pattern);
                results[process.name] = {
                    running: isRunning,
                    status: isRunning ? 'operational' : 'down'
                };
                if (isRunning) runningCount++;
            } catch (error) {
                results[process.name] = {
                    running: false,
                    status: 'error',
                    error: error.message
                };
            }
        }

        return {
            processes: results,
            running: runningCount,
            total: processes.length,
            status: runningCount >= this.healthThresholds.processes ? 'good' : 'poor'
        };
    }

    async checkFileSystem() {
        const criticalPaths = [
            'scripts/',
            'logs/',
            'summaries/',
            'config/.cursor-config.json'
        ];

        const results = {};
        let healthyCount = 0;

        for (const path of criticalPaths) {
            try {
                const exists = fs.existsSync(path);
                const writable = exists ? this.isWritable(path) : false;
                
                results[path] = {
                    exists,
                    writable,
                    status: exists && writable ? 'healthy' : 'unhealthy'
                };
                
                if (exists && writable) healthyCount++;
            } catch (error) {
                results[path] = {
                    exists: false,
                    writable: false,
                    status: 'error',
                    error: error.message
                };
            }
        }

        return {
            paths: results,
            healthy: healthyCount,
            total: criticalPaths.length,
            status: healthyCount === criticalPaths.length ? 'good' : 'poor'
        };
    }

    async checkLogHealth() {
        try {
            const logDir = 'logs';
            if (!fs.existsSync(logDir)) {
                return { status: 'error', message: 'Log directory not found' };
            }

            const logFiles = fs.readdirSync(logDir)
                .filter(file => file.endsWith('.log'))
                .map(file => {
                    const filePath = path.join(logDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        file,
                        size: stats.size,
                        modified: stats.mtime,
                        age: Date.now() - stats.mtime.getTime()
                    };
                });

            const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0);
            const avgAge = logFiles.reduce((sum, file) => sum + file.age, 0) / logFiles.length;

            return {
                files: logFiles.length,
                totalSize,
                avgAge,
                status: totalSize < 10000000 && avgAge < 86400000 ? 'good' : 'warning' // 10MB and 24h thresholds
            };
        } catch (error) {
            return { status: 'error', error: error.message };
        }
    }

    determineOverallHealth(checks) {
        const statuses = [
            checks.resources?.status,
            checks.processes?.status,
            checks.filesystem?.status,
            checks.logs?.status
        ].filter(Boolean);

        const goodCount = statuses.filter(s => s === 'good').length;
        const poorCount = statuses.filter(s => s === 'poor').length;
        const errorCount = statuses.filter(s => s === 'error').length;

        if (errorCount > 0) return { status: 'error', score: 0 };
        if (poorCount > 0) return { status: 'poor', score: goodCount / statuses.length };
        return { status: 'good', score: 1.0 };
    }

    handlePoorHealth(healthData) {
        console.log('⚠️  Poor system health detected:', healthData.overall);
        
        // Log alert
        this.logRotator.writeLogEntry('monitoring-alerts.log', {
            timestamp: new Date().toISOString(),
            alert: 'poor-health',
            healthData: healthData.overall,
            details: healthData.checks
        });

        // Could implement automatic recovery actions here
        // For now, just log the alert
    }

    isProcessRunning(pattern) {
        try {
            const result = execSync(`ps aux | grep "${pattern}" | grep -v grep`, { encoding: 'utf8' });
            return result.trim().length > 0;
        } catch (error) {
            return false;
        }
    }

    isWritable(path) {
        try {
            if (fs.existsSync(path)) {
                if (fs.statSync(path).isDirectory()) {
                    const testFile = path + '/.test-write';
                    fs.writeFileSync(testFile, 'test');
                    fs.unlinkSync(testFile);
                    return true;
                } else {
                    return true; // File exists
                }
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    parseMemoryUsage(memInfo) {
        // Simplified memory parsing
        return Math.floor(Math.random() * 100); // Placeholder
    }

    parseDiskUsage(diskInfo) {
        // Simplified disk parsing
        return Math.floor(Math.random() * 100); // Placeholder
    }

    getHealthReport() {
        const reportPath = 'logs/monitoring-report.json';
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
    const monitor = new MonitoringSystem();
    const command = process.argv[2];

    switch (command) {
        case 'start':
            monitor.start();
            break;
        case 'stop':
            monitor.stop();
            break;
        case 'check':
            monitor.monitor().then(healthData => {
                console.log(JSON.stringify(healthData, null, 2));
            });
            break;
        case 'report':
            const report = monitor.getHealthReport();
            if (report) {
                console.log(JSON.stringify(report, null, 2));
            } else {
                console.log('No health report available');
            }
            break;
        default:
            console.log('Usage: node monitoring-system.js [start|stop|check|report]');
    }
}

module.exports = MonitoringSystem; 