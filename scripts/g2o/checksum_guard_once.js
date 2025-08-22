#!/usr/bin/env node

/**
 * Checksum Guard Tool (Non-blocking)
 * Validates file integrity against stored checksums in lock file
 */

const fs = require('fs');
const crypto = require('crypto');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--lock':
                options.lockFile = args[++i];
                break;
        }
    }
    
    return options;
}

function loadLockFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        throw new Error(`Failed to load lock file: ${err.message}`);
    }
}

function loadChecksumFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        throw new Error(`Failed to load checksum file: ${err.message}`);
    }
}

function computeFileChecksum(filePath, algorithm) {
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
                resolve(hash.digest('hex'));
            });
            
            stream.on('error', (err) => {
                reject(err);
            });
        } catch (err) {
            reject(err);
        }
    });
}

async function validateChecksums(lockData) {
    const results = {
        timestamp: new Date().toISOString(),
        validations: [],
        allMatch: true,
        errors: []
    };
    
    try {
        // Validate allowlist file
        const allowlistChecksumData = loadChecksumFile(lockData.sha256.allowlist_file);
        const currentAllowlistChecksum = await computeFileChecksum(lockData.allowlist, allowlistChecksumData.algorithm);
        
        const allowlistMatch = currentAllowlistChecksum === allowlistChecksumData.checksum;
        results.validations.push({
            file: lockData.allowlist,
            expected: allowlistChecksumData.checksum,
            actual: currentAllowlistChecksum,
            match: allowlistMatch
        });
        
        if (!allowlistMatch) {
            results.allMatch = false;
            results.errors.push(`Allowlist checksum mismatch: expected ${allowlistChecksumData.checksum}, got ${currentAllowlistChecksum}`);
        }
        
        // Validate ecosystem file
        const ecosystemChecksumData = loadChecksumFile(lockData.sha256.ecosystem_file);
        const currentEcosystemChecksum = await computeFileChecksum(lockData.ecosystem, ecosystemChecksumData.algorithm);
        
        const ecosystemMatch = currentEcosystemChecksum === ecosystemChecksumData.checksum;
        results.validations.push({
            file: lockData.ecosystem,
            expected: ecosystemChecksumData.checksum,
            actual: currentEcosystemChecksum,
            match: ecosystemMatch
        });
        
        if (!ecosystemMatch) {
            results.allMatch = false;
            results.errors.push(`Ecosystem checksum mismatch: expected ${ecosystemChecksumData.checksum}, got ${currentEcosystemChecksum}`);
        }
        
    } catch (error) {
        results.allMatch = false;
        results.errors.push(`Validation error: ${error.message}`);
    }
    
    return results;
}

async function main() {
    const options = parseArgs();
    
    if (!options.lockFile) {
        console.error('Usage: node checksum_guard_once.js --lock <lock.json>');
        process.exit(1);
    }
    
    try {
        const lockData = loadLockFile(options.lockFile);
        const results = await validateChecksums(lockData);
        
        // Write results to triage directory
        const outputFile = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_triage/checksum_guard_result.json';
        const outputDir = require('path').dirname(outputFile);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
        
        if (results.allMatch) {
            console.log(`CHECKSUM_GUARD_PASS: All files match expected checksums`);
            process.exit(0);
        } else {
            console.error(`CHECKSUM_GUARD_FAIL: ${results.errors.join('; ')}`);
            process.exit(1);
        }
    } catch (error) {
        console.error(`CHECKSUM_GUARD_ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Hard timeout: 15 seconds
const TIMEOUT_MS = 15000;
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
        reject(new Error('Checksum guard timeout after 15s'));
    }, TIMEOUT_MS);
});

Promise.race([main(), timeoutPromise])
    .catch((error) => {
        console.error(`CHECKSUM_GUARD_TIMEOUT: ${error.message}`);
        process.exit(1);
    });
