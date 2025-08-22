#!/usr/bin/env node

/**
 * PM2 Fence Unified Tool (Non-blocking)
 * Force-stops non-allowlist services and restarts missing allowlist services
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

function stopProcess(processName) {
    return new Promise((resolve, reject) => {
        pm2.stop(processName, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function restartProcess(processName) {
    return new Promise((resolve, reject) => {
        pm2.restart(processName, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function applyFence(allowlist, outputFile) {
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
                
                const runningNames = runningProcesses.map(p => p.name);
                const stoppedNames = stoppedProcesses.map(p => p.name);
                
                // Find unauthorized running services
                const unauthorizedRunning = runningNames.filter(name => !allowlist.includes(name));
                
                // Find missing required services
                const missingRequired = allowlist.filter(name => !runningNames.includes(name));
                
                const results = {
                    timestamp: new Date().toISOString(),
                    allowlist: allowlist,
                    beforeState: {
                        runningServices: runningNames,
                        stoppedServices: stoppedNames,
                        unauthorizedRunning: unauthorizedRunning,
                        missingRequired: missingRequired
                    },
                    actions: {
                        stopped: [],
                        restarted: [],
                        errors: []
                    },
                    afterState: {
                        runningServices: [],
                        stoppedServices: [],
                        unauthorizedRunning: [],
                        missingRequired: []
                    }
                };
                
                // Stop unauthorized services
                for (const serviceName of unauthorizedRunning) {
                    try {
                        await stopProcess(serviceName);
                        results.actions.stopped.push(serviceName);
                    } catch (error) {
                        results.actions.errors.push(`Failed to stop ${serviceName}: ${error.message}`);
                    }
                }
                
                // Restart missing required services
                for (const serviceName of missingRequired) {
                    try {
                        await restartProcess(serviceName);
                        results.actions.restarted.push(serviceName);
                    } catch (error) {
                        results.actions.errors.push(`Failed to restart ${serviceName}: ${error.message}`);
                    }
                }
                
                // Get final state
                const finalProcesses = await getCurrentProcesses();
                const finalRunning = finalProcesses.filter(p => p.pm2_env && p.pm2_env.status === 'online');
                const finalStopped = finalProcesses.filter(p => p.pm2_env && p.pm2_env.status === 'stopped');
                
                results.afterState.runningServices = finalRunning.map(p => p.name);
                results.afterState.stoppedServices = finalStopped.map(p => p.name);
                results.afterState.unauthorizedRunning = results.afterState.runningServices.filter(name => !allowlist.includes(name));
                results.afterState.missingRequired = allowlist.filter(name => !results.afterState.runningServices.includes(name));
                
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
        console.error('Usage: node pm2_fence_unified_once.js --allowlist <allowlist.json>');
        process.exit(1);
    }
    
    try {
        const allowlist = loadAllowlist(options.allowlistFile);
        const outputFile = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/pm2_fence_result.json';
        const results = await applyFence(allowlist, outputFile);
        
        console.log(JSON.stringify(results, null, 2));
        
        if (results.actions.errors.length > 0) {
            console.error(`PM2_FENCE_WARNINGS: ${results.actions.errors.length} errors during fence application`);
        }
        
        if (results.afterState.unauthorizedRunning.length > 0 || results.afterState.missingRequired.length > 0) {
            console.error(`PM2_FENCE_FAILED: Drift still detected after fence application`);
            process.exit(1);
        } else {
            console.log(`PM2_FENCE_SUCCESS: All unauthorized services stopped, all required services running`);
            process.exit(0);
        }
    } catch (error) {
        console.error(`PM2_FENCE_ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Hard timeout: 8 seconds
const TIMEOUT_MS = 8000;
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
        reject(new Error('PM2 fence timeout after 8s'));
    }, TIMEOUT_MS);
});

Promise.race([main(), timeoutPromise])
    .catch((error) => {
        console.error(`PM2_FENCE_TIMEOUT: ${error.message}`);
        process.exit(1);
    });
