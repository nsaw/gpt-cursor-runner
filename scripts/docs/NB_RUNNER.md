# NB Runner: Universal Non-Blocking Command Wrapper

**Do this now** — replace any `timeout … & disown` with nb.js.

### Replace

```sh
{ timeout 15s pm2 save & } >/dev/null 2>&1 & disown
```

### With

```sh
node scripts/nb.js --ttl 15s --label pm2-save --log validations/logs/pm2-save.log --status validations/status -- pm2 save
```

Why: eliminates posix_spawnp failures and terminal blocking, aligns with inline validation (P0) and prior spawn-hardening.
