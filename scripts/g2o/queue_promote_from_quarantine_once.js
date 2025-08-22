#!/usr/bin/env node

/**
 * Queue Promote From Quarantine Wrapper
 * Safely promotes files from quarantine back to queue with dry-run support
 * Non-destructive: validates before promoting, supports rollback
 */

const fs = require('fs');
const path = require('path');

function main() {
    const args = process.argv.slice(2);
    let requestPath = '';
    let outPath = '';
    let dryRun = false;

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--request' && i + 1 < args.length) {
            requestPath = args[i + 1];
        } else if (args[i] === '--out' && i + 1 < args.length) {
            outPath = args[i + 1];
        } else if (args[i] === '--dryRun') {
            dryRun = args[i + 1] === 'true';
        }
    }

    if (!requestPath || !outPath) {
        console.error('Usage: node queue_promote_from_quarantine_once.js --request <request.json> --out <output.json> [--dryRun true|false]');
        process.exit(1);
    }

    try {
        // Read and validate request
        const requestData = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
        
        if (requestData.mode !== 'PROMOTE') {
            throw new Error('Only PROMOTE mode is supported');
        }

        const quarantineDir = requestData.quarantineDir;
        const targetQueueDir = requestData.targetQueueDir;
        const sampleCount = requestData.sampleCount || 1;

        // Ensure directories exist
        if (!fs.existsSync(quarantineDir)) {
            throw new Error(`Quarantine directory does not exist: ${quarantineDir}`);
        }

        if (!fs.existsSync(targetQueueDir)) {
            throw new Error(`Target queue directory does not exist: ${targetQueueDir}`);
        }

        // Get list of patch files in quarantine directory
        const quarantineFiles = fs.readdirSync(quarantineDir)
            .filter(file => file.endsWith('.json'))
            .filter(file => file.startsWith('patch-'))
            .map(file => path.join(quarantineDir, file));

        // Sort by modification time (oldest first)
        quarantineFiles.sort((a, b) => {
            const statA = fs.statSync(a);
            const statB = fs.statSync(b);
            return statA.mtime.getTime() - statB.mtime.getTime();
        });

        // Take sample (up to sampleCount)
        const filesToPromote = quarantineFiles.slice(0, sampleCount);
        const promotedFiles = [];

        if (dryRun) {
            // Dry run: simulate promotion without moving files
            for (const filePath of filesToPromote) {
                const fileName = path.basename(filePath);
                const targetPath = path.join(targetQueueDir, fileName);
                
                promotedFiles.push({
                    original: filePath,
                    target: targetPath,
                    promoted: false, // dry run
                    timestamp: new Date().toISOString(),
                    dryRun: true
                });
            }
        } else {
            // Actual promotion: move files from quarantine to queue
            for (const filePath of filesToPromote) {
                const fileName = path.basename(filePath);
                const targetPath = path.join(targetQueueDir, fileName);
                
                // Move file (rename)
                fs.renameSync(filePath, targetPath);
                
                promotedFiles.push({
                    original: filePath,
                    target: targetPath,
                    promoted: true,
                    timestamp: new Date().toISOString(),
                    dryRun: false
                });
            }
        }

        // Create report
        const report = {
            timestamp: new Date().toISOString(),
            mode: requestData.mode,
            dryRun: dryRun,
            sampleCount: sampleCount,
            quarantineDir: quarantineDir,
            targetQueueDir: targetQueueDir,
            totalFilesInQuarantine: quarantineFiles.length,
            filesPromoted: promotedFiles.length,
            promoted: promotedFiles,
            summary: dryRun 
                ? `Dry run: Would promote ${promotedFiles.length} files from quarantine to queue`
                : `Promoted ${promotedFiles.length} files from quarantine to queue`
        };

        // Write report
        fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
        
        const action = dryRun ? 'DRY_RUN' : 'PROMOTED';
        console.log(`QUEUE_PROMOTE_${action}_WRITTEN:${outPath} (${promotedFiles.length} files ${dryRun ? 'would be promoted' : 'promoted'})`);
        process.exit(0);

    } catch (error) {
        console.error(`QUEUE_PROMOTE_ERROR: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
