const stateManager = require('../utils/stateManager');

module.exports = async function handleShowRoadmap(req, res) {
  const { user_name } = req.body;
  console.log('⚡️ /show-roadmap triggered by:', user_name);
  
  try {
    const roadmap = await stateManager.getRoadmap();
    
    const roadmapText = `
🗺️ *GPT-Cursor Runner Roadmap*

*Current Phase:* ${roadmap.currentPhase}
*Next Phase:* ${roadmap.nextPhase}

*Completed Phases:*
${roadmap.completedPhases.map(phase => `✅ ${phase}`).join('\n')}

*Milestones:*
${roadmap.milestones.map(milestone => `• ${milestone}`).join('\n')}

*Timeline:*
• Phase 1: ✅ Complete (Basic Runner)
• Phase 2: 🔄 In Progress (Enhanced Automation)
• Phase 3: ⏳ Planned (Advanced Analytics)
• Phase 4: ⏳ Planned (AI-Powered Insights)

*Recent Updates:*
• Slack integration completed
• 25+ slash commands implemented
• State management system added
• Patch approval workflow established
• Real-time status monitoring active
    `.trim();

    res.send(roadmapText);
  } catch (error) {
    console.error('Error getting roadmap:', error);
    res.send(`❌ Error getting roadmap: ${error.message}`);
  }
};