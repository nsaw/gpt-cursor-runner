// const stateManager = require('../utils/stateManager'); // Unused import

module.exports = async (req, res) => {
  try {
    const roadmap = `
🗺️ **GPT-Cursor Runner Roadmap**

**Phase 1: Core Infrastructure (✅ Complete)**
• Slack integration and command system
• Patch management and approval workflow
• Basic runner control and monitoring
• Health checks and status reporting

**Phase 2: Advanced Features (🔄 In Progress)**
• Enhanced AI integration with context awareness
• Automated troubleshooting and diagnostics
• Phase-based workflow management
• Screenshot-based patch approval

**Phase 3: Optimization (📋 Planned)**
• Performance optimization and scaling
• Advanced monitoring and alerting
• Machine learning integration
• Predictive maintenance

**Phase 4: Expansion (📋 Future)**
• Multi-project support
• Advanced analytics and reporting
• Integration with additional tools
• Enterprise features

**Current Focus:**
• Stabilizing core functionality
• Improving user experience
• Adding advanced workflow controls
• Enhancing system reliability

**Next Milestones:**
• Complete Phase 2 features
• Performance optimization
• Enhanced monitoring
• User feedback integration
    `.trim();

    res.json({
      response_type: 'in_channel',
      text: roadmap
    });
    
  } catch (error) {
    console.error('Error in handleRoadmap:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error displaying roadmap: ${error.message}`
    });
  }
};