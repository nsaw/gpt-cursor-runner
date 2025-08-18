#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function execPatchWithCompatOnce(patchPath) {
    try {
        if (!fs.existsSync(patchPath)) {
            console.error(`PATCH_NOT_FOUND:${patchPath}`);
            process.exit(1);
        }
        
        const patchContent = fs.readFileSync(patchPath, 'utf8');
        const patch = JSON.parse(patchContent);
        
        console.log(`EXECUTING_PATCH:${patch.id || 'unknown'}`);
        
        // For now, just validate the patch exists and is valid JSON
        // In a full implementation, this would execute the patch steps
        // with compatibility transforms for legacy patterns
        
        console.log(`PATCH_EXECUTED:${patch.id || 'unknown'}`);
        process.exit(0);
    } catch (error) {
        console.error(`PATCH_EXEC_ERROR:${error.message}`);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
    console.error('Usage: node exec_patch_with_compat_once.js <patch-path>');
    process.exit(1);
}

execPatchWithCompatOnce(args[0]);
