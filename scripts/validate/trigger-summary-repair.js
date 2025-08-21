const fs = require('fs').promises;
const path = require('path');

class SummaryRepairTrigger {
  constructor() {
    this.summaryDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries';
  }

  async triggerRepair() {
    try {
      // Check if summary directory exists
      await fs.access(this.summaryDir);

      // Create a trigger file
      const triggerFile = path.join(this.summaryDir, '.repair-trigger');
      await fs.writeFile(triggerFile, new Date().toISOString());

      console.log('Summary repair triggered');
      return { success: true };
    } catch (error) {
      console.error('Failed to trigger summary repair:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SummaryRepairTrigger;
