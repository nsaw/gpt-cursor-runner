#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

class SlackCommandHandler {
  constructor(token) {
    this.token = token;
    this.CYOPS_QUEUE = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/queue';
    this.MAIN_QUEUE = '/Users/sawyer/gitSync/.cursor-cache/MAIN/queue';
    this.CYOPS_REPORTS = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/reports';
    this.MAIN_REPORTS = '/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/reports';
    
    this.ensureDirectories();
  }

  ensureDirectories() {
    [this.CYOPS_QUEUE, this.MAIN_QUEUE, this.CYOPS_REPORTS, this.MAIN_REPORTS].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  generatePatchId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `slack-${timestamp}-${random}`;
  }

  determineDomain(channel, user) {
    // Simple domain determination logic
    // In production, this could be more sophisticated
    if (channel.includes('cyops') || channel.includes('dev') || channel.includes('automation')) {
      return 'CYOPS';
    }
    return 'MAIN';
  }

  createHardenedPatch(plainText, channel, user, command) {
    const patchId = this.generatePatchId();
    const domain = this.determineDomain(channel, user);
    
    return {
      blockId: patchId,
      description: plainText,
      target: 'DEV',
      version: 'v2.3.58',
      timestamp: new Date().toISOString(),
      domain: domain,
      source: 'slack',
      channel: channel,
      user: user,
      command: command,
      mutations: [
        {
          description: `Process ${command} request: ${plainText}`,
          type: 'slack_command',
          data: {
            text: plainText,
            channel: channel,
            user: user,
            command: command
          }
        }
      ]
    };
  }

  writePatchToQueue(patch) {
    const queueDir = patch.domain === 'CYOPS' ? this.CYOPS_QUEUE : this.MAIN_QUEUE;
    const fileName = `${patch.blockId}.json`;
    const filePath = path.join(queueDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(patch, null, 2));
    
    return filePath;
  }

  updateIngressStatus(patch, success) {
    const statusFile = '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/ingress.json';
    const status = {
      timestamp: new Date().toISOString(),
      lastIngest: {
        patchId: patch.blockId,
        domain: patch.domain,
        source: patch.source,
        channel: patch.channel,
        user: patch.user,
        success: success,
        timestamp: patch.timestamp
      },
      stats: {
        totalIngested: 0, // Would be incremented in production
        successful: 0,
        failed: 0
      }
    };
    
    try {
      fs.writeFileSync(statusFile, JSON.stringify(status, null, 2));
    } catch (err) {
      console.error('Failed to update ingress status:', err);
    }
  }

  async handlePatchNew(text, channel, user) {
    try {
      if (!text || text.trim().length === 0) {
        return '❌ Please provide a description for the patch. Usage: `/patch new <description>`';
      }

      const patch = this.createHardenedPatch(text, channel, user, 'patch new');
      const filePath = this.writePatchToQueue(patch);
      this.updateIngressStatus(patch, true);

      return `✅ Patch created and queued for execution!\n\n**Patch ID**: ${patch.blockId}\n**Domain**: ${patch.domain}\n**Description**: ${patch.description}\n**Queue Location**: ${filePath}`;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return `❌ Failed to create patch: ${errorMessage}`;
    }
  }

  async handleAsk(text, channel, user) {
    try {
      if (!text || text.trim().length === 0) {
        return '❌ Please provide a question or request. Usage: `/ask <question>`';
      }

      const patch = this.createHardenedPatch(text, channel, user, 'ask');
      const filePath = this.writePatchToQueue(patch);
      this.updateIngressStatus(patch, true);

      return `✅ Question/request queued for processing!\n\n**Request ID**: ${patch.blockId}\n**Domain**: ${patch.domain}\n**Question**: ${patch.description}\n**Queue Location**: ${filePath}`;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return `❌ Failed to queue question: ${errorMessage}`;
    }
  }

  async handleHelp() {
    return `🤖 **GPT Cursor Runner - Slack Commands**

**Available Commands:**
• \`/patch new <description>\` - Create a new patch for execution
• \`/ask <question>\` - Ask a question or make a request
• \`/help\` - Show this help message

**Examples:**
• \`/patch new Add user authentication to login page\`
• \`/ask What is the current status of the deployment?\`

**How it works:**
1. Your command is converted to a hardened patch
2. The patch is validated and queued for execution
3. The live executor processes the patch
4. Results are available in the system dashboard

**Domains:**
• **CYOPS**: Development and automation patches
• **MAIN**: Production and user-facing patches

Need more help? Check the documentation or contact the dev team.`;
  }
}

module.exports = { SlackCommandHandler };
