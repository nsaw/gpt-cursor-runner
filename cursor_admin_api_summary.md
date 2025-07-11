# 🚀 GPT-Cursor Runner Admin API - ACTIVE

**Status**: ✅ **RUNNING** on `http://localhost:5050`  
**Version**: 1.0.0  
**Health Check**: `http://localhost:5050/health`

## 📊 Admin Dashboard & Management

### 🎯 **Web Dashboard**
- **URL**: `http://localhost:5050/dashboard`
- **Features**: 
  - Real-time patch monitoring
  - Event tracking and visualization
  - System metrics and statistics
  - Auto-refresh every 30 seconds
  - Beautiful modern UI with stats cards

### 🔗 **Core Admin API Endpoints**

#### **Health & Status**
- `GET /health` - System health check
- `GET /api/dashboard/stats` - Comprehensive system statistics
- `GET /api/dashboard/events` - Recent events for dashboard
- `GET /api/dashboard/patches` - Recent patch data
- `GET /api/dashboard/metrics` - Patch metrics and analytics

#### **Events Management**
- `GET /events` - Get recent events (limit, type filtering)
- `GET /events/summary` - Event summary statistics
- `GET /events/patch` - Patch-specific events
- `GET /events/slack` - Slack integration events

#### **Patch Operations**
- `POST /webhook` - Main webhook for GPT hybrid blocks & Slack
- `POST /slack/test` - Test patch creation endpoint
- **Patch Processing**: Automatic validation, backup, and application

#### **Integration Features**
- **Slack Integration**: `/patch` commands, webhooks, notifications
- **Git Integration**: Automatic commits and backups
- **Rate Limiting**: Spam protection and abuse prevention
- **Role-based Classification**: Auto-labels UI components

## 🛡️ **Safety & Security Features**

- **Dry-run by default**: No changes without confirmation
- **Dangerous pattern detection**: Blocks risky patterns
- **Automatic backups**: Creates `.bak_*` files
- **Schema validation**: JSON format validation
- **Rate limiting**: Prevents abuse

## 📋 **Usage Examples**

### Test the Admin API
```bash
# Health check
curl http://localhost:5050/health

# Get system stats
curl http://localhost:5050/api/dashboard/stats

# Get recent events
curl http://localhost:5050/events?limit=10

# Create test patch
curl -X POST http://localhost:5050/slack/test
```

### Access Web Dashboard
Open your browser to: `http://localhost:5050/dashboard`

## 🔧 **CLI Tools Available**

While the server runs, you can also use these CLI tools:

```bash
# Activate virtual environment first
source venv/bin/activate

# View patches
python3 -m gpt_cursor_runner.patch_viewer

# View events
python3 -m gpt_cursor_runner.event_viewer

# Apply patches
python3 -m gpt_cursor_runner.patch_runner

# Revert patches
python3 -m gpt_cursor_runner.patch_reverter
```

## 📈 **Monitoring & Metrics**

- **Patch Metrics**: Time-to-apply, success rates, complexity scoring
- **System Metrics**: Memory usage, disk usage, uptime
- **Event Tracking**: All operations logged with timestamps
- **Dashboard Analytics**: Real-time visualization of all metrics

## 🎯 **Key Admin Capabilities**

1. **Real-time Monitoring**: Live dashboard with auto-refresh
2. **Patch Management**: Create, apply, revert, and track patches
3. **Event Logging**: Comprehensive system event tracking
4. **Slack Integration**: Full webhook and command support
5. **Safety Controls**: Multiple layers of protection
6. **Metrics & Analytics**: Detailed performance tracking

---

**🔥 The cursor admin API is now fully operational and ready for use!**  
**Visit the dashboard at**: `http://localhost:5050/dashboard`