#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function quoteSafeEditOnce(filePath, ensureLines = []) {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Read existing content or create empty
        let content = '';
        if (fs.existsSync(filePath)) {
            content = fs.readFileSync(filePath, 'utf8');
        }
        
        const lines = content.split('\n');
        let modified = false;
        
        // Ensure each required line exists
        for (const ensureLine of ensureLines) {
            if (!lines.includes(ensureLine)) {
                lines.push(ensureLine);
                modified = true;
            }
        }
        
        // Write back if modified
        if (modified) {
            fs.writeFileSync(filePath, lines.join('\n'));
            console.log(`FILE_MODIFIED:${filePath}`);
        } else {
            console.log(`FILE_UNCHANGED:${filePath}`);
        }
        
        process.exit(0);
    } catch (error) {
        console.error(`EDIT_ERROR:${filePath}:${error.message}`);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error('Usage: node quote_safe_edit_once.js --file <filepath> --ensure-lines <line1> <line2> ...');
    process.exit(1);
}

let filePath = '';
let ensureLines = [];

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && i + 1 < args.length) {
        filePath = args[i + 1];
        i++;
    } else if (args[i] === '--ensure-lines') {
        ensureLines = args.slice(i + 1);
        break;
    }
}

if (!filePath || ensureLines.length === 0) {
    console.error('Usage: node quote_safe_edit_once.js --file <filepath> --ensure-lines <line1> <line2> ...');
    process.exit(1);
}

quoteSafeEditOnce(filePath, ensureLines);
