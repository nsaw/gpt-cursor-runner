#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class LogRotator {
    constructor(logDir = 'logs', maxAgeHours = 48) {
        this.logDir = logDir;
        this.maxAgeHours = maxAgeHours;
        this.maxAgeMs = maxAgeHours * 60 * 60 * 1000;
    }

    writeLogEntry(logFile, entry) {
        const logPath = path.join(this.logDir, logFile);
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            ...entry
        };

        // Ensure log directory exists
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }

        // Append to log file
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        
        // Check if rotation is needed
        this.rotateIfNeeded(logPath);
    }

    rotateIfNeeded(logPath) {
        if (!fs.existsSync(logPath)) return;

        const stats = fs.statSync(logPath);
        const ageMs = Date.now() - stats.mtime.getTime();

        if (ageMs > this.maxAgeMs) {
            const backupPath = `${logPath}.${new Date().toISOString().replace(/[:.]/g, '-')}`;
            fs.renameSync(logPath, backupPath);
            console.log(`Rotated log file: ${logPath} -> ${backupPath}`);
        }
    }

    readRecentLogs(logFile, hours = 24) {
        const logPath = path.join(this.logDir, logFile);
        if (!fs.existsSync(logPath)) return [];

        const cutoff = Date.now() - (hours * 60 * 60 * 1000);
        const lines = fs.readFileSync(logPath, 'utf8').split('\n').filter(line => line.trim());
        
        return lines
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            })
            .filter(entry => entry && new Date(entry.timestamp).getTime() > cutoff);
    }

    cleanupOldBackups() {
        if (!fs.existsSync(this.logDir)) return;

        const files = fs.readdirSync(this.logDir);
        const backupFiles = files.filter(file => file.includes('.20') && file.endsWith('.log'));
        const cutoff = Date.now() - (this.maxAgeHours * 2 * 60 * 60 * 1000);

        backupFiles.forEach(file => {
            const filePath = path.join(this.logDir, file);
            const stats = fs.statSync(filePath);
            if (stats.mtime.getTime() < cutoff) {
                fs.unlinkSync(filePath);
                console.log(`Cleaned up old backup: ${file}`);
            }
        });
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LogRotator;
}

// CLI usage
if (require.main === module) {
    const rotator = new LogRotator();
    const command = process.argv[2];
    const logFile = process.argv[3];

    switch (command) {
        case 'write':
            const entry = JSON.parse(process.argv[4] || '{}');
            rotator.writeLogEntry(logFile, entry);
            break;
        case 'read':
            const hours = parseInt(process.argv[4]) || 24;
            const logs = rotator.readRecentLogs(logFile, hours);
            console.log(JSON.stringify(logs, null, 2));
            break;
        case 'cleanup':
            rotator.cleanupOldBackups();
            break;
        default:
            console.log('Usage: node log-rotation.js [write|read|cleanup] [logfile] [data]');
    }
} 