features to prevent zombie processes and force-kill stuck jobs:
Safety Features Added
Process Tracking & Cleanup:
Creates PID files in /tmp/op*vault_sync*\*.pid for each run
Automatically kills any sync processes older than 10 minutes
Cleanup function removes PID files on exit/interrupt/termination
Timeout & Force-Kill:
5-minute timeout (300s) on both export and import operations
If timeout occurs, force-kills remaining op and vault processes
Uses pkill -f to target specific command patterns
Launchd Safety:
ThrottleInterval: 300 - prevents multiple instances within 5 minutes
AbandonProcessGroup: true - ensures child processes are properly managed
ProcessType: Background - runs as background process
KeepAlive: false - doesn't restart on failure (prevents loops)
Logging:
All safety actions logged to op_vault_sync_safety.log
Timestamps and PIDs tracked for debugging
Separate logs for launchd stdout/stderr
How It Works
Before each run: Scans for stale PID files and kills old processes
During run: Creates PID file, sets cleanup trap
Timeout protection: 5-minute limit per operation with force-kill fallback
Cleanup: Removes PID file, kills any remaining child processes
Launchd protection: Prevents overlapping runs, manages process groups
The system is now bulletproof against:
Zombie processes
Stuck operations
Multiple overlapping runs
Orphaned child processes
Memory leaks from hanging operations
Your hourly sync will run safely without any risk of getting clogged up
