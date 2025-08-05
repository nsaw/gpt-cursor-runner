#!/usr/bin/env python3
"""
Expo Process Detection and Conflict Guard
"""

import subprocess
import os
from datetime import datetime

def detect_expo_processes():
    """Detect running Expo processes and block if found."""
    try:
        # Run ps command to find expo processes
        result = subprocess.run(
            ["ps", "aux"], 
            capture_output=True, 
            text=True, 
            timeout=10
        )
        
        if result.returncode == 0:
            lines = result.stdout.split('\n')
            expo_processes = []
            
            for line in lines:
                if 'expo' in line.lower() and 'grep' not in line:
                    expo_processes.append(line.strip())
            
            if expo_processes:
                timestamp = datetime.now().isoformat()
                message = f"⚠️ [{timestamp}] Expo processes detected!\n"
                message += "\n".join(expo_processes) + "\n"
                
                # Write to log file
                log_file = 'logs/expo-detect.log'
                os.makedirs(os.path.dirname(log_file), exist_ok=True)
                with open(log_file, 'a') as f:
                    f.write(message)
                
                # Print warnings
                print('\033[33m⚠️ WARNING: Expo is running. This may break Cursor orchestration.\033[0m')
                print('\033[31m🛑 BLOCKING: Expo detected in active workspace. Please terminate `expo start` and retry.\033[0m')
                
                # Exit with error code
                os._exit(130)
                
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, Exception) as e:
        # Silently continue if detection fails
        pass

if __name__ == "__main__":
    detect_expo_processes() 