#!/usr/bin/env node

/**
 * Queue Quarantine Plan Apply Wrapper
 * Safely applies queue hygiene plan with COPY_SAMPLE mode
 * Non-destructive: only copies files to quarantine, never deletes originals
 */

const fs = require('fs');
const path = require('path');

function main() {
    const args = process.argv.slice(2);
    let requestPath = '';
    let outPath = '';

    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--request' && i + 1 < args.length) {
            requestPath = args[i + 1];
        } else if (args[i] === '--out' && i + 1 < args.length) {
            outPath = args[i + 1];
        }
    }

    if (!requestPath || !outPath) {
        console.error('Usage: node queue_quarantine_plan_apply_once.js --request <request.json> --out <output.json>');
        process.exit(1);
    }

    try {
        // Read and validate request
        const requestData = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
        
        if (requestData.mode !== 'COPY_SAMPLE') {
            throw new Error('Only COPY_SAMPLE mode is supported');
        }

        const queueDir = requestData.queueDir;
        const quarantineDir = requestData.quarantineDir;
        const sampleCount = requestData.sampleCount || 2;

        // Ensure quarantine directory exists
        if (!fs.existsSync(quarantineDir)) {
            fs.mkdirSync(quarantineDir, { recursive: true });
        }

        // Get list of patch files in queue directory
        const queueFiles = fs.readdirSync(queueDir)
            .filter(file => file.endsWith('.json'))
            .filter(file => file.startsWith('patch-'))
            .map(file => path.join(queueDir, file));

        // Sort by modification time (oldest first)
        queueFiles.sort((a, b) => {
            const statA = fs.statSync(a);
            const statB = fs.statSync(b);
            return statA.mtime.getTime() - statB.mtime.getTime();
        });

        // Take sample (up to sampleCount)
        const filesToCopy = queueFiles.slice(0, sampleCount);
        const copiedFiles = [];

        // Copy files to quarantine (non-destructive)
        for (const filePath of filesToCopy) {
            const fileName = path.basename(filePath);
            const quarantinePath = path.join(quarantineDir, fileName);
            
            // Copy file
            fs.copyFileSync(filePath, quarantinePath);
            copiedFiles.push({
                original: filePath,
                quarantine: quarantinePath,
                copied: true,
                timestamp: new Date().toISOString()
            });
        }

        // Create report
        const report = {
            timestamp: new Date().toISOString(),
            mode: requestData.mode,
            sampleCount: sampleCount,
            queueDir: queueDir,
            quarantineDir: quarantineDir,
            totalFilesInQueue: queueFiles.length,
            filesCopied: copiedFiles.length,
            copied: copiedFiles,
            summary: `Copied ${copiedFiles.length} files to quarantine (${quarantineDir})`
        };

        // Write report
        fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
        
        console.log(`QUEUE_QUARANTINE_APPLY_WRITTEN:${outPath} (${copiedFiles.length} files copied)`);
        process.exit(0);

    } catch (error) {
        console.error(`QUEUE_QUARANTINE_APPLY_ERROR: ${error.message}`);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
