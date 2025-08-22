#!/usr/bin/env node

/**
 * Repository Search Tool (Non-blocking)
 * Scans text files for regex patterns in specified directories
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--root':
                options.root = args[++i];
                break;
            case '--include':
                options.include = args[++i];
                break;
            case '--query':
                options.query = args[++i];
                break;
            case '--out':
                options.out = args[++i];
                break;
        }
    }
    
    return options;
}

function searchFiles(root, includePattern, query) {
    try {
        // Use find to get files matching include pattern
        const findCmd = `find "${root}" -type f -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.md" | grep -E "${includePattern}"`;
        const files = execSync(findCmd, { encoding: 'utf8', timeout: 10000 }).trim().split('\n').filter(f => f);
        
        const results = [];
        
        for (const file of files) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                if (new RegExp(query).test(content)) {
                    results.push({
                        file: path.relative(root, file),
                        matches: content.match(new RegExp(query, 'g')) || []
                    });
                }
            } catch (err) {
                // Skip files that can't be read
                continue;
            }
        }
        
        return results;
    } catch (err) {
        console.error('Search error:', err.message);
        return [];
    }
}

function main() {
    const options = parseArgs();
    
    if (!options.root || !options.include || !options.query || !options.out) {
        console.error('Usage: node repo_search_once.js --root <repo> --include <pattern> --query <regex> --out <json>');
        process.exit(1);
    }
    
    try {
        const results = searchFiles(options.root, options.include, options.query);
        
        const output = {
            timestamp: new Date().toISOString(),
            root: options.root,
            include: options.include,
            query: options.query,
            results: results,
            totalFiles: results.length
        };
        
        fs.writeFileSync(options.out, JSON.stringify(output, null, 2));
        console.log(`REPO_SEARCH_COMPLETE:${options.out}`);
        
    } catch (err) {
        console.error('Fatal error:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
