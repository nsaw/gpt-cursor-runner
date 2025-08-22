#!/usr/bin/env node

/**
 * Queue Promote Rollback Wrapper
 * Safely rolls back promoted files from queue back to quarantine
 * Restores files to their original quarantine location
 */

const fs = require('fs');
const path = require('path');

function main() {
    const args = process.argv.slice(2);
    let applyReportPath = '';
    let quarantineDir = '';
    let outPath = '';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--applyReport' && i + 1 < args.length) {
            applyReportPath = args[i + 1];
        } else if (args[i] === '--quarantine' && i + 1 < args.length) {
            quarantineDir = args[i + 1];
        } else if (args[i] === '--out' && i + 1 < args.length) {
            outPath = args[i + 1];
        }
    }

    if (!applyReportPath || !quarantineDir || !outPath) {
        console.error('Usage: node queue_promote_rollback_once.js --applyReport <apply_report.json> --quarantine <quarantine_dir> --out <output.json>');
        process.exit(1);
    }

    try {
        // Read the apply report to get promoted files
        const applyReport = JSON.parse(fs.readFileSync(applyReportPath, 'utf8'));
        
        if (!applyReport.promoted || !Array.isArray(applyReport.promoted)) {
            throw new Error('Invalid apply report: missing promoted files array');
        }

        // Ensure quarantine directory exists
        if (!fs.existsSync(quarantineDir)) {
            fs.mkdirSync(quarantineDir, { recursive: true });
        }

        const rolledBackFiles = [];

        // Rollback each promoted file
        for (const promotedFile of applyReport.promoted) {
            if (promotedFile.promoted && !promotedFile.dryRun) {
                const targetPath = promotedFile.target;
                const fileName = path.basename(targetPath);
                const quarantinePath = path.join(quarantineDir, fileName);

                // Check if file exists in target location
                if (fs.existsSync(targetPath)) {
                    // Move file back to quarantine
                    fs.renameSync(targetPath, quarantinePath);
                    
                    rolledBackFiles.push({
                        original: promotedFile.original,
                        target: targetPath,
                        quarantine: quarantinePath,
                        rolledBack: true,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    // File doesn't exist in target, skip
                    rolledBackFiles.push({
                        original: promotedFile.original,
                        target: targetPath,
                        quarantine: quarantinePath,
                        rolledBack: false,
                        reason: 'File not found in target location',
                        timestamp: new Date().toISOString()
                    });
                }
            }
        }

        // Create rollback report
        const rollbackReport = {
            timestamp: new Date().toISOString(),
            mode: 'ROLLBACK',
            applyReport: applyReportPath,
            quarantineDir: quarantineDir,
            totalPromotedFiles: applyReport.promoted.length,
            filesRolledBack: rolledBackFiles.filter(f => f.rolledBack).length,
            rolledBack: rolledBackFiles,
            summary: `Rolled back ${rolledBackFiles.filter(f => f.rolledBack).length} files from queue to quarantine`
        };

        // Write rollback report
        fs.writeFileSync(outPath, JSON.stringify(rollbackReport, null, 2));
        
        console.log(`QUEUE_PROMOTE_ROLLBACK_WRITTEN:${outPath} (${rolledBackFiles.filter(f => f.rolledBack).length} files rolled back)`);
        process.exit(0);

    } catch (error) {
        console.error(`QUEUE_PROMOTE_ROLLBACK_ERROR: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
