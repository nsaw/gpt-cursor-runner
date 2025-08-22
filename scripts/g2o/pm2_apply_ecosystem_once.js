#!/usr/bin/env node

/**
 * PM2 Apply Ecosystem Tool (Non-blocking)
 * Ensures listed processes are online and others are left stopped
 */

const fs = require('fs');
const pm2 = require('pm2');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--file':
                options.file = args[++i];
                break;
        }
    }
    
    return options;
}

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

function startProcess(app) {
    return new Promise((resolve, reject) => {
        pm2.start(app, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

function stopProcess(name) {
    return new Promise((resolve, reject) => {
        pm2.stop(name, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function applyEcosystem(ecosystem) {
    return new Promise((resolve, reject) => {
        pm2.connect(async (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            try {
                const currentProcesses = await getCurrentProcesses();
                const targetApps = ecosystem.apps || [];
                const bootOrder = ecosystem.bootOrder || [];
                
                const results = {
                    timestamp: new Date().toISOString(),
                    targetApps: targetApps.map(app => app.name),
                    bootOrder: bootOrder,
                    started: [],
                    stopped: [],
                    errors: []
                };
                
                // Get current running processes
                const runningNames = currentProcesses
                    .filter(p => p.pm2_env && p.pm2_env.status === 'online')
                    .map(p => p.name);
                
                // Stop processes not in target list
                const toStop = runningNames.filter(name => !targetApps.find(app => app.name === name));
                
                for (const name of toStop) {
                    try {
                        await stopProcess(name);
                        results.stopped.push(name);
                    } catch (err) {
                        results.errors.push({ action: 'stop', name, error: err.message });
                    }
                }
                
                // Start processes in boot order
                for (const name of bootOrder) {
                    const app = targetApps.find(a => a.name === name);
                    if (app) {
                        try {
                            await startProcess(app);
                            results.started.push(name);
                        } catch (err) {
                            results.errors.push({ action: 'start', name, error: err.message });
                        }
                    }
                }
                
                pm2.disconnect();
                resolve(results);
                
            } catch (err) {
                pm2.disconnect();
                reject(err);
            }
        });
    });
}

async function main() {
    const options = parseArgs();
    
    if (!options.file) {
        console.error('Usage: node pm2_apply_ecosystem_once.js --file <ecosystem.json>');
        process.exit(1);
    }
    
    try {
        const ecosystem = loadEcosystem(options.file);
        console.log(`PM2_ECOSYSTEM_APPLY:${ecosystem.apps?.length || 0} apps`);
        
        const results = await applyEcosystem(ecosystem);
        
        // Write results to stdout for logging
        console.log(JSON.stringify(results, null, 2));
        console.log(`PM2_ECOSYSTEM_COMPLETE:${results.started.length} started, ${results.stopped.length} stopped, ${results.errors.length} errors`);
        
        process.exit(results.errors.length > 0 ? 1 : 0);
        
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
