#!/usr/bin/env node

/**
 * File Stat Tool (Non-blocking)
 * Checks file properties and validates size requirements
 */

const fs = require('fs');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--min-bytes':
                options.minBytes = parseInt(args[++i]);
                break;
        }
    }
    
    return options;
}

function getFileStats(filePath) {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(filePath)) {
                reject(new Error(`File not found: ${filePath}`));
                return;
            }
            
            const stats = fs.statSync(filePath);
            resolve({
                file: filePath,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                exists: true
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function main() {
    const args = process.argv.slice(2);
    const filePath = args[0];
    const options = parseArgs();
    
    if (!filePath) {
        console.error('Usage: node stat_file_once.js <file> [--min-bytes <size>]');
        process.exit(1);
    }
    
    try {
        const stats = await getFileStats(filePath);
        
        console.log(JSON.stringify(stats, null, 2));
        
        if (options.minBytes && stats.size < options.minBytes) {
            console.error(`STAT_FILE_FAIL: File size ${stats.size} is less than minimum ${options.minBytes} bytes`);
            process.exit(1);
        }
        
        console.log(`STAT_FILE_PASS: File exists with size ${stats.size} bytes`);
        process.exit(0);
    } catch (error) {
        console.error(`STAT_FILE_ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Hard timeout: 5 seconds
const TIMEOUT_MS = 5000;
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
        reject(new Error('File stat timeout after 5s'));
    }, TIMEOUT_MS);
});

Promise.race([main(), timeoutPromise])
    .catch((error) => {
        console.error(`STAT_FILE_TIMEOUT: ${error.message}`);
        process.exit(1);
    });
