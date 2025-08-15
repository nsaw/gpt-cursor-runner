# 🚀 Fly.io Deployment Pro Tips for GPT-Cursor Runner

## 1. Set Fly Secrets Immediately After Launch

After deploying, run these commands to configure your secrets:

```bash
# Set all required secrets
fly secrets set SLACK_SIGNING_SECRET=your_slack_signing_secret
fly secrets set SLACK_BOT_TOKEN=your_slack_bot_token
fly secrets set OPENAI_API_KEY=your_openai_api_key
fly secrets set NGROK_AUTH_TOKEN=your_ngrok_auth_token

# Optional: Set additional environment variables
fly secrets set NODE_ENV=production
fly secrets set PUBLIC_RUNNER_URL=https://runner.thoughtmarks.app
```

## 2. Domain Mapping (Cloudflare Alternative)

If you want to use Fly.io instead of Cloudflare tunnels:

```bash
# Map your custom domain
fly certs add runner-prod.thoughtmarks.app

# Or use Fly's subdomain
fly certs add gpt-cursor-runner.fly.dev
```

## 3. Health Check Configuration

The `fly.toml` includes comprehensive health checks:

```toml
[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "get"
  timeout = "5s"
  path = "/health"

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "get"
  timeout = "5s"
  path = "/slack/test"
```

## 4. Deployment Commands

```bash
# Initial deployment
fly launch --no-deploy

# Deploy updates
fly deploy

# Check status
fly status

# View logs
fly logs

# SSH into the machine (for debugging)
fly ssh console
```

## 5. Environment-Specific Configurations

### Development

```bash
fly apps create gpt-cursor-runner-dev
fly deploy --app gpt-cursor-runner-dev
```

### Production

```bash
fly apps create gpt-cursor-runner
fly deploy --app gpt-cursor-runner
```

## 6. Monitoring and Scaling

```bash
# Scale up for production
fly scale count 2

# Monitor resource usage
fly dashboard

# View metrics
fly logs --app gpt-cursor-runner
```

## 7. Database and Persistence

For persistent data storage:

```bash
# Create a Postgres database
fly postgres create

# Attach to your app
fly postgres attach <database-name>
```

## 8. Custom Domains and SSL

```bash
# Add custom domain
fly certs add your-domain.com

# Check certificate status
fly certs show your-domain.com
```

## 9. Environment Variables Management

```bash
# Set environment variables
fly secrets set KEY=value

# View current secrets
fly secrets list

# Remove a secret
fly secrets unset KEY
```

## 10. Troubleshooting

### Common Issues:

1. **Port conflicts**: Ensure your app listens on port 5555
2. **Health check failures**: Verify `/health` endpoint returns 200
3. **Secret issues**: Check all required secrets are set
4. **Memory limits**: Monitor with `fly dashboard`

### Debug Commands:

```bash
# Check app status
fly status

# View recent logs
fly logs

# SSH for debugging
fly ssh console

# Restart the app
fly apps restart
```

## 11. Production Checklist

- [ ] All secrets configured
- [ ] Health checks passing
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Monitoring enabled
- [ ] Logs being collected
- [ ] Backup strategy in place

## 12. Cost Optimization

```bash
# Scale down for development
fly scale count 1

# Use shared CPU for cost savings
fly scale memory 512
```

## 13. Integration with Existing Systems

### Slack Webhook URL Update:

Update your Slack app webhook URL to:

```
https://gpt-cursor-runner.fly.dev/slack/commands
```

### Cloudflare Tunnel Alternative:

If using Fly.io instead of Cloudflare:

1. Update `PUBLIC_RUNNER_URL` in secrets
2. Remove Cloudflare tunnel configuration
3. Use Fly's built-in SSL and domain management

## 14. Security Best Practices

1. **Never commit secrets** to version control
2. **Use Fly secrets** for sensitive data
3. **Enable health checks** for monitoring
4. **Set up alerts** for downtime
5. **Regular backups** of persistent data

## 15. Performance Optimization

```bash
# Enable auto-scaling
fly scale count 2-5

# Monitor performance
fly dashboard

# Optimize memory usage
fly scale memory 1024
```

---

**Ready to deploy? Run `fly launch` to get started!**
