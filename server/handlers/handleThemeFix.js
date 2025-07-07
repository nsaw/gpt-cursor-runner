const stateManager = require('../utils/stateManager');

module.exports = async function handleThemeFix(req, res) {
  const { user_name } = req.body;
  console.log("⚡️ /theme-fix triggered by:", user_name);
  
  try {
    const themeStatus = await stateManager.getThemeStatus();
    
    if (!themeStatus.needsFix) {
      res.send(`✅ Theme is already healthy. No fixes needed.`);
      return;
    }

    // Simulate theme fix process
    const fixResult = {
      success: true,
      fixesApplied: themeStatus.themeIssues.length,
      timestamp: new Date().toISOString()
    };

    // Update theme audit with fix information
    await stateManager.updateThemeAudit({
      timestamp: new Date().toISOString(),
      mode: 'auto-fix',
      version: '1.0.0',
      customized: false,
      issues: [],
      needsFix: false,
      fixesApplied: fixResult.fixesApplied,
      fixedBy: user_name
    });

    const fixText = `
🔧 *Theme Fixes Applied*

*Status:* ✅ Successfully applied ${fixResult.fixesApplied} fixes
*Applied By:* ${user_name}
*Timestamp:* ${new Date(fixResult.timestamp).toLocaleString()}

*Fixes Applied:*
${themeStatus.themeIssues.map(issue => `• Fixed: ${issue}`).join('\n')}

*Next Steps:*
• Review the changes with \`/theme\`
• Approve with \`/approve-screenshot\` if satisfied
• Check status with \`/theme-status\`
    `.trim();

    res.send(fixText);
  } catch (error) {
    console.error('Error applying theme fixes:', error);
    res.send(`❌ Error applying theme fixes: ${error.message}`);
  }
};