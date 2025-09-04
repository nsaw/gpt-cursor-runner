#!/usr/bin/env node
/**
 * Slack GPT Bridge - Slack Integration for Natural Language Patch Generation
 * 
 * This service handles Slack commands and routes them to the GPT bridge
 * for natural language to patch conversion.
 */

import { EventEmitter } from 'events';
import { gptBridge } from './gptBridge';
import { nl2PatchService } from './nl2PatchService';

interface SlackCommand {
  command: string;
  text: string;
  user_id: string;
  channel_id: string;
  team_id: string;
  timestamp: string;
}

interface SlackResponse {
  response_type: 'in_channel' | 'ephemeral';
  text: string;
  attachments?: Array<{
    color: string;
    title: string;
    text: string;
    fields?: Array<{
      title: string;
      value: string;
      short?: boolean;
    }>;
  }>;
}

export class SlackGPTBridge extends EventEmitter {
  private isRunning = false;

  constructor() {
    super();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Slack GPT Bridge is already running');
      return;
    }

    this.isRunning = true;
    console.log('💬 Slack GPT Bridge started - Ready for /ask commands');
    
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Slack GPT Bridge is not running');
      return;
    }

    this.isRunning = false;
    console.log('🛑 Slack GPT Bridge stopped');
    
    this.emit('stopped');
  }

  /**
   * Handle Slack /ask command
   */
  async handleAskCommand(command: SlackCommand): Promise<SlackResponse> {
    console.log(`💬 Processing /ask command: "${command.text}"`);
    
    try {
      // Determine domain based on channel or context
      const domain = this.determineDomain(command);
      
      // Create patch request
      const patchRequest = {
        id: `slack-${command.timestamp}`,
        plainText: command.text,
        domain,
        timestamp: new Date().toISOString(),
        source: 'slack' as const,
        priority: this.determinePriority(command.text)
      };

      // Convert to patch using NL2Patch service
      const patch = await nl2PatchService.convertToPatch({
        id: patchRequest.id,
        text: command.text,
        context: {
          domain,
          user: command.user_id,
          channel: command.channel_id,
          timestamp: command.timestamp
        },
        priority: patchRequest.priority
      });

      // Queue patch for execution
      await gptBridge.queuePatchRequest(patchRequest);

      // Return success response
      return {
        response_type: 'in_channel',
        text: `✅ Patch generated successfully!`,
        attachments: [
          {
            color: 'good',
            title: 'Patch Details',
            text: `Patch ID: \`${patch.id}\`\nDomain: \`${patch.domain}\`\nIntent: ${patch.metadata.intent}`,
            fields: [
              {
                title: 'Commands',
                value: patch.commands.map(cmd => `• ${cmd.label}`).join('\n'),
                short: false
              },
              {
                title: 'Status',
                value: 'Queued for execution',
                short: true
              },
              {
                title: 'Priority',
                value: patchRequest.priority,
                short: true
              }
            ]
          }
        ]
      };

    } catch (error) {
      console.error('❌ Failed to process /ask command:', error);
      
      return {
        response_type: 'ephemeral',
        text: `❌ Failed to generate patch: ${error instanceof Error ? error.message : String(error)}`,
        attachments: [
          {
            color: 'danger',
            title: 'Error Details',
            text: `Request: "${command.text}"\nError: ${error instanceof Error ? error.message : String(error)}`,
            fields: [
              {
                title: 'Suggestion',
                value: 'Try rephrasing your request or check the available commands',
                short: false
              }
            ]
          }
        ]
      };
    }
  }

  /**
   * Handle Slack /patch command
   */
  async handlePatchCommand(command: SlackCommand): Promise<SlackResponse> {
    console.log(`🔧 Processing /patch command: "${command.text}"`);
    
    try {
      // Parse patch command (e.g., "/patch new install express")
      const parts = command.text.split(' ');
      const action = parts[0];
      
      if (action === 'new') {
        const patchText = parts.slice(1).join(' ');
        return this.handleAskCommand({
          ...command,
          text: patchText
        });
      } else if (action === 'status') {
        return this.handleStatusCommand(command);
      } else if (action === 'list') {
        return this.handleListCommand(command);
      } else {
        throw new Error(`Unknown patch action: ${action}`);
      }
    } catch (error) {
      return {
        response_type: 'ephemeral',
        text: `❌ Patch command failed: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Handle status command
   */
  private async handleStatusCommand(command: SlackCommand): Promise<SlackResponse> {
    const gptStatus = gptBridge.getStatus();
    const nl2Status = nl2PatchService.getStatus();
    
    return {
      response_type: 'in_channel',
      text: '📊 System Status',
      attachments: [
        {
          color: gptStatus.running ? 'good' : 'danger',
          title: 'GPT Bridge',
          text: `Status: ${gptStatus.running ? 'Running' : 'Stopped'}\nQueue: ${gptStatus.queueLength} items\nProcessing: ${gptStatus.processing ? 'Yes' : 'No'}`
        },
        {
          color: nl2Status.running ? 'good' : 'danger',
          title: 'NL2Patch Service',
          text: `Status: ${nl2Status.running ? 'Running' : 'Stopped'}\nTemplates: ${nl2Status.templateCount}`
        }
      ]
    };
  }

  /**
   * Handle list command
   */
  private async handleListCommand(command: SlackCommand): Promise<SlackResponse> {
    const templates = nl2PatchService.getTemplates();
    
    return {
      response_type: 'in_channel',
      text: '📚 Available Patch Templates',
      attachments: [
        {
          color: 'good',
          title: 'Templates',
          text: templates.map(t => `• **${t.name}**: ${t.description}`).join('\n'),
          fields: [
            {
              title: 'Usage',
              value: 'Use `/ask <your request>` to generate a patch',
              short: false
            }
          ]
        }
      ]
    };
  }

  /**
   * Determine domain from Slack context
   */
  private determineDomain(command: SlackCommand): 'CYOPS' | 'MAIN' {
    // Simple domain determination based on channel or user
    // In a real implementation, this would be more sophisticated
    
    if (command.channel_id.includes('main') || command.channel_id.includes('production')) {
      return 'MAIN';
    }
    
    // Default to CYOPS for development/testing
    return 'CYOPS';
  }

  /**
   * Determine priority from text content
   */
  private determinePriority(text: string): 'low' | 'medium' | 'high' | 'critical' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('urgent') || lowerText.includes('critical') || lowerText.includes('emergency')) {
      return 'critical';
    } else if (lowerText.includes('important') || lowerText.includes('asap')) {
      return 'high';
    } else if (lowerText.includes('when possible') || lowerText.includes('low priority')) {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * Get service status
   */
  getStatus(): { running: boolean } {
    return {
      running: this.isRunning
    };
  }
}

// Export singleton instance
export const slackGPTBridge = new SlackGPTBridge();

// CLI interface
if (require.main === module) {
  const bridge = new SlackGPTBridge();
  
  bridge.on('started', () => {
    console.log('🎯 Slack GPT Bridge is ready for /ask commands');
  });
  
  // Start the bridge
  bridge.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Slack GPT Bridge...');
    await bridge.stop();
    process.exit(0);
  });
}
