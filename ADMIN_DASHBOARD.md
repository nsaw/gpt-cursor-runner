# GPT-Cursor Runner Admin Dashboard

A comprehensive remote monitoring and management interface for the GPT-Cursor Runner system. The admin dashboard provides real-time insights into agent queue execution, patch processing, summary generation, and service health monitoring.

## 🚀 Features

### 📊 Comprehensive Monitoring
- **Agent Queue Execution**: Track processing status, queue length, and performance metrics
- **Patch Processing**: Monitor patch success rates, processing times, and target file statistics
- **Summary Generation**: Track summary creation, delivery success rates, and generation times
- **Service Health**: Real-time health monitoring for all system components

### 🏥 Health Monitoring
- **Ghost Runner**: Monitor delivery service processes and logs
- **Tunnel Services**: Check ngrok, localtunnel, and cloudflared status
- **Fly Bot**: Monitor deployment status and process health
- **Database**: Track database file health and access
- **Webhook Endpoints**: Verify webhook availability and response times
- **Slack Integration**: Monitor Slack configuration and recent events

### 🔒 Security & Remote Access
- **Secure Authentication**: Password-protected admin access
- **IP Restrictions**: Configurable IP allowlist for remote access
- **Rate Limiting**: Prevent abuse with configurable request limits
- **Session Management**: Secure session tokens with configurable timeouts
- **HTTPS Support**: Works with SSL/TLS for secure remote access

### 📡 Real-time Updates
- **Live Event Stream**: Server-sent events for real-time monitoring
- **Auto-refresh**: Automatic dashboard updates every 30 seconds
- **Status Indicators**: Visual health status with color-coded indicators
- **Performance Metrics**: CPU, memory, disk, and network monitoring

## 🛠️ Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Admin Dashboard

Run the interactive setup script:

```bash
python scripts/setup_admin.py
```

This will guide you through:
- Setting admin username and password
- Configuring remote access settings
- Setting up IP restrictions
- Configuring security settings

### 3. Manual Configuration

Alternatively, you can manually configure the admin dashboard by setting environment variables in your `.env` file:

```bash
# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<generated_hash>
ADMIN_SECRET_KEY=<generated_secret>

# Remote Access
REMOTE_ACCESS_ENABLED=true
ALLOWED_IPS=192.168.1.100,10.0.0.50

# Security Settings
ADMIN_SESSION_TIMEOUT=3600
ADMIN_RATE_LIMIT_ENABLED=true
ADMIN_RATE_LIMIT_REQUESTS=100
```

### 4. Generate Password Hash

To generate a password hash manually:

```bash
python scripts/setup_admin.py hash "your_password"
```

## 🌐 Remote Access Setup

### Using ngrok

1. Install ngrok: https://ngrok.com/download
2. Start your Flask server: `python -m gpt_cursor_runner.main`
3. Create tunnel: `ngrok http 5000`
4. Access admin dashboard via the ngrok URL

### Using localtunnel

1. Install localtunnel: `npm install -g localtunnel`
2. Start your Flask server: `python -m gpt_cursor_runner.main`
3. Create tunnel: `lt --port 5000`
4. Access admin dashboard via the localtunnel URL

### Using Cloudflare Tunnel

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
2. Authenticate: `cloudflared tunnel login`
3. Create tunnel: `cloudflared tunnel create gpt-cursor-admin`
4. Configure tunnel and start: `cloudflared tunnel run gpt-cursor-admin`

## 📊 Dashboard Sections

### Service Health
- **Ghost Runner**: Monitors delivery service processes and log files
- **Tunnel**: Checks tunnel service status and endpoints
- **Fly Bot**: Monitors deployment and process health
- **Database**: Tracks database file health and access
- **Webhook**: Verifies webhook endpoint availability
- **Slack**: Monitors Slack integration configuration

### Agent Queue & Processing
- **Total Processed**: Number of tasks completed
- **Currently Queued**: Tasks waiting for processing
- **Failed Tasks**: Number of failed operations
- **Average Processing Time**: Mean time to complete tasks

### Summary Generation
- **Total Generated**: Number of summaries created
- **Delivery Success Rate**: Percentage of successful deliveries
- **Average Generation Time**: Mean time to generate summaries
- **Last Generated**: Timestamp of most recent summary

### Patch Processing
- **Total Patches**: Number of patches in system
- **Successful**: Successfully applied patches
- **Failed**: Failed patch applications
- **Last Processed**: Timestamp of last patch processing

### System Resources
- **CPU Usage**: Current CPU utilization percentage
- **Memory Usage**: Current memory usage percentage
- **Disk Usage**: Current disk usage percentage
- **Process Memory**: Memory usage of the main process

## 🔧 API Endpoints

### Authentication
- `GET /admin/login` - Admin login page
- `POST /admin/login` - Authenticate admin user
- `POST /admin/logout` - Logout admin user
- `GET /admin/status` - Get admin dashboard status

### Dashboard Data
- `GET /admin` - Main admin dashboard page
- `GET /api/admin/health` - Get comprehensive health status
- `GET /api/admin/queue` - Get agent queue statistics
- `GET /api/admin/summary` - Get summary generation statistics
- `GET /api/admin/patches` - Get detailed patch processing statistics
- `GET /api/admin/system` - Get comprehensive system statistics
- `GET /api/admin/events/stream` - Stream real-time events

## 🔒 Security Features

### Authentication
- SHA-256 password hashing
- Secure session tokens with HMAC signatures
- Configurable session timeouts
- HTTP-only cookies for session management

### Access Control
- IP address allowlist
- Configurable rate limiting
- Remote access toggle
- Request logging and monitoring

### Data Protection
- No sensitive data stored in plain text
- Secure token generation
- Session expiration handling
- Rate limiting to prevent abuse

## 📈 Monitoring Features

### Health Checks
The admin dashboard performs comprehensive health checks on:

1. **Process Monitoring**: Checks for running processes by name
2. **Log File Analysis**: Monitors log file sizes and modification times
3. **Network Connectivity**: Tests endpoint availability
4. **Resource Usage**: Monitors CPU, memory, and disk usage
5. **Service Status**: Checks deployment and configuration status

### Real-time Updates
- Server-sent events for live updates
- Automatic refresh every 30 seconds
- Visual status indicators
- Performance trend monitoring

### Alerting
- Visual health status indicators
- Error logging and reporting
- Performance threshold monitoring
- Service availability tracking

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify password hash in `.env` file
   - Check username configuration
   - Ensure session timeout is appropriate

2. **Remote Access Denied**
   - Verify `REMOTE_ACCESS_ENABLED=true`
   - Check IP allowlist configuration
   - Ensure firewall allows connections

3. **Health Checks Failing**
   - Verify service processes are running
   - Check log file permissions
   - Ensure network connectivity

4. **Rate Limiting**
   - Increase `ADMIN_RATE_LIMIT_REQUESTS`
   - Disable rate limiting temporarily
   - Check for multiple concurrent users

### Debug Mode

Enable debug logging by setting:

```bash
FLASK_ENV=development
FLASK_DEBUG=1
```

### Log Files

Check application logs for detailed error information:

```bash
tail -f logs/app.log
```

## 🔄 Maintenance

### Regular Tasks

1. **Password Rotation**: Update admin password periodically
2. **IP Allowlist**: Review and update allowed IP addresses
3. **Rate Limits**: Adjust based on usage patterns
4. **Session Timeouts**: Review and adjust as needed

### Backup

Backup important configuration files:

```bash
cp .env .env.backup
cp event-log.json event-log.backup.json
```

### Updates

Keep the admin dashboard updated:

```bash
git pull origin main
pip install -r requirements.txt
```

## 📝 Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADMIN_USERNAME` | `admin` | Admin username |
| `ADMIN_PASSWORD_HASH` | - | SHA-256 hash of admin password |
| `ADMIN_SECRET_KEY` | - | Secret key for session tokens |
| `REMOTE_ACCESS_ENABLED` | `true` | Enable remote access |
| `ALLOWED_IPS` | - | Comma-separated list of allowed IPs |
| `ADMIN_SESSION_TIMEOUT` | `3600` | Session timeout in seconds |
| `ADMIN_RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `ADMIN_RATE_LIMIT_REQUESTS` | `100` | Requests per hour limit |

### Health Check Configuration

The health monitor checks for:

- **Ghost Runner**: Processes containing 'ghost' in name
- **Tunnel Services**: ngrok, localtunnel, cloudflared processes
- **Fly Bot**: Processes containing 'fly' in name
- **Database**: *.db, *.sqlite, *.json files
- **Webhook**: HTTP POST to webhook endpoint
- **Slack**: Environment variables and recent events

## 🤝 Contributing

To contribute to the admin dashboard:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This admin dashboard is part of the GPT-Cursor Runner project and follows the same license terms.