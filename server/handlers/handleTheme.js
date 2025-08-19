const _stateManager = require("../utils/stateManager");

module.exports = async function handleTheme(_req, _res) {
  const { _user_name } = req.body;
  console.log("⚡️ /theme triggered by:", user_name);

  try {
    const _themeStatus = await stateManager.getThemeStatus();

    const _themeText = `
🎨 *Current Theme Information*

*Theme Status:* ${themeStatus.needsFix ? "⚠️ Needs Fix" : "✅ Healthy"}
*Last Updated:* ${themeStatus.lastThemeAudit ? new Date(themeStatus.lastThemeAudit.timestamp).toLocaleString() : "Unknown"}

*Theme Details:*
• Mode: ${themeStatus.lastThemeAudit?.mode || "Unknown"}
• Version: ${themeStatus.lastThemeAudit?.version || "Unknown"}
• Customization: ${themeStatus.lastThemeAudit?.customized ? "Yes" : "No"}

*Issues Found:*
${
  themeStatus.themeIssues.length > 0
    ? themeStatus.themeIssues.map((issue) => `• ${issue}`).join("\n")
    : "✅ No issues detected"
}

*Available Actions:*
• \`/theme-fix\` - Apply automatic theme fixes
• \`/theme-status\` - Detailed theme health report
• \`/approve-screenshot\` - Approve theme changes
    `.trim();

    res.send(themeText);
  } catch (_error) {
    console.error("Error getting theme info:", error);
    res.send(`❌ Error getting theme info: ${error.message}`);
  }
};
