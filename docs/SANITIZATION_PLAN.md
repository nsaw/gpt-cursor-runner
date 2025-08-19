# 🧹 ThoughtPilot AI - System Sanitization Plan

## ⚠️ CRITICAL: WORKING WITH CLONE ONLY

**IMPORTANT**: This sanitization process will be performed on a **CLONE** of the original gpt-cursor-runner system, NOT the original working system. The original system must remain untouched and functional.

### **Clone Strategy**

1. **Create backup** of original system
2. **Clone to new directory** for sanitization
3. **Sanitize the clone** only
4. **Test sanitized version** thoroughly
5. **Package sanitized clone** for distribution
6. **Preserve original** for continued development

### **Directory Structure**

```
/Users/sawyer/gitSync/
├── gpt-cursor-runner/           # ORIGINAL - DO NOT TOUCH
│   ├── .env                     # Original with personal data
│   ├── config/                  # Original configuration
│   └── ...                      # Original working system
│
├── thoughtpilot-commercial/     # CLONE - SANITIZE THIS
│   ├── thoughtpilot-free/       # Free tier package
│   ├── thoughtpilot-pro/        # Pro tier package
│   ├── thoughtpilot-team/       # Team tier package
│   └── thoughtpilot-enterprise/ # Enterprise tier package
│
└── _backups/                    # Backup of original
    └── gpt-cursor-runner-backup-YYYYMMDD.tar.gz
```

## 🎯 Sanitization Goals

### **Primary Objectives**

1. **Remove all personal data** - URLs, tokens, credentials, personal references
2. **Create clean templates** - Environment files, configuration templates
3. **Document setup process** - Clear installation and configuration guides
4. **Prepare for distribution** - Ready for commercial packaging

### **Sanitization Scope**

- Environment variables and configuration files
- Hardcoded URLs and endpoints
- Personal Slack tokens and webhooks
- Log files and temporary data
- Personal project references
- Documentation cleanup

## 📋 Phase 0: Clone Preparation

### **0.1 Create Backup**

```bash
# Create backup of original system
cd /Users/sawyer/gitSync
tar -czf _backups/gpt-cursor-runner-backup-$(date +%Y%m%d).tar.gz gpt-cursor-runner/
```

### **0.2 Create Clone**

```bash
# Create commercial clone directory
mkdir -p /Users/sawyer/gitSync/thoughtpilot-commercial

# Clone original system
cp -r gpt-cursor-runner thoughtpilot-commercial/original-clone

# Create tier-specific directories
mkdir -p thoughtpilot-commercial/thoughtpilot-free
mkdir -p thoughtpilot-commercial/thoughtpilot-pro
mkdir -p thoughtpilot-commercial/thoughtpilot-team
mkdir -p thoughtpilot-commercial/thoughtpilot-enterprise
```

### **0.3 Verify Clone**

```bash
# Verify clone is complete
ls -la thoughtpilot-commercial/original-clone/

# Test that original is untouched
ls -la gpt-cursor-runner/
```

## 📋 Phase 1: Personal Data Removal

### **1.1 Environment Variables Cleanup**

#### **Files to Sanitize (IN CLONE ONLY)**

- [ ] `thoughtpilot-commercial/original-clone/env.example` - Remove personal URLs and tokens
- [ ] `thoughtpilot-commercial/original-clone/.env` files - Remove all personal data
- [ ] `thoughtpilot-commercial/original-clone/config/config.json` - Sanitize configuration
- [ ] `thoughtpilot-commercial/original-clone/deployment/fly.toml` - Remove personal app names
- [ ] `thoughtpilot-commercial/original-clone/package.json` - Update personal references

#### **Personal Data to Remove**

```bash
# URLs and Endpoints
RUNNER_URL=https://runner.thoughtmarks.app
ENDPOINT_URL=https://webhook.thoughtmarks.app
DASHBOARD_URL=https://runner.thoughtmarks.app/dashboard
SLACK_REDIRECT_URI=https://runner.thoughtmarks.app/slack/oauth/callback

# Slack Tokens
SLACK_BOT_TOKEN=your-slack-bot-token-here
SLACK_SIGNING_SECRET=your-slack-signing-secret-here
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here

***REMOVED***
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/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

# Personal References
SLACK_CHANNEL=#runner-control
SLACK_USERNAME=GPT-Cursor Runner
```

### **1.2 Configuration Files Cleanup**

#### **Files to Update (IN CLONE ONLY)**

- [ ] `thoughtpilot-commercial/original-clone/config/config.json` - Remove personal settings
- [ ] `thoughtpilot-commercial/original-clone/config/ecosystem.config.js` - Sanitize PM2 configuration
- [ ] `thoughtpilot-commercial/original-clone/config/redis/redis.conf` - Remove personal Redis settings
- [ ] `thoughtpilot-commercial/original-clone/autolinter_config.json` - Remove personal paths

#### **Personal Settings to Remove**

```json
{
  "personal_urls": [
    "https://runner.thoughtmarks.app",
    "https://webhook.thoughtmarks.app",
    "https://expo.thoughtmarks.app"
  ],
  "personal_tokens": ["slack_bot_token", "slack_signing_secret", "jwt_secret"],
  "personal_paths": [
    "/Users/sawyer/gitSync/",
    "/tm-mobile-cursor/",
    "/gpt-cursor-runner/"
  ]
}
```

### **1.3 Code Files Cleanup**

#### **Python Files (IN CLONE ONLY)**

- [ ] `thoughtpilot-commercial/original-clone/gpt_cursor_runner/main.py` - Remove personal URLs
- [ ] `thoughtpilot-commercial/original-clone/gpt_cursor_runner/slack_handler.py` - Sanitize Slack config
- [ ] `thoughtpilot-commercial/original-clone/gpt_cursor_runner/webhook_handler.py` - Remove personal endpoints
- [ ] `thoughtpilot-commercial/original-clone/gpt_cursor_runner/dashboard.py` - Remove personal references

#### **JavaScript Files (IN CLONE ONLY)**

- [ ] `thoughtpilot-commercial/original-clone/server/index.js` - Remove personal URLs
- [ ] `thoughtpilot-commercial/original-clone/scripts/slack/*.js` - Sanitize Slack configurations
- [ ] `thoughtpilot-commercial/original-clone/scripts/core/*.js` - Remove personal paths
- [ ] `thoughtpilot-commercial/original-clone/scripts/watchdogs/*.js` - Sanitize monitoring config

#### **Shell Scripts (IN CLONE ONLY)**

- [ ] `thoughtpilot-commercial/original-clone/scripts/launch-ghost-2.0-systems.sh` - Remove personal paths
- [ ] `thoughtpilot-commercial/original-clone/scripts/watchdog-*.sh` - Sanitize paths and URLs
- [ ] `thoughtpilot-commercial/original-clone/scripts/deployment/*.sh` - Remove personal deployment config

### **1.4 Documentation Cleanup**

#### **Files to Update (IN CLONE ONLY)**

- [ ] `thoughtpilot-commercial/original-clone/README.md` - Remove personal references
- [ ] `thoughtpilot-commercial/original-clone/docs/ARCHITECTURE.md` - Genericize architecture docs
- [ ] `thoughtpilot-commercial/original-clone/docs/DEPLOYMENT.md` - Remove personal deployment info
- [ ] `thoughtpilot-commercial/original-clone/slack/_SLACK_COMMAND_CHEATSHEET.md` - Remove personal URLs

#### **Personal References to Remove**

```markdown
# Personal URLs

- https://runner.thoughtmarks.app
- https://webhook.thoughtmarks.app
- https://gpt-cursor-runner.fly.dev

# Personal Paths

- /Users/sawyer/gitSync/
- /tm-mobile-cursor/
- /gpt-cursor-runner/

# Personal Names

- Sawyer
- Thoughtmarks
- Specific project names
```

## 📋 Phase 2: Template Creation

### **2.1 Environment Templates**

#### **Free Tier Template**

```bash
# ThoughtPilot Free - Environment Configuration
THOUGHTPILOT_TIER=free
THOUGHTPILOT_VERSION=1.0.0

# Server Configuration
SERVER_PORT=5555
SERVER_HOST=0.0.0.0
DEBUG_MODE=false

# Database Configuration
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite:///thoughtpilot.db

# Basic Security
JWT_SECRET=your-jwt-secret-here
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=900

# Local Storage
STORAGE_TYPE=local
STORAGE_PATH=./data

# Logging
LOG_LEVEL=INFO
LOG_FILE=thoughtpilot.log
```

#### **Pro Tier Template**

```bash
# ThoughtPilot Pro - Environment Configuration
THOUGHTPILOT_TIER=pro
THOUGHTPILOT_VERSION=1.0.0

# Server Configuration
SERVER_PORT=5555
SERVER_HOST=0.0.0.0
DEBUG_MODE=false

# Database Configuration
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/thoughtpilot

# Slack Configuration
SLACK_BOT_TOKEN=your-slack-bot-token-here
SLACK_SIGNING_SECRET=your-slack-signing-secret-here
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here
SLACK_REDIRECT_URI=https://your-app.com/slack/oauth/callback

# Cloud Configuration
CLOUD_PROVIDER=fly
CLOUD_REGION=us-west-2
CLOUD_APP_NAME=your-thoughtpilot-app

# Security Configuration
JWT_SECRET=your-jwt-secret-here
RATE_LIMIT_REQUESTS=500
RATE_LIMIT_WINDOW=900

# Cloud Storage
STORAGE_TYPE=cloud
STORAGE_PROVIDER=aws
STORAGE_BUCKET=your-thoughtpilot-bucket

# Logging
LOG_LEVEL=INFO
LOG_FILE=thoughtpilot.log
```

#### **Team Tier Template**

```bash
# ThoughtPilot Team - Environment Configuration
THOUGHTPILOT_TIER=team
THOUGHTPILOT_VERSION=1.0.0

# Server Configuration
SERVER_PORT=5555
SERVER_HOST=0.0.0.0
DEBUG_MODE=false

# Database Configuration
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/thoughtpilot

# Slack Configuration
SLACK_BOT_TOKEN=your-slack-bot-token-here
SLACK_SIGNING_SECRET=your-slack-signing-secret-here
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here
SLACK_REDIRECT_URI=https://your-app.com/slack/oauth/callback

# Authentication
AUTH_PROVIDER=slack
AUTH_DOMAIN=your-team.slack.com
AUTH_CLIENT_ID=your-auth-client-id
AUTH_CLIENT_SECRET=your-auth-client-secret

# CI/CD Integration
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
GITLAB_WEBHOOK_SECRET=your-gitlab-webhook-secret

# Cloud Configuration
CLOUD_PROVIDER=aws
CLOUD_REGION=us-west-2
CLOUD_APP_NAME=your-thoughtpilot-app

# Security Configuration
JWT_SECRET=your-jwt-secret-here
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=900

# API Configuration
API_RATE_LIMIT=1000
API_RATE_LIMIT_WINDOW=3600

# Cloud Storage
STORAGE_TYPE=cloud
STORAGE_PROVIDER=aws
STORAGE_BUCKET=your-thoughtpilot-bucket

# Logging
LOG_LEVEL=INFO
LOG_FILE=thoughtpilot.log
```

#### **Enterprise Tier Template**

```bash
# ThoughtPilot Enterprise - Environment Configuration
THOUGHTPILOT_TIER=enterprise
THOUGHTPILOT_VERSION=1.0.0

# Server Configuration
SERVER_PORT=5555
SERVER_HOST=0.0.0.0
DEBUG_MODE=false

# Database Configuration
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://user:password@localhost:5432/thoughtpilot

# Slack Configuration
SLACK_BOT_TOKEN=your-slack-bot-token-here
SLACK_SIGNING_SECRET=your-slack-signing-secret-here
SLACK_CLIENT_ID=your-slack-client-id-here
SLACK_CLIENT_SECRET=your-slack-client-secret-here
SLACK_REDIRECT_URI=https://your-app.com/slack/oauth/callback

# Enterprise Authentication
ENTERPRISE_SSO_PROVIDER=okta
ENTERPRISE_SSO_CLIENT_ID=your-sso-client-id
ENTERPRISE_SSO_CLIENT_SECRET=your-sso-client-secret
ENTERPRISE_SSO_DOMAIN=your-company.okta.com

# GitHub Enterprise
GITHUB_ENTERPRISE_URL=https://github.your-company.com
GITHUB_ENTERPRISE_TOKEN=your-github-enterprise-token

# Custom GPT Endpoints
CUSTOM_GPT_ENDPOINT=https://your-gpt-endpoint.com
CUSTOM_GPT_API_KEY=your-custom-gpt-api-key

# CI/CD Integration
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
GITLAB_WEBHOOK_SECRET=your-gitlab-webhook-secret
AZURE_DEVOPS_WEBHOOK_SECRET=your-azure-devops-webhook-secret

# Cloud Configuration
CLOUD_PROVIDER=aws
CLOUD_REGION=us-west-2
CLOUD_APP_NAME=your-thoughtpilot-app

# Security Configuration
JWT_SECRET=your-jwt-secret-here
RATE_LIMIT_REQUESTS=5000
RATE_LIMIT_WINDOW=900

# API Configuration
API_RATE_LIMIT=5000
API_RATE_LIMIT_WINDOW=3600

# Enterprise Storage
STORAGE_TYPE=enterprise
STORAGE_PROVIDER=aws
STORAGE_BUCKET=your-thoughtpilot-bucket

# Compliance
COMPLIANCE_SOC2=true
COMPLIANCE_GDPR=true
COMPLIANCE_HIPAA=false

# Logging
LOG_LEVEL=INFO
LOG_FILE=thoughtpilot.log
AUDIT_LOG_FILE=audit.log
```

### **2.2 Configuration Templates**

#### **config.template.json**

```json
{
  "thoughtpilot": {
    "tier": "free",
    "version": "1.0.0",
    "environment": "production"
  },
  "server": {
    "port": 5555,
    "host": "0.0.0.0",
    "debug": false,
    "cors": {
      "enabled": true,
      "origins": ["*"]
    }
  },
  "database": {
    "type": "sqlite",
    "url": "sqlite:///thoughtpilot.db",
    "pool_size": 10,
    "max_overflow": 20
  },
  "slack": {
    "enabled": false,
    "bot_token": "",
    "signing_secret": "",
    "client_id": "",
    "client_secret": "",
    "redirect_uri": ""
  },
  "security": {
    "jwt_secret": "",
    "rate_limit_requests": 100,
    "rate_limit_window": 900,
    "api_rate_limit": 100,
    "api_rate_limit_window": 3600
  },
  "storage": {
    "type": "local",
    "provider": "local",
    "path": "./data",
    "bucket": ""
  },
  "logging": {
    "level": "INFO",
    "file": "thoughtpilot.log",
    "max_size": "100MB",
    "backup_count": 5
  },
  "features": {
    "dashboard": true,
    "slack_commands": false,
    "ci_cd": false,
    "analytics": false,
    "audit_logging": false,
    "multi_user": false,
    "enterprise_sso": false
  }
}
```

### **2.3 Setup Wizards**

#### **setup-wizard.js**

```javascript
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log("🚀 ThoughtPilot AI Setup Wizard");
console.log("===============================\n");

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupThoughtPilot() {
  // Detect tier
  const tier = process.env.THOUGHTPILOT_TIER || "free";
  console.log(`Setting up ThoughtPilot ${tier.toUpperCase()} tier...\n`);

  // Server configuration
  const serverPort =
    (await askQuestion("Server port (default: 5555): ")) || "5555";
  const serverHost =
    (await askQuestion("Server host (default: 0.0.0.0): ")) || "0.0.0.0";

  // Database configuration
  const dbType =
    (await askQuestion(
      "Database type (sqlite/postgresql, default: sqlite): ",
    )) || "sqlite";
  let dbUrl = "";
  if (dbType === "postgresql") {
    const dbHost = await askQuestion("Database host: ");
    const dbPort =
      (await askQuestion("Database port (default: 5432): ")) || "5432";
    const dbName = await askQuestion("Database name: ");
    const dbUser = await askQuestion("Database user: ");
    const dbPassword = await askQuestion("Database password: ");
    dbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
  } else {
    dbUrl = "sqlite:///thoughtpilot.db";
  }

  // Security configuration
  const jwtSecret =
    (await askQuestion("JWT secret (leave empty for auto-generation): ")) ||
    Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

  // Slack configuration (Pro+)
  let slackEnabled = false;
  let slackConfig = {};
  if (tier !== "free") {
    const enableSlack =
      (await askQuestion("Enable Slack integration? (y/n, default: n): ")) ||
      "n";
    slackEnabled = enableSlack.toLowerCase() === "y";

    if (slackEnabled) {
      slackConfig = {
        bot_token: await askQuestion("Slack bot token: "),
        signing_secret: await askQuestion("Slack signing secret: "),
        client_id: await askQuestion("Slack client ID: "),
        client_secret: await askQuestion("Slack client secret: "),
        redirect_uri: await askQuestion("Slack redirect URI: "),
      };
    }
  }

  // Generate configuration
  const config = {
    thoughtpilot: {
      tier: tier,
      version: "1.0.0",
      environment: "production",
    },
    server: {
      port: parseInt(serverPort),
      host: serverHost,
      debug: false,
      cors: {
        enabled: true,
        origins: ["*"],
      },
    },
    database: {
      type: dbType,
      url: dbUrl,
      pool_size: 10,
      max_overflow: 20,
    },
    slack: {
      enabled: slackEnabled,
      ...slackConfig,
    },
    security: {
      jwt_secret: jwtSecret,
      rate_limit_requests: tier === "free" ? 100 : tier === "pro" ? 500 : 1000,
      rate_limit_window: 900,
      api_rate_limit: tier === "free" ? 100 : tier === "pro" ? 500 : 1000,
      api_rate_limit_window: 3600,
    },
    storage: {
      type: "local",
      provider: "local",
      path: "./data",
      bucket: "",
    },
    logging: {
      level: "INFO",
      file: "thoughtpilot.log",
      max_size: "100MB",
      backup_count: 5,
    },
    features: {
      dashboard: true,
      slack_commands: slackEnabled,
      ci_cd: tier === "team" || tier === "enterprise",
      analytics: tier === "pro" || tier === "team" || tier === "enterprise",
      audit_logging: tier === "team" || tier === "enterprise",
      multi_user: tier === "team" || tier === "enterprise",
      enterprise_sso: tier === "enterprise",
    },
  };

  // Write configuration
  fs.writeFileSync("config/config.json", JSON.stringify(config, null, 2));

  // Generate environment file
  const envContent = `# ThoughtPilot ${tier.toUpperCase()} Configuration
THOUGHTPILOT_TIER=${tier}
THOUGHTPILOT_VERSION=1.0.0

# Server Configuration
SERVER_PORT=${serverPort}
SERVER_HOST=${serverHost}
DEBUG_MODE=false

# Database Configuration
DATABASE_TYPE=${dbType}
DATABASE_URL=${dbUrl}

# Security Configuration
JWT_SECRET=${jwtSecret}
RATE_LIMIT_REQUESTS=${config.security.rate_limit_requests}
RATE_LIMIT_WINDOW=${config.security.rate_limit_window}

# Storage Configuration
STORAGE_TYPE=local
STORAGE_PATH=./data

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=thoughtpilot.log

${
  slackEnabled
    ? `# Slack Configuration
SLACK_BOT_TOKEN=${slackConfig.bot_token}
SLACK_SIGNING_SECRET=${slackConfig.signing_secret}
SLACK_CLIENT_ID=${slackConfig.client_id}
SLACK_CLIENT_SECRET=${slackConfig.client_secret}
SLACK_REDIRECT_URI=${slackConfig.redirect_uri}`
    : ""
}
`;

  fs.writeFileSync(".env", envContent);

  console.log("\n✅ Configuration generated successfully!");
  console.log("📁 Files created:");
  console.log("  - config/config.json");
  console.log("  - .env");
  console.log("\n🚀 To start ThoughtPilot:");
  console.log("  npm start");
  console.log("\n📊 Dashboard will be available at:");
  console.log(`  http://${serverHost}:${serverPort}/dashboard`);

  rl.close();
}

setupThoughtPilot().catch(console.error);
```

## 📋 Phase 3: Documentation Cleanup

### **3.1 README Templates**

#### **Free Tier README**

````markdown
# ThoughtPilot Free

AI-powered development automation for solo developers.

## Features

- ✅ **CLI Interface**: Local patch execution and management
- ✅ **Basic Dashboard**: Local web interface for monitoring
- ✅ **Patch Validation**: TypeScript, ESLint, runtime checks
- ✅ **Local Storage**: SQLite database for patch history
- ✅ **Basic Logging**: Console and file-based logging
- ✅ **Single Project**: One project per installation

## Quick Start

1. **Install**
   ```bash
   npm install @thoughtpilot/free
   ```
````

2. **Setup**

   ```bash
   npx thoughtpilot-setup
   ```

3. **Start**

   ```bash
   npm start
   ```

4. **Access Dashboard**
   ```
   http://localhost:5555/dashboard
   ```

## Configuration

Copy `.env.template` to `.env` and configure:

```bash
# Server Configuration
SERVER_PORT=5555
SERVER_HOST=0.0.0.0

# Database Configuration
DATABASE_TYPE=sqlite
DATABASE_URL=sqlite:///thoughtpilot.db

# Security Configuration
JWT_SECRET=your-jwt-secret-here
```

## Usage

### CLI Commands

```bash
# Execute a patch
thoughtpilot patch apply patch.json

# View patch history
thoughtpilot patch list

# Check system status
thoughtpilot status
```

### Web Dashboard

Access the dashboard at `http://localhost:5555/dashboard` for:

- Real-time system monitoring
- Patch execution history
- System health metrics
- Configuration management

## Support

- 📚 [Documentation](https://docs.thoughtpilot.ai)
- 💬 [Community Forum](https://community.thoughtpilot.ai)
- 🐛 [Issue Tracker](https://github.com/thoughtpilot/free/issues)

## License

MIT License - see [LICENSE](LICENSE) for details.

````

### **3.2 Installation Guides**

#### **Free Tier Installation**
```markdown
# ThoughtPilot Free - Installation Guide

## Prerequisites

- Node.js 18+
- Python 3.11+
- Git

## Installation Steps

### 1. Download and Extract

```bash
# Download the package
wget https://github.com/thoughtpilot/free/releases/latest/download/thoughtpilot-free.zip

# Extract
unzip thoughtpilot-free.zip
cd thoughtpilot-free
````

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Configure

```bash
# Copy configuration template
cp .env.template .env
cp config/config.template.json config/config.json

# Run setup wizard
node config/setup-wizard.js
```

### 4. Start Services

```bash
# Start ThoughtPilot
npm start
```

### 5. Verify Installation

```bash
# Check if service is running
curl http://localhost:5555/health

# Access dashboard
open http://localhost:5555/dashboard
```

## Configuration Options

##***REMOVED***

| Variable        | Description   | Default                   |
| --------------- | ------------- | ------------------------- |
| `SERVER_PORT`   | Server port   | 5555                      |
| `SERVER_HOST`   | Server host   | 0.0.0.0                   |
| `DATABASE_TYPE` | Database type | sqlite                    |
| `DATABASE_URL`  | Database URL  | sqlite:///thoughtpilot.db |
| `JWT_SECRET`    | JWT secret    | auto-generated            |

### Configuration File

Edit `config/config.json` to customize:

- Server settings
- Database configuration
- Security settings
- Feature flags

## Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   # Change port in .env
   SERVER_PORT=5556
   ```

2. **Database connection failed**

   ```bash
   # Check database URL in .env
   DATABASE_URL=sqlite:///thoughtpilot.db
   ```

3. **Permission denied**
   ```bash
   # Fix permissions
   chmod +x scripts/*.sh
   ```

### Getting Help

- Check logs: `tail -f thoughtpilot.log`
- Community forum: https://community.thoughtpilot.ai
- Issue tracker: https://github.com/thoughtpilot/free/issues

```

## 📋 Phase 4: Bundle Preparation

### **4.1 Directory Structure**

#### **Free Tier Bundle**
```

thoughtpilot-free/
├── README.md
├── package.json
├── requirements.txt
├── .env.template
├── config/
│ ├── config.template.json
│ └── setup-wizard.js
├── src/
│ ├── main.py
│ ├── dashboard/
│ │ ├── templates/
│ │ └── static/
│ └── cli/
│ └── index.js
├── scripts/
│ ├── install.sh
│ ├── setup.sh
│ └── start.sh
├── docs/
│ ├── installation.md
│ ├── configuration.md
│ └── troubleshooting.md
├── docker/
│ └── Dockerfile
└── data/
└── .gitkeep

````

### **4.2 Package.json Templates**

#### **Free Tier Package.json**
```json
{
  "name": "@thoughtpilot/free",
  "version": "1.0.0",
  "description": "ThoughtPilot Free - AI-powered development automation for solo developers",
  "main": "src/cli/index.js",
  "bin": {
    "thoughtpilot": "src/cli/index.js"
  },
  "scripts": {
    "start": "python3 -m src.main",
    "dev": "python3 -m src.main --debug",
    "setup": "node config/setup-wizard.js",
    "install": "bash scripts/install.sh",
    "test": "npm run test:unit && npm run test:integration",
    "test:unit": "jest",
    "test:integration": "python -m pytest tests/",
    "lint": "eslint src/ && flake8 src/",
    "build": "npm run lint && npm test"
  },
  "keywords": [
    "ai",
    "automation",
    "development",
    "patches",
    "cursor",
    "gpt"
  ],
  "author": "ThoughtPilot Team",
  "license": "MIT",
  "dependencies": {
    "express": "^4.21.2",
    "sqlite3": "^5.1.7",
    "winston": "^3.17.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "jest": "^30.0.5",
    "eslint": "^8.57.1",
    "pytest": "^7.0.0",
    "flake8": "^6.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "python": ">=3.11.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/thoughtpilot/free.git"
  },
  "bugs": {
    "url": "https://github.com/thoughtpilot/free/issues"
  },
  "homepage": "https://thoughtpilot.ai/free"
}
````

## 🎯 Implementation Checklist

### **Week 1: Clone and Sanitization**

- [ ] Create backup of original system
- [ ] Create clone directory structure
- [ ] Remove all personal URLs and endpoints from clone
- [ ] Sanitize environment variables in clone
- [ ] Remove personal Slack tokens from clone
- [ ] Clean up configuration files in clone
- [ ] Remove personal project references from clone

### **Week 2: Templates**

- [ ] Create environment templates for all tiers
- [ ] Create configuration templates
- [ ] Create setup wizards
- [ ] Create installation scripts

### **Week 3: Documentation**

- [ ] Create README templates
- [ ] Create installation guides
- [ ] Create configuration guides
- [ ] Create troubleshooting guides

### **Week 4: Packaging**

- [ ] Create bundle structures
- [ ] Create package.json templates
- [ ] Create Docker configurations
- [ ] Create installation packages

---

**Status**: 📋 Plan Complete - Ready for Implementation
**Next Action**: Begin Phase 0 - Clone Preparation
**Timeline**: 4 weeks to complete sanitization
**Priority**: High - Required before commercial distribution
**⚠️ CRITICAL**: Original system must remain untouched
