#!/usr/bin/env node

const fs = require('fs');

function updatePidFile(pidFilePath, name, pid, command, logFile) {
    try {
        let pids = {};
        
        // Read existing PID file if it exists
        if (fs.existsSync(pidFilePath)) {
            const content = fs.readFileSync(pidFilePath, 'utf8');
            pids = JSON.parse(content);
        }
        
        // Update with new process info
        pids[name] = {
            pid: parseInt(pid),
            command: command,
            log_file: logFile,
            started: new Date().toISOString()
        };
        
        // Write back to file
        fs.writeFileSync(pidFilePath, JSON.stringify(pids, null, 2));
        
        console.log(`PID_FILE_UPDATED:${pidFilePath}:${name}:${pid}`);
        process.exit(0);
    } catch (error) {
        console.error(`PID_FILE_UPDATE_ERROR:${error.message}`);
        process.exit(1);
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 5) {
    console.error('Usage: node pid_file_update_once.js <pidFilePath> <name> <pid> <command> <logFile>');
    process.exit(1);
}

updatePidFile(args[0], args[1], args[2], args[3], args[4]);
