#!/usr/bin/env node

/**
 * PM2 Prune List Tool (Non-blocking)
 * Programmatically deletes PM2 services by name list
 */

const fs = require('fs');
const pm2 = require('pm2');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--names-json':
                options.namesJson = args[++i];
                break;
        }
    }
    
    return options;
}

function loadNamesList(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        // Handle different possible structures
        if (Array.isArray(data)) {
            return data;
        } else if (data.results && Array.isArray(data.results)) {
            return data.results.map(r => r.file).filter(f => f);
        } else if (data.names && Array.isArray(data.names)) {
            return data.names;
        }
        
        return [];
    } catch (err) {
        console.error('Error loading names list:', err.message);
        return [];
    }
}

function pruneServices(names) {
    return new Promise((resolve, reject) => {
        pm2.connect((err) => {
            if (err) {
                reject(err);
                return;
            }
            
            const results = {
                timestamp: new Date().toISOString(),
                attempted: names,
                deleted: [],
                errors: []
            };
            
            let completed = 0;
            
            if (names.length === 0) {
                pm2.disconnect();
                resolve(results);
                return;
            }
            
            names.forEach(name => {
                pm2.delete(name, (err) => {
                    if (err) {
                        results.errors.push({ name, error: err.message });
                    } else {
                        results.deleted.push(name);
                    }
                    
                    completed++;
                    if (completed === names.length) {
                        pm2.disconnect();
                        resolve(results);
                    }
                });
            });
        });
    });
}

async function main() {
    const options = parseArgs();
    
    if (!options.namesJson) {
        console.error('Usage: node pm2_prune_list_once.js --names-json <file>');
        process.exit(1);
    }
    
    try {
        const names = loadNamesList(options.namesJson);
        console.log(`PM2_PRUNE_ATTEMPT:${names.length} services`);
        
        const results = await pruneServices(names);
        
        // Write results to stdout for logging
        console.log(JSON.stringify(results, null, 2));
        console.log(`PM2_PRUNE_COMPLETE:${results.deleted.length} deleted, ${results.errors.length} errors`);
        
        process.exit(results.errors.length > 0 ? 1 : 0);
        
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
