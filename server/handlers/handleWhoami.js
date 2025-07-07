module.exports = async function handleWhoami(req, res) {
  const { user_name, user_id, team_id } = req.body;
  console.log("⚡️ /whoami triggered by:", user_name);
  
  try {
    const whoamiText = `
👤 *User Information*

*Name:* ${user_name}
*User ID:* \`${user_id}\`
*Team ID:* \`${team_id}\`
*Timestamp:* ${new Date().toLocaleString()}

*Permissions:*
• Slack Commands: ✅ Enabled
• Runner Control: ✅ Enabled
• Patch Management: ✅ Enabled
• Theme Management: ✅ Enabled

*Available Commands:*
• Status: \`/status\`
• Dashboard: \`/dashboard\`
• Roadmap: \`/roadmap\`
• Runner Controls: \`/pause-runner\`, \`/continue-runner\`, etc.
• Patch Management: \`/patch-approve\`, \`/patch-revert\`, etc.
    `.trim();

    res.send(whoamiText);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.send(`❌ Error getting user info: ${error.message}`);
  }
};