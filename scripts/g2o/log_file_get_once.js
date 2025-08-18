#!/usr/bin/env node

const fs = require('fs');

function getLogFile(pidFilePath, component) {
    try {
        if (!fs.existsSync(pidFilePath)) {
            console.log("");
            process.exit(0);
        }
        
        const pids = JSON.parse(fs.readFileSync(pidFilePath, 'utf8'));
        const logFile = pids[component]?.log_file || '';
        console.log(logFile);
        
        process.exit(0);
    } catch (error) {
        console.error(`LOG_FILE_GET_ERROR:${error.message}`);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Usage: node log_file_get_once.js <pidFilePath> <component>');
    process.exit(1);
}

getLogFile(args[0], args[1]);
