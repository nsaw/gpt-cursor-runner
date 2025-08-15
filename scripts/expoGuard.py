# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Expo Process Detection and Conflict Guard

This script detects running Expo processes and blocks execution if found
to prevent conflicts with Cursor orchestration.
"""

import subprocess
import sys
from datetime import datetime
from pathlib import Path


def detect_expo_processes() -> None:
    """Detect running Expo processes and block if found."""
    try:
        # Run ps command to find expo processes
        result = subprocess.run(
            ["ps", "aux"], capture_output=True, text=True, timeout=10
        )

        if result.returncode == 0:
            lines = result.stdout.split("\n")
            expo_processes = []

            for line in lines:
                if "expo" in line.lower() and "grep" not in line:
                    expo_processes.append(line.strip())

            if expo_processes:
                timestamp = datetime.now().isoformat()
                message = f"⚠️ [{timestamp}] Expo processes detected!\n"
                message += "\n".join(expo_processes) + "\n"

                # Write to log file
                log_file = Path("logs/expo-detect.log")
                log_file.parent.mkdir(exist_ok=True)
                with open(log_file, "a", encoding="utf-8") as f:
                    f.write(message)

                # Print warnings
                print(
                    "\033[33m⚠️ WARNING: Expo is running. This may break Cursor orchestration.\033[0m"
                )
                print(
                    "\033[31m🛑 BLOCKING: Expo detected in active workspace. "
                    "Please terminate `expo start` and retry.\033[0m"
                )

                # Exit with error code
                sys.exit(130)

    except (subprocess.TimeoutExpired, subprocess.SubprocessError, Exception) as e:
        # Silently continue if detection fails
        print(f"Expo detection failed: {e}")


if __name__ == "__main__":
    detect_expo_processes()
