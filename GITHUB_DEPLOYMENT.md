# GitHub Deployment Guide for Slack App

## Overview

This guide shows you how to deploy your Slack app using GitHub's infrastructure and various hosting options.

## Option 1: GitHub Actions + ngrok (Recommended for Development)

### Setup Steps:

1. **Add GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add these secrets:
     - `SLACK_APP_TOKEN`: Your Slack app token
     - `SLACK_BOT_TOKEN`: Your Slack bot token  
     - `SLACK_SIGNING_SECRET`: Your Slack signing secret
     - `SLACK_APP_ID`: Your Slack app ID
     - `NGROK_AUTH_TOKEN`: Your ngrok auth token

2. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add GitHub Actions workflow"
   git push origin main
   ```

3. **Monitor the Workflow**:
   - Go to Actions tab in your repository
   - The workflow will start automatically
   - Check the logs for the ngrok URL

4. **Update Slack App**:
   - Copy the ngrok URL from the workflow logs
   - Update your Slack app settings with the new URL

## Option 2: GitHub Webhook Handler

### Setup Steps:

1. **Add GitHub Secrets**:
   - `SLACK_APP_TOKEN`
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `GITHUB_WEBHOOK_SECRET` (generate a random string)

2. **Deploy to Cloud Platform**:
   - Railway: `railway up`
   - Heroku: `heroku create && git push heroku main`
   - Vercel: `vercel --prod`

3. **Configure GitHub Webhooks**:
   - Go to repository → Settings → Webhooks
   - Add webhook URL: `https://your-app.railway.app/github/webhook`
   - Select events: Push, Pull Request, Issues
   - Add secret: `GITHUB_WEBHOOK_SECRET`

4. **Update Slack App**:
   - Request URL: `https://your-app.railway.app/slack/commands`
   - Interactive Components: `https://your-app.railway.app/slack/webhook`
   - Event Subscriptions: `https://your-app.railway.app/slack/webhook`

## Option 3: GitHub Pages (Static Dashboard)

### Setup Steps:

1. **Enable GitHub Pages**:
   - Go to repository → Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages`

2. **Push to Trigger Deployment**:
   ```bash
   git push origin main
   ```

3. **Access Dashboard**:
   - URL: `https://your-username.github.io/gpt-cursor-runner/`

## Environment Variables

Create a `.env` file or add to GitHub Secrets:

```env
SLACK_APP_TOKEN=xapp-1-...
SLACK_BOT_TOKEN=xoxb-...
SLACK_SIGNING_SECRET=...
SLACK_APP_ID=A09469H0C2K
GITHUB_WEBHOOK_SECRET=your-secret-here
NODE_ENV=production
PORT=3000
```

## Testing

1. **Test Health Endpoint**:
   ```bash
   curl https://your-app-url/health
   ```

2. **Test Slack Commands**:
   - Try `/status-runner` in your Slack workspace
   - Check the webhook logs

3. **Test GitHub Webhooks**:
   - Make a commit to trigger a webhook
   - Check the logs for webhook events

## Troubleshooting

### Common Issues:

1. **ngrok URL Changes**: The URL changes each time the workflow runs
   - Solution: Use a custom domain or static hosting

2. **GitHub Actions Timeout**: Workflows have time limits
   - Solution: Use a persistent hosting service

3. **Webhook Verification Fails**:
   - Check the webhook secret matches
   - Verify the signature calculation

4. **Slack App Not Responding**:
   - Check the webhook URLs are correct
   - Verify the app is installed in your workspace

## Next Steps

1. **Choose a Hosting Option**:
   - Development: GitHub Actions + ngrok
   - Production: Railway, Heroku, or Vercel

2. **Set Up Monitoring**:
   - Add logging to track webhook events
   - Set up alerts for failures

3. **Scale Up**:
   - Add more Slack commands
   - Integrate with other GitHub events
   - Add database for persistent data

## Security Notes

- Never commit secrets to the repository
- Use GitHub Secrets for sensitive data
- Verify webhook signatures
- Use HTTPS for all endpoints
- Rotate secrets regularly 