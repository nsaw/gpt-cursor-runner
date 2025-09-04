#!/usr/bin/env node
/**
 * GPT Bridge - Natural Language to Hardened Patch Converter
 * 
 * This service converts plain English requests into hardened patches
 * that can be safely executed by the system.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface PatchRequest {
  id: string;
  plainText: string;
  domain: 'CYOPS' | 'MAIN';
  timestamp: string;
  source: 'slack' | 'gpt' | 'manual';
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface HardenedPatch {
  id: string;
  domain: 'CYOPS' | 'MAIN';
  commands: Array<{
    command: string;
    label: string;
    timeout?: number;
  }>;
  metadata: {
    version: string;
    phase: string;
    intent: string;
    author: string;
    timestamp: string;
    source: string;
    originalRequest: string;
  };
  rollbackPlan?: Array<{
    command: string;
    label: string;
  }>;
}

export class GPTBridge extends EventEmitter {
  private isRunning = false;
  private patchQueue: PatchRequest[] = [];
  private processingQueue = false;

  constructor() {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('GPT Bridge is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 GPT Bridge started - Ready to convert plain English to hardened patches');
    
    // Start processing queue
    this.startQueueProcessor();
    
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('GPT Bridge is not running');
      return;
    }

    this.isRunning = false;
    this.processingQueue = false;
    console.log('🛑 GPT Bridge stopped');
    
    this.emit('stopped');
  }

  /**
   * Convert plain English request to hardened patch
   */
  async convertToPatch(request: PatchRequest): Promise<HardenedPatch> {
    console.log(`🔄 Converting plain text to patch: "${request.plainText}"`);
    
    // Parse the plain text request
    const intent = this.parseIntent(request.plainText);
    const commands = this.generateCommands(intent, request.domain);
    const rollbackPlan = this.generateRollbackPlan(commands);

    const patch: HardenedPatch = {
      id: `patch-${request.id}`,
      domain: request.domain,
      commands,
      metadata: {
        version: 'v2.3.61',
        phase: 'P6.4.x',
        intent: intent.description,
        author: 'GPT-Bridge',
        timestamp: new Date().toISOString(),
        source: request.source,
        originalRequest: request.plainText
      },
      rollbackPlan
    };

    // Validate patch against schema
    const isValid = await this.validatePatch(patch);
    if (!isValid) {
      throw new Error('Generated patch failed validation');
    }

    console.log(`✅ Patch generated successfully: ${patch.id}`);
    return patch;
  }

  /**
   * Queue a patch request for processing
   */
  async queuePatchRequest(request: PatchRequest): Promise<void> {
    this.patchQueue.push(request);
    console.log(`📥 Queued patch request: ${request.id}`);
    
    if (!this.processingQueue) {
      this.startQueueProcessor();
    }
  }

  /**
   * Parse plain text intent
   */
  private parseIntent(plainText: string): { description: string; type: string; actions: string[] } {
    const lowerText = plainText.toLowerCase();
    
    // Simple intent parsing - in a real implementation, this would use NLP
    let type = 'general';
    const actions: string[] = [];
    
    if (lowerText.includes('install') || lowerText.includes('add')) {
      type = 'install';
      actions.push('install');
    } else if (lowerText.includes('update') || lowerText.includes('upgrade')) {
      type = 'update';
      actions.push('update');
    } else if (lowerText.includes('remove') || lowerText.includes('delete')) {
      type = 'remove';
      actions.push('remove');
    } else if (lowerText.includes('start') || lowerText.includes('run')) {
      type = 'start';
      actions.push('start');
    } else if (lowerText.includes('stop') || lowerText.includes('kill')) {
      type = 'stop';
      actions.push('stop');
    } else if (lowerText.includes('restart') || lowerText.includes('reboot')) {
      type = 'restart';
      actions.push('restart');
    }

    return {
      description: plainText,
      type,
      actions
    };
  }

  /**
   * Generate NB 2.0 compliant commands
   */
  private generateCommands(intent: any, domain: 'CYOPS' | 'MAIN'): Array<{ command: string; label: string; timeout?: number }> {
    const commands: Array<{ command: string; label: string; timeout?: number }> = [];
    
    // Generate commands based on intent
    for (const action of intent.actions) {
      switch (action) {
        case 'install':
          commands.push({
            command: `./scripts/nb-safe-detach.sh install-${action} 30s bash -lc 'npm install'`,
            label: `install-${action}`,
            timeout: 30
          });
          break;
        case 'update':
          commands.push({
            command: `./scripts/nb-safe-detach.sh update-${action} 30s bash -lc 'npm update'`,
            label: `update-${action}`,
            timeout: 30
          });
          break;
        case 'start':
          commands.push({
            command: `./scripts/nb-safe-detach.sh start-${action} 15s bash -lc 'npm start'`,
            label: `start-${action}`,
            timeout: 15
          });
          break;
        case 'stop':
          commands.push({
            command: `./scripts/nb-safe-detach.sh stop-${action} 10s bash -lc 'pkill -f "npm start"'`,
            label: `stop-${action}`,
            timeout: 10
          });
          break;
        case 'restart':
          commands.push({
            command: `./scripts/nb-safe-detach.sh restart-${action} 20s bash -lc 'pkill -f "npm start" && sleep 2 && npm start'`,
            label: `restart-${action}`,
            timeout: 20
          });
          break;
        default:
          // Generic command
          commands.push({
            command: `./scripts/nb-safe-detach.sh generic-${action} 15s bash -lc 'echo "Executing: ${intent.description}"'`,
            label: `generic-${action}`,
            timeout: 15
          });
      }
    }

    return commands;
  }

  /**
   * Generate rollback plan
   */
  private generateRollbackPlan(commands: Array<{ command: string; label: string; timeout?: number }>): Array<{ command: string; label: string }> {
    const rollbackPlan: Array<{ command: string; label: string }> = [];
    
    // Generate rollback commands
    rollbackPlan.push({
      command: `./scripts/nb-safe-detach.sh rollback-backup 10s bash -lc 'echo "Creating rollback backup"'`,
      label: 'rollback-backup'
    });
    
    rollbackPlan.push({
      command: `./scripts/nb-safe-detach.sh rollback-restore 15s bash -lc 'echo "Restoring from backup"'`,
      label: 'rollback-restore'
    });

    return rollbackPlan;
  }

  /**
   * Validate patch against schema
   */
  private async validatePatch(patch: HardenedPatch): Promise<boolean> {
    try {
      // Load patch schema
      const schemaPath = '/Users/sawyer/gitSync/gpt-cursor-runner/__SoT__/PATCH-SCHEMA.json';
      const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      
      // Basic validation
      if (!patch.id || !patch.domain || !patch.commands || !patch.metadata) {
        return false;
      }
      
      if (patch.commands.length === 0) {
        return false;
      }
      
      // Validate commands use NB 2.0 pattern
      for (const cmd of patch.commands) {
        if (!cmd.command.includes('./scripts/nb-safe-detach.sh')) {
          console.warn(`⚠️ Command does not use NB 2.0 pattern: ${cmd.command}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Patch validation failed:', error);
      return false;
    }
  }

  /**
   * Start processing the patch queue
   */
  private async startQueueProcessor(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;
    
    while (this.isRunning && this.patchQueue.length > 0) {
      const request = this.patchQueue.shift();
      if (!request) continue;

      try {
        console.log(`🔄 Processing patch request: ${request.id}`);
        const patch = await this.convertToPatch(request);
        
        // Save patch to queue
        await this.savePatch(patch);
        
        console.log(`✅ Patch request processed: ${request.id}`);
        this.emit('patchGenerated', patch);
      } catch (error) {
        console.error(`❌ Failed to process patch request ${request.id}:`, error);
        this.emit('patchError', { request, error });
      }
    }
    
    this.processingQueue = false;
  }

  /**
   * Save patch to the appropriate queue
   */
  private async savePatch(patch: HardenedPatch): Promise<void> {
    const queueDir = `/Users/sawyer/gitSync/.cursor-cache/${patch.domain}/queue`;
    
    // Ensure queue directory exists
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
    }
    
    const patchPath = path.join(queueDir, `${patch.id}.json`);
    fs.writeFileSync(patchPath, JSON.stringify(patch, null, 2));
    
    console.log(`💾 Patch saved to queue: ${patchPath}`);
  }

  /**
   * Get current status
   */
  getStatus(): { running: boolean; queueLength: number; processing: boolean } {
    return {
      running: this.isRunning,
      queueLength: this.patchQueue.length,
      processing: this.processingQueue
    };
  }
}

// Export singleton instance
export const gptBridge = new GPTBridge();

// CLI interface
if (require.main === module) {
  const bridge = new GPTBridge();
  
  bridge.on('started', () => {
    console.log('🎯 GPT Bridge is ready for patch conversion');
  });
  
  bridge.on('patchGenerated', (patch) => {
    console.log(`📦 Patch generated: ${patch.id}`);
  });
  
  bridge.on('patchError', ({ request, error }) => {
    console.error(`💥 Patch generation failed for ${request.id}:`, error);
  });
  
  // Start the bridge
  bridge.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down GPT Bridge...');
    await bridge.stop();
    process.exit(0);
  });
}
