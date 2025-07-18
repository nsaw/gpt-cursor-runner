#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const LogRotator = require('./log-rotation.js');

class SummaryCleanup {
    constructor() {
        this.logRotator = new LogRotator();
        this.summariesDir = 'summaries';
        this.backupDir = 'summaries/archive';
        this.maxAgeHours = 48;
        this.maxAgeMs = this.maxAgeHours * 60 * 60 * 1000;
    }

    async cleanup() {
        console.log('🧹 Starting Summary Cleanup...');
        
        if (!fs.existsSync(this.summariesDir)) {
            console.log('No summaries directory found');
            return { cleaned: 0, archived: 0, errors: 0 };
        }

        // Ensure backup directory exists
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        const files = fs.readdirSync(this.summariesDir)
            .filter(file => file.endsWith('.md') && file !== 'README.md');

        let cleaned = 0;
        let archived = 0;
        let errors = 0;

        for (const file of files) {
            try {
                const filePath = path.join(this.summariesDir, file);
                const stats = fs.statSync(filePath);
                const ageMs = Date.now() - stats.mtime.getTime();

                if (ageMs > this.maxAgeMs) {
                    // Archive old files
                    const backupPath = path.join(this.backupDir, file);
                    fs.renameSync(filePath, backupPath);
                    archived++;
                    
                    this.logRotator.writeLogEntry('summary-cleanup.log', {
                        action: 'archived',
                        file: file,
                        age: Math.round(ageMs / (60 * 60 * 1000)),
                        backupPath: backupPath
                    });
                    
                    console.log(`📦 Archived: ${file}`);
                } else {
                    // Keep recent files
                    cleaned++;
                }
            } catch (error) {
                errors++;
                console.error(`❌ Error processing ${file}: ${error.message}`);
                
                this.logRotator.writeLogEntry('summary-cleanup.log', {
                    action: 'error',
                    file: file,
                    error: error.message
                });
            }
        }

        const result = { cleaned, archived, errors };
        
        this.logRotator.writeLogEntry('summary-cleanup.log', {
            action: 'cleanup-complete',
            ...result,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Cleanup complete: ${cleaned} kept, ${archived} archived, ${errors} errors`);
        return result;
    }

    async restoreArchived() {
        console.log('📦 Restoring archived summaries...');
        
        if (!fs.existsSync(this.backupDir)) {
            console.log('No backup directory found');
            return { restored: 0, errors: 0 };
        }

        const files = fs.readdirSync(this.backupDir)
            .filter(file => file.endsWith('.md'));

        let restored = 0;
        let errors = 0;

        for (const file of files) {
            try {
                const backupPath = path.join(this.backupDir, file);
                const restorePath = path.join(this.summariesDir, file);
                
                fs.renameSync(backupPath, restorePath);
                restored++;
                
                this.logRotator.writeLogEntry('summary-cleanup.log', {
                    action: 'restored',
                    file: file,
                    restorePath: restorePath
                });
                
                console.log(`📦 Restored: ${file}`);
            } catch (error) {
                errors++;
                console.error(`❌ Error restoring ${file}: ${error.message}`);
                
                this.logRotator.writeLogEntry('summary-cleanup.log', {
                    action: 'restore-error',
                    file: file,
                    error: error.message
                });
            }
        }

        const result = { restored, errors };
        
        this.logRotator.writeLogEntry('summary-cleanup.log', {
            action: 'restore-complete',
            ...result,
            timestamp: new Date().toISOString()
        });

        console.log(`✅ Restore complete: ${restored} restored, ${errors} errors`);
        return result;
    }

    getStatus() {
        if (!fs.existsSync(this.summariesDir)) {
            return { total: 0, archived: 0, recent: 0 };
        }

        const files = fs.readdirSync(this.summariesDir)
            .filter(file => file.endsWith('.md') && file !== 'README.md');

        let recent = 0;
        let archived = 0;

        for (const file of files) {
            const filePath = path.join(this.summariesDir, file);
            const stats = fs.statSync(filePath);
            const ageMs = Date.now() - stats.mtime.getTime();

            if (ageMs > this.maxAgeMs) {
                archived++;
            } else {
                recent++;
            }
        }

        // Count archived files
        if (fs.existsSync(this.backupDir)) {
            const backupFiles = fs.readdirSync(this.backupDir)
                .filter(file => file.endsWith('.md'));
            archived += backupFiles.length;
        }

        return {
            total: files.length,
            recent,
            archived,
            maxAgeHours: this.maxAgeHours
        };
    }

    async dryRun() {
        console.log('🔍 Dry run - checking what would be cleaned...');
        
        if (!fs.existsSync(this.summariesDir)) {
            console.log('No summaries directory found');
            return { wouldArchive: 0, wouldKeep: 0 };
        }

        const files = fs.readdirSync(this.summariesDir)
            .filter(file => file.endsWith('.md') && file !== 'README.md');

        let wouldArchive = 0;
        let wouldKeep = 0;

        for (const file of files) {
            const filePath = path.join(this.summariesDir, file);
            const stats = fs.statSync(filePath);
            const ageMs = Date.now() - stats.mtime.getTime();

            if (ageMs > this.maxAgeMs) {
                wouldArchive++;
                console.log(`📦 Would archive: ${file} (${Math.round(ageMs / (60 * 60 * 1000))}h old)`);
            } else {
                wouldKeep++;
                console.log(`✅ Would keep: ${file} (${Math.round(ageMs / (60 * 60 * 1000))}h old)`);
            }
        }

        console.log(`📊 Summary: ${wouldKeep} would keep, ${wouldArchive} would archive`);
        return { wouldKeep, wouldArchive };
    }
}

// CLI usage
if (require.main === module) {
    const cleanup = new SummaryCleanup();
    const command = process.argv[2];

    switch (command) {
        case 'cleanup':
            cleanup.cleanup().then(result => {
                process.exit(result.errors > 0 ? 1 : 0);
            });
            break;
        case 'restore':
            cleanup.restoreArchived().then(result => {
                process.exit(result.errors > 0 ? 1 : 0);
            });
            break;
        case 'status':
            console.log(JSON.stringify(cleanup.getStatus(), null, 2));
            break;
        case 'dry-run':
            cleanup.dryRun();
            break;
        default:
            console.log('Usage: node summary-cleanup.js [cleanup|restore|status|dry-run]');
    }
}

module.exports = SummaryCleanup; 