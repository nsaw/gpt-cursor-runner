#!/usr/bin/env node

/**
 * Checksum File Tool (Non-blocking)
 * Computes checksums of files using specified algorithm
 */

const fs = require('fs');
const crypto = require('crypto');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--in':
                options.inputFile = args[++i];
                break;
            case '--algo':
                options.algorithm = args[++i];
                break;
            case '--out':
                options.outputFile = args[++i];
                break;
        }
    }
    
    return options;
}

function computeChecksum(filePath, algorithm) {
    return new Promise((resolve, reject) => {
        try {
            if (!fs.existsSync(filePath)) {
                reject(new Error(`File not found: ${filePath}`));
                return;
            }
            
            const hash = crypto.createHash(algorithm);
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (data) => {
                hash.update(data);
            });
            
            stream.on('end', () => {
                const checksum = hash.digest('hex');
                resolve({
                    file: filePath,
                    algorithm: algorithm,
                    checksum: checksum,
                    timestamp: new Date().toISOString()
                });
            });
            
            stream.on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function main() {
    const options = parseArgs();
    
    if (!options.inputFile || !options.algorithm || !options.outputFile) {
        console.error('Usage: node checksum_file_once.js --in <file> --algo <algorithm> --out <output.json>');
        process.exit(1);
    }
    
    try {
        const result = await computeChecksum(options.inputFile, options.algorithm);
        
        // Ensure output directory exists
        const outputDir = require('path').dirname(options.outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write result to output file
        fs.writeFileSync(options.outputFile, JSON.stringify(result, null, 2));
        console.log(`CHECKSUM_WRITTEN:${options.outputFile} (${result.algorithm}:${result.checksum})`);
        process.exit(0);
    } catch (error) {
        console.error(`CHECKSUM_ERROR:${error.message}`);
        process.exit(1);
    }
}

// Hard timeout: 10 seconds
const TIMEOUT_MS = 10000;
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
        reject(new Error('Checksum computation timeout after 10s'));
    }, TIMEOUT_MS);
});

Promise.race([main(), timeoutPromise])
    .catch((error) => {
        console.error(`CHECKSUM_TIMEOUT:${error.message}`);
        process.exit(1);
    });
