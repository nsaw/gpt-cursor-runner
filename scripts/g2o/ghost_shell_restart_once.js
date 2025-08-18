#!/usr/bin/env node

const { exec } = require('child_process');

function restartGhostShell() {
    try {
        console.log('[Restart] Initiating ghost shell restart...');
        
        // Kill existing ghost shell processes
        exec('pkill -f "ghost.*shell"', (error) => {
            if (error) {
                console.log('[Restart] No existing ghost shell processes found');
            } else {
                console.log('[Restart] Killed existing ghost shell processes');
            }

            // Wait a moment then restart
            setTimeout(() => {
                console.log('[Restart] Starting new ghost shell...');
                exec('node /Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell/index.ts', (error, stdout, stderr) => {
                    if (error) {
                        console.error('[Restart] Failed to restart ghost shell:', error);
                        return;
                    }
                    console.log('[Restart] Ghost shell restarted successfully');
                });
            }, 2000);
        });
        
        console.log('GHOST_SHELL_RESTART_INITIATED');
        process.exit(0);
    } catch (error) {
        console.error(`GHOST_SHELL_RESTART_ERROR:${error.message}`);
        process.exit(1);
    }
}

restartGhostShell();
