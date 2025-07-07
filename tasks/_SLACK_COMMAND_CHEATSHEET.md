# 📌 GPT-Cursor Runner Slack Command Cheat Sheet

## Available Slash Commands
- `/dashboard`
- `/patch-approve`
- `/patch-revert`
- `/pause-runner`
- `/restart-runner`
- `/restart-runner-gpt`
- `/continue-runner`
- `/status`
- `/show-roadmap`
- `/roadmap`
- `/kill-runner`
- `/toggle-runner-on`
- `/toggle-runner-off`
- `/toggle-runner-auto`
- `/theme`
- `/theme-status`
- `/theme-fix`
- `/patch-preview`
- `/approve-screenshot`
- `/revert-phase`
- `/log-phase-status`
- `/cursor-mode`
- `/whoami`
- `/retry-last-failed`
- `/lock-runner`
- `/unlock-runner`
- `/alert-runner-crash`

## Request URL
All commands use this endpoint:
```
POST https://7474-2601-1c0-577e-325e-00-1009.ngrok-free.app/slack/commands
```

## Next Steps for Cloud Runner
- Deploy `Dockerfile` to Fly.io, Railway, or EC2
- Link Slack env vars in CI/CD
- Mount persistent volume for logs + tasks
- Replace ngrok with reserved domain or Cloudflare Tunnel
