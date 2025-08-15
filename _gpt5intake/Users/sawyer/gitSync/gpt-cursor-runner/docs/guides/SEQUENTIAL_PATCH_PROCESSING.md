# Sequential Patch Processing

## Overview

Both BRAUN and CYOPS daemons now implement **sequential patch processing** that processes all JSON patches in order until encountering a `.json.stop` file, rather than stopping at the presence of a `.stop` file in the folder.

## Key Changes

### 🔄 **Sequential Processing Logic**

**Before:**

- Daemon would stop processing when any `.stop` file was present in the patches directory
- Processing was interrupted by folder-level stop signals

**After:**

- Daemon processes patches sequentially in alphabetical order
- Only stops when encountering a specific `.json.stop` file
- Continues processing until reaching the `.json.stop` file
- `.stop` file still exists for emergency daemon shutdown

### 📁 **File Structure**

```
patches/
├── .done/          # Successfully processed patches
├── .fail/          # Failed patches
├── .skip/          # Skipped patches
├── .tests/         # Test patches (excluded from processing)
├── patch-1.json    # Will be processed first
├── patch-2.json    # Will be processed second
├── patch-3.json    # Will be processed third
├── .json.stop      # Processing stops here (NEW)
└── patch-4.json    # Will NOT be processed (after .json.stop)
```

### 🛑 **Stop File Types**

1. **`.stop`** - Emergency daemon shutdown (existing functionality)
2. **`.json.stop`** - Sequential processing pause (NEW)

## Implementation Details

### **BRAUN Daemon** (`braun_daemon.py`)

```python
def check_json_stop_file(self) -> bool:
    """Check if there's a .json.stop file in the patches directory."""
    json_stop_file = os.path.join(self.patches_dir, ".json.stop")
    return os.path.exists(json_stop_file)

def get_pending_patches(self) -> List[str]:
    """Get list of pending patch files."""
    # Get all JSON files in patches directory (excluding .json.stop files)
    patch_files = glob.glob(os.path.join(self.patches_dir, "*.json"))

    # Remove .json.stop files from patch list
    patch_files = [f for f in patch_files if not f.endswith('.json.stop')]

    # Filter and sort patches
    return sorted(pending_patches)
```

### **CYOPS Daemon** (`cyops_daemon.py`)

Identical implementation for DEV/CYOPS environment with the same sequential processing logic.

## Processing Flow

### **1. Initial Check**

```python
# Check for .json.stop file before starting
if self.check_json_stop_file():
    print("🛑 Found .json.stop file - pausing processing")
    time.sleep(self.check_interval)
    continue
```

### **2. Sequential Processing**

```python
for patch_file in pending_patches:
    # Check for .json.stop file before each patch
    if self.check_json_stop_file():
        print("🛑 Found .json.stop file - stopping sequential processing")
        break

    # Process the patch
    if self.process_patch(patch_file):
        processed_count += 1
    else:
        failed_count += 1
```

### **3. File Movement**

- **Success**: Move to `.done/` directory
- **Failure**: Move to `.fail/` directory
- **Skip**: Move to `.skip/` directory
- **Tests**: Move to `.tests/` directory

## Usage Examples

### **Starting Sequential Processing**

1. **Place patches in order:**

   ```bash
   # Patches will be processed in this order
   touch patches/patch-1.json
   touch patches/patch-2.json
   touch patches/patch-3.json
   ```

2. **Start BRAUN daemon:**

   ```bash
   python3 braun_daemon.py
   ```

3. **Monitor processing:**
   ```bash
   tail -f logs/braun-daemon.log
   ```

### **Pausing Sequential Processing**

1. **Create .json.stop file:**

   ```bash
   touch patches/.json.stop
   ```

2. **Processing will pause:**

   ```
   🛑 Found .json.stop file - pausing processing
   ```

3. **Remove .json.stop to resume:**
   ```bash
   rm patches/.json.stop
   ```

### **Emergency Stop**

1. **Create .stop file for emergency shutdown:**

   ```bash
   touch patches/.stop
   ```

2. **Daemon will stop completely:**
   ```
   🛑 BRAUN Daemon stopped
   ```

## Watchdog Scripts

### **BRAUN Watchdog** (`scripts/watchdog-braun.sh`)

```bash
# Start monitoring
./scripts/watchdog-braun.sh monitor

# Check status
./scripts/watchdog-braun.sh status

# View logs
./scripts/watchdog-braun.sh logs
```

### **CYOPS Watchdog** (`scripts/watchdog-cyops.sh`)

```bash
# Start monitoring
./scripts/watchdog-cyops.sh monitor

# Check status
./scripts/watchdog-cyops.sh status

# View logs
./scripts/watchdog-cyops.sh logs
```

## Configuration

### **Environment Variables**

```bash
export PATCHES_DIRECTORY="/path/to/patches"
```

### **Command Line Options**

```bash
# BRAUN daemon
python3 braun_daemon.py --patches-dir /custom/path --interval 60

# CYOPS daemon
python3 cyops_daemon.py --patches-dir /custom/path --interval 60
```

## Monitoring and Logging

### **Log Files**

- **BRAUN**: `logs/braun-daemon.log`
- **CYOPS**: `logs/cyops-daemon.log`
- **Watchdog**: `logs/braun-watchdog.log`, `logs/cyops-watchdog.log`

### **Move Logs**

Each directory (`.done`, `.fail`, `.skip`, `.tests`) contains a `move_log.json` file tracking all file movements.

### **Real-time Monitoring**

```bash
# Watch BRAUN logs
tail -f logs/braun-daemon.log

# Watch CYOPS logs
tail -f logs/cyops-daemon.log

# Watch watchdog logs
tail -f logs/braun-watchdog.log
```

## Benefits

### ✅ **Sequential Control**

- Process patches in specific order
- Stop at exact point with `.json.stop`
- Resume from where you left off

### ✅ **Granular Control**

- `.json.stop` for processing pause
- `.stop` for emergency shutdown
- Different levels of control

### ✅ **Reliability**

- Automatic restart via watchdog
- Comprehensive logging
- Error handling and recovery

### ✅ **Flexibility**

- Easy to pause/resume processing
- Clear separation of concerns
- Environment-specific daemons

## Troubleshooting

### **Common Issues**

1. **Daemon not processing patches:**

   ```bash
   # Check if .json.stop exists
   ls -la patches/.json.stop

   # Remove if unwanted
   rm patches/.json.stop
   ```

2. **Daemon not starting:**

   ```bash
   # Check logs
   tail -20 logs/braun-daemon.log

   # Check watchdog
   ./scripts/watchdog-braun.sh status
   ```

3. **Patches not moving:**

   ```bash
   # Check directory permissions
   ls -la patches/.done/

   # Check move logs
   cat patches/.done/move_log.json
   ```

### **Debug Commands**

```bash
# Check daemon status
ps aux | grep "braun_daemon"

# Check patch files
ls -la patches/*.json

# Check stop files
ls -la patches/.stop patches/.json.stop

# View recent activity
tail -50 logs/braun-daemon.log
```

## Migration Guide

### **From Old System**

1. **Stop old daemon:**

   ```bash
   pkill -f "python.*braun_daemon"
   ```

2. **Start new daemon:**

   ```bash
   python3 braun_daemon.py > logs/braun-daemon.log 2>&1 &
   ```

3. **Start watchdog:**
   ```bash
   ./scripts/watchdog-braun.sh monitor > logs/braun-watchdog.log 2>&1 &
   ```

### **Verify Migration**

```bash
# Check daemon is running
ps aux | grep "braun_daemon"

# Check logs
tail -10 logs/braun-daemon.log

# Test sequential processing
touch patches/test-patch.json
touch patches/.json.stop
```

## Conclusion

The new sequential processing system provides:

- **Better control** over patch processing order
- **Granular pause/resume** functionality
- **Environment separation** between BRAUN and CYOPS
- **Improved reliability** with watchdog monitoring
- **Comprehensive logging** for debugging and auditing

Both BRAUN and CYOPS daemons now process patches sequentially until encountering a `.json.stop` file, providing the exact control you requested.
