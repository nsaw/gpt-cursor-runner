#!/usr/bin/env node

/**
 * PM2 Unified Verification Tool (Non-blocking)
 * Ensures only allowlisted services are running
 */

const fs = require('fs');
const pm2 = require('pm2');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--allowlist':
                options.allowlistFile = args[++i];
                break;
            case '--out':
                options.outputFile = args[++i];
                break;
        }
    }
    
    return options;
}

function loadAllowlist(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        throw new Error(`Failed to load allowlist: ${err.message}`);
    }
}

function getCurrentProcesses() {
    return new Promise((resolve, reject) => {
        pm2.list((err, processes) => {
            if (err) {
                reject(err);
            } else {
                resolve(processes || []);
            }
        });
    });
}

async function verifyUnifiedState(allowlist, outputFile) {
    return new Promise((resolve, reject) => {
        pm2.connect(async (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            try {
                const processes = await getCurrentProcesses();
                
                const runningProcesses = processes.filter(p => p.pm2_env && p.pm2_env.status === 'online');
                const stoppedProcesses = processes.filter(p => p.pm2_env && p.pm2_env.status === 'stopped');
                const erroredProcesses = processes.filter(p => p.pm2_env && p.pm2_env.status === 'errored');
                
                const runningNames = runningProcesses.map(p => p.name);
                const stoppedNames = stoppedProcesses.map(p => p.name);
                const erroredNames = erroredProcesses.map(p => p.name);
                
                // Check for unauthorized running services
                const unauthorizedRunning = runningNames.filter(name => !allowlist.includes(name));
                
                // Check for missing required services
                const missingRequired = allowlist.filter(name => !runningNames.includes(name));
                
                const results = {
                    timestamp: new Date().toISOString(),
                    allowlist: allowlist,
                    runningServices: runningNames,
                    stoppedServices: stoppedNames,
                    erroredServices: erroredNames,
                    unauthorizedRunning: unauthorizedRunning,
                    missingRequired: missingRequired,
                    driftDetected: unauthorizedRunning.length > 0 || missingRequired.length > 0,
                    status: unauthorizedRunning.length > 0 || missingRequired.length > 0 ? 'FAIL' : 'PASS'
                };
                
                // Write results to output file
                if (outputFile) {
                    const outputDir = require('path').dirname(outputFile);
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir, { recursive: true });
                    }
                    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
                }
                
                pm2.disconnect();
                resolve(results);
            } catch (error) {
                pm2.disconnect();
                reject(error);
            }
        });
    });
}

async function main() {
    const options = parseArgs();
    
    if (!options.allowlistFile) {
        console.error('Usage: node verify_pm2_unified_once.js --allowlist <allowlist.json> [--out <output.json>]');
        process.exit(1);
    }
    
    try {
        const allowlist = loadAllowlist(options.allowlistFile);
        const results = await verifyUnifiedState(allowlist, options.outputFile);
        
        console.log(JSON.stringify(results, null, 2));
        
        if (results.driftDetected) {
            console.error(`PM2_UNIFIED_VERIFICATION_FAILED: Drift detected - unauthorized: ${results.unauthorizedRunning.length}, missing: ${results.missingRequired.length}`);
            process.exit(1);
        } else {
            console.log(`PM2_UNIFIED_VERIFICATION_PASSED: No drift detected`);
            process.exit(0);
        }
    } catch (error) {
        console.error(`PM2_UNIFIED_VERIFICATION_ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Hard timeout: 10 seconds
const TIMEOUT_MS = 10000;
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
        reject(new Error('PM2 unified verification timeout after 10s'));
    }, TIMEOUT_MS);
});

Promise.race([main(), timeoutPromise])
    .catch((error) => {
        console.error(`PM2_UNIFIED_VERIFICATION_TIMEOUT: ${error.message}`);
        process.exit(1);
    });
