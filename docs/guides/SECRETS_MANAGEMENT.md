# 🔐 Secret Management System

This project integrates **HashiCorp Vault** and **1Password CLI** for comprehensive secret management across development environments.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Global .env   │───▶│  1Password CLI  │───▶│  Project .env   │
│   (Template)    │    │   (Storage)     │    │  (Runtime)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ HashiCorp Vault │    │  Sync Daemon    │    │   Application   │
│   (Backup)      │    │  (File Watch)   │    │   (Runtime)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### 1. Setup Real Environment Values

```bash
# Create .env with real values from env.example
./setup-real-env.sh

# Edit .env with your actual secrets
nano .env
```

### 2. Sync to 1Password

```bash
# Sync .env to 1Password (creates items with real values)
cd /Users/sawyer/gitSync/dev-tools && ./sync-to-1pw.js --force

# Test 1Password injection
cd /Users/sawyer/gitSync/gpt-cursor-runner && ./prestart.sh
```

### 3. Sync to Vault (Optional Backup)

```bash
# Start Vault
cd /Users/sawyer/gitSync/dev-tools && ./vault.sh

# Sync .env to Vault
./vault-sync-env.js

# Test Vault injection
cd /Users/sawyer/gitSync/gpt-cursor-runner && ./vault-to-env.sh
```

## 📋 Workflows

### 🔄 1Password Workflow (Primary)

**Setup:**

1. Create real `.env` with actual values
2. Run `./sync-to-1pw.js --force` to import to 1Password
3. Use `.op.env` template for runtime injection

**Runtime:**

```bash
# Manual injection
op inject -i /Users/sawyer/gitSync/_global/.op.env -o .env

# Automated injection (via npm scripts)
npm run inject-secrets
npm run dev  # Automatically runs predev script
```

### 🔐 Vault Workflow (Backup)

**Setup:**

1. Start Vault: `cd /Users/sawyer/gitSync/dev-tools && ./vault.sh`
2. Run `./vault-sync-env.js` to import secrets
3. Use `vault-to-env.sh` for runtime injection

**Runtime:**

```bash
# Manual injection
./vault-to-env.sh

# With environment setup
export VAULT_ADDR=http://localhost:8200 && ./vault-to-env.sh
```

### 🔄 Environment Sync Daemon

**Start:**

```bash
cd /Users/sawyer/gitSync/dev-tools
./sync-env-daemon.js --watch
```

**Features:**

- Watches global `.env` for changes
- Syncs to project-specific `.env` files
- CLI options: `--force`, `--exclude`, `--manual`, `--verbose`

## 🛠️ Scripts Reference

### Project Scripts

| Script              | Purpose             | Usage                 |
| ------------------- | ------------------- | --------------------- |
| `prestart.sh`       | 1Password injection | `./prestart.sh`       |
| `vault-to-env.sh`   | Vault injection     | `./vault-to-env.sh`   |
| `setup-real-env.sh` | Create real .env    | `./setup-real-env.sh` |

### Dev Tools Scripts

| Script               | Purpose             | Usage                          |
| -------------------- | ------------------- | ------------------------------ |
| `sync-to-1pw.js`     | Import to 1Password | `./sync-to-1pw.js --force`     |
| `vault-sync-env.js`  | Import to Vault     | `./vault-sync-env.js`          |
| `vault.sh`           | Start Vault         | `./vault.sh`                   |
| `sync-env-daemon.js` | File sync daemon    | `./sync-env-daemon.js --watch` |

### NPM Scripts

| Script                   | Purpose                | Usage                    |
| ------------------------ | ---------------------- | ------------------------ |
| `npm run inject-secrets` | Manual injection       | `npm run inject-secrets` |
| `npm run dev`            | Auto-injection + dev   | `npm run dev`            |
| `npm run start`          | Auto-injection + start | `npm run start`          |

## 🔧 Configuration

### 1Password Configuration

**Vault:** `SawyerSecrets`  
**Template:** `/Users/sawyer/gitSync/_global/.op.env`  
**Field Mapping:** `${VAR_NAME:password}`

### Vault Configuration

**Address:** `http://localhost:8200`  
**Path:** `secret/data/sawyer-dev`  
**Token:** Auto-generated (dev mode)

### Environment Files

| File                 | Purpose              | Location                                |
| -------------------- | -------------------- | --------------------------------------- |
| `.op.env`            | 1Password template   | `/Users/sawyer/gitSync/_global/.op.env` |
| `vault-to-env.sh`    | Vault injection      | Project root                            |
| `secrets.store.json` | Human-readable store | `/Users/sawyer/gitSync/dev-tools/`      |

## 🚨 Troubleshooting

### 1Password Issues

**Problem:** Placeholders not replaced

```bash
# Check item structure
op item get SLACK_BOT_TOKEN --vault SawyerSecrets --format=json

# Re-sync with real values
cd /Users/sawyer/gitSync/dev-tools && ./sync-to-1pw.js --force
```

**Problem:** Duplicate items

```bash
# List items
op item list --vault SawyerSecrets

# Delete duplicates manually
op item delete [ITEM_ID] --vault SawyerSecrets
```

### Vault Issues

**Problem:** Vault not accessible

```bash
# Start Vault
cd /Users/sawyer/gitSync/dev-tools && ./vault.sh

# Set environment
export VAULT_ADDR=http://localhost:8200
```

**Problem:** No secrets in Vault

```bash
# Import secrets
cd /Users/sawyer/gitSync/dev-tools && ./vault-sync-env.js

# Check secrets
vault kv get secret/data/sawyer-dev
```

### General Issues

**Problem:** .env has placeholders

```bash
# Create real .env first
./setup-real-env.sh

# Edit with real values
nano .env

# Re-sync to secret stores
cd /Users/sawyer/gitSync/dev-tools && ./sync-to-1pw.js --force
```

## 🔒 Security Best Practices

1. **Never commit real secrets** - Use `.env.example` for templates
2. **Use 1Password as primary** - Vault as backup
3. **Rotate secrets regularly** - Update in 1Password, re-sync
4. **Use different vaults** - Separate dev/prod secrets
5. **Audit access** - Monitor who has access to secrets

## 📚 Additional Resources

- [1Password CLI Documentation](https://developer.1password.com/docs/cli/)
- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [Environment Variables Best Practices](https://12factor.net/config)

## 🎯 Next Steps

1. ✅ Set up real `.env` values
2. ✅ Sync to 1Password with real values
3. ✅ Test runtime injection
4. ✅ Set up Vault backup
5. 🔄 Automate in CI/CD pipeline
6. 🔄 Add secret rotation workflows
