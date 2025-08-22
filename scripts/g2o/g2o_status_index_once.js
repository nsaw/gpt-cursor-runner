#!/usr/bin/env node

/**
 * G2o Status Indexer - Non-blocking
 * 
 * Scans the g2o status directory for patch execution files and generates
 * both machine-readable JSON and human-readable markdown summaries.
 * 
 * Usage: node g2o_status_index_once.js
 * 
 * Outputs:
 * - /Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_g2o-status/index.json
 * - /Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_g2o-status/index.md
 */

const fs = require('fs');
const path = require('path');

// Configuration
const STATUS_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_g2o-status';
const INDEX_JSON = path.join(STATUS_DIR, 'index.json');
const INDEX_MD = path.join(STATUS_DIR, 'index.md');
const TIMEOUT_MS = 7000; // 7 second hard timeout

// Start timeout
const timeout = setTimeout(() => {
    console.error('TIMEOUT: Status indexer exceeded 7s limit');
    process.exit(2);
}, TIMEOUT_MS);

try {
    // Ensure status directory exists
    if (!fs.existsSync(STATUS_DIR)) {
        console.log('STATUS_DIR_MISSING: Creating status directory');
        fs.mkdirSync(STATUS_DIR, { recursive: true });
    }

    // Scan for status files
    const statusFiles = [];
    if (fs.existsSync(STATUS_DIR)) {
        const files = fs.readdirSync(STATUS_DIR);
        for (const file of files) {
            if (file.match(/\.(plan|trace|done|error)\.json$/)) {
                statusFiles.push(file);
            }
        }
    }

    // Group files by patch ID
    const patchStatuses = {};
    
    for (const file of statusFiles) {
        const match = file.match(/^(.+?)\.(plan|trace|done|error)\.json$/);
        if (match) {
            const patchId = match[1];
            const type = match[2];
            
            if (!patchStatuses[patchId]) {
                patchStatuses[patchId] = {
                    id: patchId,
                    files: [],
                    success: false,
                    lastStep: null,
                    durations: [],
                    lastUpdate: null
                };
            }
            
            const filePath = path.join(STATUS_DIR, file);
            const stats = fs.statSync(filePath);
            
            patchStatuses[patchId].files.push({
                type,
                file,
                size: stats.size,
                mtime: stats.mtime.toISOString()
            });
            
            // Update last update time
            if (!patchStatuses[patchId].lastUpdate || stats.mtime > new Date(patchStatuses[patchId].lastUpdate)) {
                patchStatuses[patchId].lastUpdate = stats.mtime.toISOString();
            }
            
            // Determine success status
            if (type === 'done') {
                patchStatuses[patchId].success = true;
            } else if (type === 'error') {
                patchStatuses[patchId].success = false;
            }
            
            // Extract timing info from trace files
            if (type === 'trace') {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const trace = JSON.parse(content);
                    if (Array.isArray(trace)) {
                        patchStatuses[patchId].lastStep = trace.length > 0 ? trace[trace.length - 1].step : null;
                        patchStatuses[patchId].durations = trace.map(t => t.durationMs || 0);
                    }
                } catch (e) {
                    // Ignore parse errors
                }
            }
        }
    }

    // Convert to array and sort by last update
    const patchArray = Object.values(patchStatuses).sort((a, b) => {
        return new Date(b.lastUpdate || 0) - new Date(a.lastUpdate || 0);
    });

    // Generate JSON index
    const jsonIndex = {
        generated: new Date().toISOString(),
        totalPatches: patchArray.length,
        successfulPatches: patchArray.filter(p => p.success).length,
        failedPatches: patchArray.filter(p => !p.success).length,
        patches: patchArray
    };

    fs.writeFileSync(INDEX_JSON, JSON.stringify(jsonIndex, null, 2));
    console.log(`INDEX_JSON_WRITTEN:${INDEX_JSON}`);

    // Generate markdown index
    let mdContent = `# G2o Status Index

Generated: ${jsonIndex.generated}

## Summary
- **Total Patches**: ${jsonIndex.totalPatches}
- **Successful**: ${jsonIndex.successfulPatches}
- **Failed**: ${jsonIndex.failedPatches}

## Recent Patches

`;

    // Show last 10 patches
    const recentPatches = patchArray.slice(0, 10);
    for (const patch of recentPatches) {
        const status = patch.success ? '✅' : '❌';
        const lastStep = patch.lastStep || 'unknown';
        const avgDuration = patch.durations.length > 0 
            ? Math.round(patch.durations.reduce((a, b) => a + b, 0) / patch.durations.length)
            : 0;
        
        mdContent += `### ${status} ${patch.id}
- **Status**: ${patch.success ? 'SUCCESS' : 'FAILED'}
- **Last Step**: ${lastStep}
- **Avg Duration**: ${avgDuration}ms
- **Files**: ${patch.files.length}
- **Last Update**: ${patch.lastUpdate}

`;
    }

    if (patchArray.length > 10) {
        mdContent += `\n... and ${patchArray.length - 10} more patches\n`;
    }

    fs.writeFileSync(INDEX_MD, mdContent);
    console.log(`INDEX_MD_WRITTEN:${INDEX_MD}`);

    // Clear timeout and exit successfully
    clearTimeout(timeout);
    console.log('STATUS_INDEX_COMPLETE');
    process.exit(0);

} catch (error) {
    clearTimeout(timeout);
    console.error(`STATUS_INDEX_ERROR:${error.message}`);
    process.exit(1);
}
