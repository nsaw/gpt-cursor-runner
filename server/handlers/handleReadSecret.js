const stateManager = require('../utils/stateManager');

module.exports = async function handleReadSecret(req, res) {
  const { user_name, text } = req.body;
  console.log('⚡️ /read-secret triggered by:', user_name, 'text:', text);
  
  try {
    // Check if user is authorized to read secrets
    const authorizedUsers = ['gpt', 'nick', 'sawyer', 'admin'];
    if (!authorizedUsers.includes(user_name.toLowerCase())) {
      return res.send('❌ Access denied. Only authorized users can read secrets.');
    }
    
    // Parse the secret name from the command text
    const secretName = text.trim();
    if (!secretName) {
      return res.send('❌ Please specify a secret name. Usage: /read-secret <secret_name>');
    }
    
    // Define available secrets
    const availableSecrets = {
      'slack_token': process.env.SLACK_BOT_TOKEN ? '***REDACTED***' : 'Not set',
      'slack_signing_secret': process.env.SLACK_SIGNING_SECRET ? '***REDACTED***' : 'Not set',
      'webhook_url': process.env.WEBHOOK_URL || 'Not set',
      'dashboard_url': process.env.DASHBOARD_URL || 'Not set',
      'public_url': process.env.PUBLIC_URL || 'Not set',
      'runner_dev_url': process.env.RUNNER_DEV_URL || 'Not set',
      'endpoint_dev_url': process.env.ENDPOINT_DEV_URL || 'Not set',
      'node_env': process.env.NODE_ENV || 'Not set',
      'fly_app': process.env.FLY_APP || 'Not set',
      'fly_region': process.env.FLY_REGION || 'Not set'
    };
    
    if (!availableSecrets.hasOwnProperty(secretName)) {
      const validSecrets = Object.keys(availableSecrets).join(', ');
      return res.send(`❌ Invalid secret name. Available secrets: ${validSecrets}`);
    }
    
    const secretValue = availableSecrets[secretName];
    const statusText = `
🔐 *Secret Read Report*

*Secret:* \`${secretName}\`
*Value:* \`${secretValue}\`
*Status:* ${secretValue === 'Not set' ? '❌ Not configured' : '✅ Configured'}

*Security Info:*
• Requested by: ${user_name}
• Timestamp: ${new Date().toLocaleString()}
• Environment: ${process.env.NODE_ENV || 'development'}

*Available Secrets:*
• slack_token, slack_signing_secret
• webhook_url, dashboard_url, public_url
• runner_dev_url, endpoint_dev_url
• node_env, fly_app, fly_region
    `.trim();

    res.send(statusText);
  } catch (error) {
    console.error('Error reading secret:', error);
    res.send(`❌ Error reading secret: ${error.message}`);
  }
}; 