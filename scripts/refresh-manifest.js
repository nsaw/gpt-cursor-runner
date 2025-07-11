#!/usr/bin/env node

/**
 * Manifest Refresh Script
 * Updates Slack app manifest with new commands and features
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ManifestRefresher {
  constructor() {
    this.operationUuid = crypto.randomUUID();
    this.startTime = Date.now();
    this.projectRoot = process.cwd();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${this.operationUuid}] ${message}`;
    console.log(logEntry);
  }

  async refreshManifest() {
    this.log('🔄 Refreshing Slack app manifest');
        
    try {
      const manifestPath = path.join(this.projectRoot, 'slack-app-manifest-v2.yaml');
            
      if (!fs.existsSync(manifestPath)) {
        this.log('ERROR', '❌ Slack manifest not found');
        return false;
      }

      let manifestContent = fs.readFileSync(manifestPath, 'utf8');
      let updated = false;

      // Add plist-status command if not present
      if (!manifestContent.includes('plist-status')) {
        this.log('INFO', '📝 Adding plist-status command');
        const plistCommand = `  - command: /plist-status
    description: Check launchd .plist status for watchdog services
    usage_hint: "/plist-status"`;
                
        manifestContent = manifestContent.replace(
          /(commands:)/,
          `$1\n${plistCommand}`
        );
        updated = true;
      }

      // Add recovery commands if not present
      const recoveryCommands = [
        {
          command: '/recovery-status',
          description: 'Check recovery system status',
          usage_hint: '/recovery-status'
        },
        {
          command: '/repair-bridge',
          description: 'Trigger Fly repair bridge',
          usage_hint: '/repair-bridge'
        }
      ];

      recoveryCommands.forEach(cmd => {
        if (!manifestContent.includes(cmd.command)) {
          this.log('INFO', `📝 Adding ${cmd.command} command`);
          const commandBlock = `  - command: ${cmd.command}
    description: ${cmd.description}
    usage_hint: "${cmd.usage_hint}"`;
                    
          manifestContent = manifestContent.replace(
            /(commands:)/,
            `$1\n${commandBlock}`
          );
          updated = true;
        }
      });

      if (updated) {
        fs.writeFileSync(manifestPath, manifestContent);
        this.log('INFO', '✅ Manifest updated successfully');
      } else {
        this.log('INFO', '✅ Manifest already up to date');
      }

      return true;

    } catch (error) {
      this.log('ERROR', `❌ Error refreshing manifest: ${error.message}`);
      return false;
    }
  }

  async run() {
    this.log('🚀 Starting manifest refresh operation');
        
    const success = await this.refreshManifest();
        
    const endTime = Date.now();
    const duration = endTime - this.startTime;
        
    this.log(`🏁 Manifest refresh completed in ${duration}ms`);
        
    return success;
  }
}

// Main execution
if (require.main === module) {
  const refresher = new ManifestRefresher();
  refresher.run().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = ManifestRefresher; 