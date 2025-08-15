# Slack Manifest Slash Command Changes

## Summary

Consolidated and upgraded Slack slash commands for GPT-Cursor runner control, reducing redundancy and adding new functionality while staying under the 25 command limit.

## Removed Commands (Archived)

- `/status` → `/status-runner` (renamed)
- `/kill-runner` → `/kill` (renamed)
- `/restart-runner` → merged into `/again`
- `/restart-runner-gpt` → merged into `/again`
- `/continue-runner` → merged into `/proceed`
- `/approve-screenshot` → merged into `/proceed`
- `/retry-last-failed` → merged into `/again`

## New Commands Added

- `/proceed` - Consolidated action handler (approve, continue, resume)
- `/again` - Consolidated retry/restart handler
- `/manual-revise` - Manual patch revision with custom instructions
- `/manual-append` - Manual content append to patches
- `/interrupt` - Interrupt current operations (pause, stop, force)
- `/troubleshoot` - Automated troubleshooting and diagnostics
- `/troubleshoot-oversight` - Manual oversight of automated troubleshooting
- `/send-with` - Request AI to resend with additional context

## Renamed Commands

- `/status` → `/status-runner`
- `/kill-runner` → `/kill`

## Command Count

- **Before**: 25 commands
- **After**: 25 commands
- **Status**: ✅ Within Slack limit

## Functionality Improvements

### Consolidated Commands

- **`/proceed`**: Handles approve-screenshot, continue-runner, and resume-runner functionality
- **`/again`**: Handles retry-last-failed and restart-runner functionality

### Manual Override Commands

- **`/manual-revise`**: Allows manual revision of GPT patches with custom instructions
- **`/manual-append`**: Allows manual addition of content to patches
- **`/interrupt`**: Provides immediate interruption capabilities

### Automated Troubleshooting

- **`/troubleshoot`**: Automated diagnostics and fixes
- **`/troubleshoot-oversight`**: Manual oversight after automated troubleshooting

### AI Workflow Enhancement

- **`/send-with`**: Prompts GPT or Cursor to resend with logs, context, console

## Usage Examples

### Consolidated Commands

```
/proceed          # Auto-detect: approve screenshot, continue runner, or approve patch
/proceed screenshot  # Explicitly approve screenshot
/proceed continue    # Explicitly continue runner
/again             # Auto-detect: retry failed or restart runner
/again retry       # Explicitly retry failed operation
/again restart     # Explicitly restart runner
```

### Manual Override Commands

```
/manual-revise "Fix the button styling to use primary colors"
/manual-append "Add error handling for edge cases"
/interrupt        # Graceful interruption
/interrupt pause  # Pause operations
/interrupt force  # Force stop all operations
```

### Troubleshooting Commands

```
/troubleshoot     # Auto-fix mode
/troubleshoot fix # Explicit auto-fix
/troubleshoot-oversight approve  # Approve automated fixes
/troubleshoot-oversight reject   # Reject and rollback fixes
```

### AI Enhancement Commands

```
/send-with logs    # Request AI to resend with logs
/send-with context # Request AI to resend with context
/send-with console # Request AI to resend with console output
/send-with all     # Request AI to resend with all context
```

## Security Considerations

- All dynamic command inputs are validated for passthrough security
- Manual override commands require minimum character limits
- Troubleshooting commands include oversight mechanisms
- Archived handlers preserved in `server/commands/archived/`

## Migration Notes

- Old command handlers moved to `server/commands/archived/`
- New consolidated handlers provide backward compatibility
- Usage hints updated for Slack-friendly format
- All commands pass linting and manifest character limits
