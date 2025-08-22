#!/usr/bin/env node

/**
 * PM2 Unified Verification Tool (CI Guard)
 * Loads pm2 snapshot + ecosystem.unified.json; asserts only allowlist services are RUNNING
 */

const fs = require('fs');
const pm2 = require('pm2');

function loadEcosystem(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        throw new Error(`Failed to load ecosystem file: ${err.message}`);
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

function verifyUnifiedState(ecosystem, currentProcesses) {
    const targetApps = ecosystem.apps || [];
    const targetNames = targetApps.map(app => app.name);
    
    const runningProcesses = currentProcesses.filter(p => 
        p.pm2_env && p.pm2_env.status === 'online'
    );
    
    const runningNames = runningProcesses.map(p => p.name);
    
    // Check for unauthorized running services
    const unauthorizedRunning = runningNames.filter(name => !targetNames.includes(name));
    
    // Check for missing required services
    const missingRequired = targetNames.filter(name => !runningNames.includes(name));
    
    const results = {
        timestamp: new Date().toISOString(),
        targetServices: targetNames,
        runningServices: runningNames,
        unauthorizedRunning: unauthorizedRunning,
        missingRequired: missingRequired,
        driftDetected: unauthorizedRunning.length > 0 || missingRequired.length > 0,
        status: unauthorizedRunning.length > 0 || missingRequired.length > 0 ? 'FAIL' : 'PASS'
    };
    
    return results;
}

async function main() {
    try {
        const ecosystemPath = '/Users/sawyer/gitSync/gpt-cursor-runner/config/pm2/ecosystem.unified.json';
        const ecosystem = loadEcosystem(ecosystemPath);
        
        const currentProcesses = await new Promise((resolve, reject) => {
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
        
        const results = verifyUnifiedState(ecosystem, currentProcesses);
        
        // Write results to stdout for logging
        console.log(JSON.stringify(results, null, 2));
        
        if (results.driftDetected) {
            console.error('PM2_UNIFIED_VERIFICATION_FAILED: Drift detected');
            process.exit(1);
        } else {
            console.log('PM2_UNIFIED_VERIFICATION_PASSED: No drift detected');
            process.exit(0);
        }
        
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
