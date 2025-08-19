# Universal Non-Blocking Runner (nb.js)\n\n**Use this for ALL commands that previously used `timeout ... & disown`.**\n\nExamples:\n\n```bash

# fly

node scripts/nb.js --ttl 45s --label fly-status --log validations/logs/fly-status.log --status validations/status -- fly status

# pm2

node scripts/nb.js --ttl 20s --label pm2-save --log validations/logs/pm2-save.log --status validations/status -- pm2 save

# curl / grep

node scripts/nb.js --ttl 15s --label probe --log validations/logs/probe.log --status validations/status -- bash -lc 'curl -fsS http://localhost:8081 | grep -q 200'

# tests (any)

node scripts/nb.js --ttl 30m --label jest --log validations/logs/jest.log --status validations/status -- npx --yes jest --runInBand --colors

```

- Always prefer **nb.js** over backgrounding with `& disown`.
- All commands run under **/bin/zsh -lc** with **Coreutils timeout** and **kill-after**.
- Inspect results in **validations/logs/** and **validations/status/**.
```
