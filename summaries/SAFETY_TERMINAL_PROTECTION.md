# Terminal Blocking Protections

This project includes safety measures to prevent Cursor agent hangs during terminal operations.

## Configuration

### `.cursor-config.json`
- `autoReleaseTimeoutMs`: 30000 (30 seconds)
- `backgroundHangRescue`: true
- `parseCheck`: false (for silent terminal ops)
- `blockCommitOnError`: false

### Terminal Safety Features
- `autoBackgroundOnHang`: true
- `maxExecutionTimeMs`: 30000
- `safeMode`: true

## Usage

### Safe Run Script
Use `./scripts/safe-run.sh` for commands that might hang:

```bash
# Instead of: curl -s https://api.example.com
./scripts/safe-run.sh "curl -s https://api.example.com"

# Instead of: ps aux | grep node
./scripts/safe-run.sh "ps aux | grep node"
```

### Features
- **30-second timeout**: Automatically kills hanging commands
- **Background execution**: Commands run in background to prevent blocking
- **Process group management**: Ensures cleanup of child processes
- **Exit code preservation**: Returns the actual command exit code

## Best Practices

1. **Use safe-run.sh for network operations**: `curl`, `wget`, API calls
2. **Use safe-run.sh for long-running commands**: `ps aux`, `top`, monitoring
3. **Avoid blocking commands**: Use `&` or `nohup` for background tasks
4. **Set timeouts**: Always specify timeouts for external API calls

## Emergency Recovery

If a terminal operation hangs:
1. Wait 30 seconds for auto-release
2. Use `Ctrl+C` to interrupt
3. Check `./scripts/safe-run.sh` for timeout protection

## Configuration Files

- `.cursor-config.json`: Main safety configuration
- `scripts/safe-run.sh`: Async execution wrapper
- `.cursor/cursor.json`: Cursor-specific settings 