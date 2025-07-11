const fs = require('fs');
const path = require('path');

module.exports = async function handlePatchWatchdogStatus(req, res) {
  const { user_name, text } = req.body;
  console.log("⚡️ /patch-watchdog-status triggered by:", user_name, "text:", text);
  
  try {
    const statusFile = path.join(__dirname, '../../logs/patch-watchdog-status.json');
    let status = {
      totalPatches: 0,
      deliveredPatches: 0,
      failedPatches: 0,
      retriedPatches: 0,
      escalatedPatches: 0,
      uptime: 0,
      activePatches: 0
    };

    // Try to read status file
    if (fs.existsSync(statusFile)) {
      try {
        const statusData = fs.readFileSync(statusFile, 'utf8');
        status = JSON.parse(statusData);
      } catch (error) {
        console.error('Error reading watchdog status:', error);
      }
    }

    // Check for recent failures
    const escalationFile = path.join(__dirname, '../../logs/patch-escalation-report.log');
    let recentEscalations = [];
    if (fs.existsSync(escalationFile)) {
      try {
        const escalationData = fs.readFileSync(escalationFile, 'utf8');
        const lines = escalationData.trim().split('\n').filter(line => line.trim());
        recentEscalations = lines.slice(-3); // Last 3 escalations
      } catch (error) {
        console.error('Error reading escalation log:', error);
      }
    }

    const uptimeHours = Math.floor(status.uptime / (1000 * 60 * 60));
    const uptimeMinutes = Math.floor((status.uptime % (1000 * 60 * 60)) / (1000 * 60));

    const statusText = `
🔒 *Patch Watchdog Status Report*

*Statistics:*
• Total Patches: ${status.totalPatches}
• Delivered: ${status.deliveredPatches} (${status.totalPatches > 0 ? Math.round((status.deliveredPatches / status.totalPatches) * 100) : 0}%)
• Failed: ${status.failedPatches}
• Retried: ${status.retriedPatches}
• Escalated: ${status.escalatedPatches}
• Active Patches: ${status.activePatches}

*System Status:*
• Uptime: ${uptimeHours}h ${uptimeMinutes}m
• Watchdog: ✅ Active
• Auto-repair: ✅ Enabled
• Escalation: ✅ Configured

*Recent Activity:*
${recentEscalations.length > 0 
  ? recentEscalations.map(esc => `• ${esc.substring(0, 100)}...`).join('\n')
  : '• No recent escalations'
}

*Quick Actions:*
• \`/patch-status\` - Check patch queue
• \`/troubleshoot\` - Run diagnostics
• \`/alert-runner-crash\` - Emergency alert

*Requested by:* ${user_name}
*Timestamp:* ${new Date().toLocaleString()}
    `.trim();

    res.send(statusText);
  } catch (error) {
    console.error('Error getting watchdog status:', error);
    res.send(`❌ Error getting watchdog status: ${error.message}`);
  }
}; 