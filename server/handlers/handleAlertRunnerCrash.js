const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const { text } = req.body;
    const crashDetails = text || 'Manual crash alert triggered';
    const timestamp = new Date().toISOString();
    const user = req.body.user_name || 'Unknown';
    
    // Send crash alert to Slack via webhook
    const webhookUrl = process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/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';
    const channel = process.env.SLACK_CHANNEL || '#runner-control';
    const username = process.env.SLACK_USERNAME || 'GPT-Cursor Runner';
    
    if (webhookUrl) {
      try {
        const webhookPayload = {
          text: `🚨 **CRASH ALERT**\n\n**Triggered by:** ${user}\n**Details:** ${crashDetails}\n**Timestamp:** ${new Date().toLocaleString()}\n\n**Status:** Runner crash detected\n**Action Required:** Immediate attention needed`,
          channel,
          username,
          icon_emoji: ':warning:'
        };
        
        await axios.post(webhookUrl, webhookPayload, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log('✅ Crash alert sent via webhook');
      } catch (error) {
        console.error('Error sending crash alert to Slack webhook:', error);
      }
    }
    
    // Log crash alert
    const crashLog = {
      timestamp,
      user,
      details: crashDetails,
      type: 'manual_alert'
    };
    
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, '../../logs/crash_alerts.json');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(logFile);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Read existing logs
    let crashLogs = [];
    if (fs.existsSync(logFile)) {
      try {
        crashLogs = JSON.parse(fs.readFileSync(logFile, 'utf8'));
      } catch (error) {
        console.error('Error reading crash logs:', error);
      }
    }
    
    // Add new crash log
    crashLogs.push(crashLog);
    
    // Keep only last 100 entries
    if (crashLogs.length > 100) {
      crashLogs = crashLogs.slice(-100);
    }
    
    fs.writeFileSync(logFile, JSON.stringify(crashLogs, null, 2));
    
    res.json({
      response_type: 'in_channel',
      text: `🚨 **Crash Alert Sent!**\n\n**Triggered by:** ${user}\n**Details:** ${crashDetails}\n**Timestamp:** ${new Date().toLocaleString()}\n\n**Status:** Alert has been logged and sent to channel\n**Log File:** crash_alerts.json\n**Webhook:** ${webhookUrl ? '✅ Connected' : '❌ Not configured'}`
    });
    
  } catch (error) {
    console.error('Error in handleAlertRunnerCrash:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error sending crash alert: ${error.message}`
    });
  }
};