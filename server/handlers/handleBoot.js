const { exec } = require('child_process');
// const path = require('path'); // Unused import

module.exports = async (req, res) => {
  try {
    const bootScript = '/Users/sawyer/gitSync/tm-mobile-cursor/scripts/boot-all-systems.sh';
    
    // Check if script exists
    const fs = require('fs');
    if (!fs.existsSync(bootScript)) {
      return res.json({
        response_type: 'in_channel',
        text: `❌ Boot script not found: ${bootScript}`
      });
    }
    
    // Execute boot script
    exec(`bash ${bootScript}`, (error, stdout, stderr) => {
      if (error) {
        console.error('Boot script error:', error);
        return res.json({
          response_type: 'in_channel',
          text: `❌ Boot failed: ${error.message}\n\n**Stderr:** ${stderr}`
        });
      }
      
      console.log('Boot script output:', stdout);
      
      res.json({
        response_type: 'in_channel',
        text: `🚀 **System Boot Initiated!**\n\n**Script:** ${bootScript}\n**Status:** Executing...\n\n**Output:**\n\`\`\`${stdout}\`\`\``
      });
    });
    
  } catch (error) {
    console.error('Error in handleBoot:', error);
    res.json({
      response_type: 'in_channel',
      text: `❌ Error executing boot script: ${error.message}`
    });
  }
}; 