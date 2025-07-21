#!/usr/bin/env node

/**
 * GHOST 2.0 Consolidated Daemon
 * Merges Braun and Cyops daemon functionalities
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class ConsolidatedDaemon {
    constructor() {
        this.heartbeatFile = 'summaries/_heartbeat/.consolidated-daemon-health.json';
        this.logFile = 'logs/consolidated-daemon.log';
        this.isRunning = false;
        this.stats = {
            startTime: new Date(),
            processedRequests: 0,
            errors: 0,
            lastHeartbeat: null
        };
        
        // Ensure directories exist
        this.ensureDirectories();
    }
    
    ensureDirectories() {
        const dirs = ['logs', 'summaries/_heartbeat'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [CONSOLIDATED-DAEMON] ${message}\n`;
        
        console.log(logEntry.trim());
        fs.appendFileSync(this.logFile, logEntry);
    }
    
    writeHeartbeat() {
        try {
            const heartbeat = {
                service: 'consolidated-daemon',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                stats: this.stats,
                uptime: Date.now() - this.stats.startTime.getTime()
            };
            
            fs.writeFileSync(this.heartbeatFile, JSON.stringify(heartbeat, null, 2));
            this.stats.lastHeartbeat = new Date();
            
            this.log('Heartbeat written');
        } catch (error) {
            this.log(`Error writing heartbeat: ${error.message}`);
            this.stats.errors++;
        }
    }
    
    // Braun functionality: Process monitoring
    monitorProcesses() {
        exec('ps aux | grep -E "(node|python|watchdog)" | grep -v grep', (error, stdout) => {
            if (error) {
                this.log(`Error monitoring processes: ${error.message}`);
                return;
            }
            
            const processes = stdout.trim().split('\n').filter(line => line.length > 0);
            this.log(`Monitoring ${processes.length} processes`);
            
            // Check for excessive processes
            if (processes.length > 20) {
                this.log('WARNING: High process count detected');
            }
        });
    }
    
    // Cyops functionality: System health checks
    checkSystemHealth() {
        exec('df -h / | tail -1', (error, stdout) => {
            if (error) {
                this.log(`Error checking disk usage: ${error.message}`);
                return;
            }
            
            const diskUsage = stdout.trim().split(/\s+/)[4].replace('%', '');
            if (parseInt(diskUsage) > 90) {
                this.log(`CRITICAL: Disk usage at ${diskUsage}%`);
            }
        });
        
        exec('top -l 1 | grep PhysMem', (error, stdout) => {
            if (error) {
                this.log(`Error checking memory usage: ${error.message}`);
                return;
            }
            
            const memMatch = stdout.match(/(\d+)%/);
            if (memMatch && parseInt(memMatch[1]) > 80) {
                this.log(`WARNING: Memory usage at ${memMatch[1]}%`);
            }
        });
    }
    
    // Unified functionality: Request processing
    processRequest(requestType, data) {
        this.stats.processedRequests++;
        
        switch (requestType) {
            case 'health_check':
                this.checkSystemHealth();
                break;
            case 'process_monitor':
                this.monitorProcesses();
                break;
            case 'cleanup':
                this.performCleanup();
                break;
            default:
                this.log(`Unknown request type: ${requestType}`);
        }
    }
    
    performCleanup() {
        // Clean up old log files
        exec('find logs -name "*.log" -mtime +7 -delete', (error) => {
            if (error) {
                this.log(`Error cleaning up logs: ${error.message}`);
            } else {
                this.log('Log cleanup completed');
            }
        });
        
        // Clean up old heartbeat files
        exec('find summaries/_heartbeat -name "*.json" -mtime +1 -delete', (error) => {
            if (error) {
                this.log(`Error cleaning up heartbeats: ${error.message}`);
            } else {
                this.log('Heartbeat cleanup completed');
            }
        });
    }
    
    start() {
        if (this.isRunning) {
            this.log('Daemon already running');
            return;
        }
        
        this.isRunning = true;
        this.log('Consolidated daemon started');
        
        // Write initial heartbeat
        this.writeHeartbeat();
        
        // Start monitoring loop
        this.monitoringLoop();
        
        // Start heartbeat loop
        this.heartbeatLoop();
    }
    
    monitoringLoop() {
        if (!this.isRunning) return;
        
        // Process monitoring (Braun functionality)
        this.monitorProcesses();
        
        // System health checks (Cyops functionality)
        this.checkSystemHealth();
        
        // Schedule next monitoring cycle
        setTimeout(() => this.monitoringLoop(), 30000); // Every 30 seconds
    }
    
    heartbeatLoop() {
        if (!this.isRunning) return;
        
        // Write heartbeat
        this.writeHeartbeat();
        
        // Schedule next heartbeat
        setTimeout(() => this.heartbeatLoop(), 60000); // Every minute
    }
    
    stop() {
        this.isRunning = false;
        this.log('Consolidated daemon stopped');
    }
    
    getStats() {
        return {
            ...this.stats,
            isRunning: this.isRunning,
            uptime: Date.now() - this.stats.startTime.getTime()
        };
    }
}

// Create and start daemon
const daemon = new ConsolidatedDaemon();

// Handle graceful shutdown
process.on('SIGINT', () => {
    daemon.log('Received SIGINT, shutting down gracefully');
    daemon.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    daemon.log('Received SIGTERM, shutting down gracefully');
    daemon.stop();
    process.exit(0);
});

// Start the daemon
daemon.start();

// Keep the process alive
setInterval(() => {
    if (!daemon.isRunning) {
        process.exit(1);
    }
}, 5000); 