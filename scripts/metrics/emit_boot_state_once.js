#!/usr/bin/env node

/**
 * Boot State Metrics Emitter
 * Emits concise boot state JSON (counts by status + names) for dashboards
 */

const pm2 = require('pm2');

function analyzeBootState(processes) {
    const statusCounts = {};
    const statusNames = {};
    
    processes.forEach(process => {
        const status = process.pm2_env?.status || 'unknown';
        
        if (!statusCounts[status]) {
            statusCounts[status] = 0;
            statusNames[status] = [];
        }
        
        statusCounts[status]++;
        statusNames[status].push(process.name);
    });
    
    return {
        timestamp: new Date().toISOString(),
        totalProcesses: processes.length,
        statusCounts: statusCounts,
        statusNames: statusNames,
        summary: {
            online: statusCounts.online || 0,
            stopped: statusCounts.stopped || 0,
            errored: statusCounts.errored || 0,
            unknown: statusCounts.unknown || 0
        }
    };
}

async function main() {
    try {
        const processes = await new Promise((resolve, reject) => {
            pm2.connect((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                pm2.list((err, processes) => {
                    pm2.disconnect();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(processes || []);
                    }
                });
            });
        });
        
        const bootState = analyzeBootState(processes);
        
        // Output to stdout for dashboard consumption
        console.log(JSON.stringify(bootState, null, 2));
        
        // Also log summary for quick reference
        console.error(`BOOT_STATE_SUMMARY: ${bootState.summary.online} online, ${bootState.summary.stopped} stopped, ${bootState.summary.errored} errored`);
        
        process.exit(0);
        
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
