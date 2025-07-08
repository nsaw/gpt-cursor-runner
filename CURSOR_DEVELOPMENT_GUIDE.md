# Cursor Development Guide

## 🚀 Quick Start

### Starting the Development Server

```bash
# Option 1: Using npm
npm run dev

# Option 2: Direct node command
node server/index.js

# Option 3: Using Cursor (open project in Cursor first)
# Then use the integrated terminal or Cursor's run commands
```

### Cursor Integration

1. **Open Project in Cursor:**
   ```bash
   cursor .
   ```

2. **Development Server:**
   - The server runs on `http://localhost:5555`
   - Dashboard: `http://localhost:5555/dashboard`
   - Health check: `http://localhost:5555/health`

3. **Hybrid Mode:**
   - Cursor is configured with `hybridMode: true`
   - This enables AI assistance with hybrid block logs
   - Check the Cursor output panel for AI interactions

## 📁 Project Structure

```
gpt-cursor-runner/
├── .cursor/
│   ├── cursor.json          # Cursor configuration
│   └── environment.json     # Cursor environment settings
├── server/
│   ├── index.js            # Main server entry point
│   ├── handlers/           # Slack command handlers
│   ├── routes/             # Express routes
│   └── utils/              # Utility functions
├── gpt_cursor_runner/      # Python backend
└── .env                    # Environment variables
```

## 🔧 Configuration

### Cursor Configuration (`.cursor/cursor.json`)
```json
{
  "projectName": "gpt-cursor-runner",
  "entry": "server/index.js",
  "framework": "node",
  "agentCanUpdateSnapshot": true,
  "experimentalAI": true,
  "hybridMode": true,
  "devCommand": "node server/index.js"
}
```

##***REMOVED*** (`.env`)
```bash
# Manually restored in case Vault disabled it
CURSOR_API_KEY=sk-proj-REPLACE_ME_IF_NEEDED

# Generated from HashiCorp Vault
# No secrets found in Vault
# To populate: cd ~/gitSync/dev-tools && ./vault-sync-env.js
```

## 🛠️ Troubleshooting

### If Cursor dev command doesn't work:
- Use `npm run dev` or `node server/index.js` instead
- The `cursor dev` command doesn't exist in Cursor CLI

### If server won't start:
1. Check if port 5555 is available
2. Verify `.env` file exists and has proper permissions
3. Ensure Node.js dependencies are installed: `npm install`

### If Cursor AI isn't working:
1. Verify `CURSOR_API_KEY` is set in `.env`
2. Check Cursor settings for AI features
3. Restart Cursor if needed

## 📊 Monitoring

- **Health Check:** `http://localhost:5555/health`
- **Dashboard:** `http://localhost:5555/dashboard`
- **Logs:** Check `logs/` directory for application logs

## 🔄 Development Workflow

1. Start the server: `npm run dev`
2. Open Cursor: `cursor .`
3. Make changes to code
4. Server auto-restarts (if using nodemon)
5. Test endpoints and Slack commands
6. Check hybrid block logs in Cursor

## 🏷️ Version Tags

- `v1.4.0_cursor_runtime_restored` - Cursor runtime repair completed 