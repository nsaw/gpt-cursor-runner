#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class PerformanceOptimizer {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.optimizationLog = path.join(this.logDir, 'performance-optimization.log');
        this.metricsFile = path.join(this.logDir, 'performance-metrics.json');
        this.ensureLogDir();
    }

    ensureLogDir() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            component: 'performance-optimizer'
        };
        
        console.log(`[${timestamp}] [${level}] ${message}`);
        
        // Append to log file
        fs.appendFileSync(this.optimizationLog, JSON.stringify(logEntry) + '\n');
    }

    getSystemMetrics() {
        try {
            const metrics = {
                timestamp: new Date().toISOString(),
                memory: this.getMemoryUsage(),
                cpu: this.getCPUUsage(),
                disk: this.getDiskUsage(),
                processes: this.getProcessCount(),
                uptime: process.uptime()
            };
            
            return metrics;
        } catch (error) {
            this.log(`Error getting system metrics: ${error.message}`, 'ERROR');
            return null;
        }
    }

    getMemoryUsage() {
        try {
            const memInfo = execSync('vm_stat', { encoding: 'utf8' });
            const lines = memInfo.split('\n');
            const metrics = {};
            
            lines.forEach(line => {
                if (line.includes(':')) {
                    const [key, value] = line.split(':').map(s => s.trim());
                    if (key && value) {
                        metrics[key] = value;
                    }
                }
            });
            
            return metrics;
        } catch (error) {
            return { error: error.message };
        }
    }

    getCPUUsage() {
        try {
            const cpuInfo = execSync('top -l 1 -n 0', { encoding: 'utf8' });
            const lines = cpuInfo.split('\n');
            const cpuLine = lines.find(line => line.includes('CPU usage'));
            
            if (cpuLine) {
                return cpuLine.trim();
            }
            
            return 'CPU usage unavailable';
        } catch (error) {
            return { error: error.message };
        }
    }

    getDiskUsage() {
        try {
            const diskInfo = execSync('df -h .', { encoding: 'utf8' });
            return diskInfo.trim();
        } catch (error) {
            return { error: error.message };
        }
    }

    getProcessCount() {
        try {
            const processCount = execSync('ps aux | wc -l', { encoding: 'utf8' });
            return parseInt(processCount.trim()) - 1; // Subtract header line
        } catch (error) {
            return { error: error.message };
        }
    }

    optimizeMemory() {
        this.log('Starting memory optimization...');
        
        try {
            // Clear Node.js garbage collection
            if (global.gc) {
                global.gc();
                this.log('Garbage collection triggered');
            }
            
            // Check for memory leaks in log files
            this.cleanupOldLogs();
            
            this.log('Memory optimization completed');
            return true;
        } catch (error) {
            this.log(`Memory optimization failed: ${error.message}`, 'ERROR');
            return false;
        }
    }

    cleanupOldLogs() {
        try {
            const logFiles = fs.readdirSync(this.logDir);
            const now = Date.now();
            const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
            
            let cleanedCount = 0;
            
            logFiles.forEach(file => {
                const filePath = path.join(this.logDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filePath);
                    cleanedCount++;
                }
            });
            
            if (cleanedCount > 0) {
                this.log(`Cleaned up ${cleanedCount} old log files`);
            }
        } catch (error) {
            this.log(`Log cleanup failed: ${error.message}`, 'ERROR');
        }
    }

    optimizePerformance() {
        this.log('Starting performance optimization...');
        
        const optimizations = [
            this.optimizeMemory(),
            this.optimizeProcesses(),
            this.optimizeFileSystem()
        ];
        
        const successCount = optimizations.filter(Boolean).length;
        this.log(`Performance optimization completed: ${successCount}/${optimizations.length} optimizations successful`);
        
        return successCount === optimizations.length;
    }

    optimizeProcesses() {
        this.log('Optimizing process management...');
        
        try {
            // Check for zombie processes
            const zombieCount = execSync('ps aux | grep -c "[Zz]ombie"', { encoding: 'utf8' });
            const zombieCountNum = parseInt(zombieCount.trim());
            
            if (zombieCountNum > 0) {
                this.log(`Found ${zombieCountNum} zombie processes`);
            }
            
            return true;
        } catch (error) {
            this.log(`Process optimization failed: ${error.message}`, 'ERROR');
            return false;
        }
    }

    optimizeFileSystem() {
        this.log('Optimizing file system...');
        
        try {
            // Check disk space
            const diskUsage = this.getDiskUsage();
            if (typeof diskUsage === 'string' && diskUsage.includes('90%')) {
                this.log('Warning: Disk usage is high');
            }
            
            return true;
        } catch (error) {
            this.log(`File system optimization failed: ${error.message}`, 'ERROR');
            return false;
        }
    }

    saveMetrics(metrics) {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
            this.log('Performance metrics saved');
        } catch (error) {
            this.log(`Failed to save metrics: ${error.message}`, 'ERROR');
        }
    }

    runOptimization() {
        this.log('🚀 Starting Performance Optimizer...');
        
        const metrics = this.getSystemMetrics();
        if (metrics) {
            this.saveMetrics(metrics);
        }
        
        const optimizationSuccess = this.optimizePerformance();
        
        if (optimizationSuccess) {
            this.log('✅ Performance optimization completed successfully');
        } else {
            this.log('⚠️ Performance optimization completed with warnings', 'WARN');
        }
        
        return optimizationSuccess;
    }

    startMonitoring(intervalMs = 300000) { // 5 minutes default
        this.log(`🔄 Starting performance monitoring (interval: ${intervalMs}ms)`);
        
        const runOptimization = () => {
            this.runOptimization();
        };
        
        // Run immediately
        runOptimization();
        
        // Schedule periodic runs
        setInterval(runOptimization, intervalMs);
        
        this.log('Performance monitoring active');
    }
}

// CLI interface
if (require.main === module) {
    const optimizer = new PerformanceOptimizer();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'start':
            optimizer.startMonitoring();
            break;
        case 'optimize':
            optimizer.runOptimization();
            process.exit(0);
            break;
        case 'metrics':
            const metrics = optimizer.getSystemMetrics();
            console.log(JSON.stringify(metrics, null, 2));
            break;
        default:
            console.log('Usage: node performance-optimizer.js [start|optimize|metrics]');
            process.exit(1);
    }
}

module.exports = PerformanceOptimizer; 