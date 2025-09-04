#!/usr/bin/env node
/**
 * NL2Patch Service - Natural Language to Patch Conversion Engine
 * 
 * This service provides the core functionality for converting natural language
 * requests into executable, hardened patches.
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

interface NLRequest {
  id: string;
  text: string;
  context?: {
    domain: 'CYOPS' | 'MAIN';
    user: string;
    channel?: string;
    timestamp: string;
  };
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface PatchTemplate {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  commands: Array<{
    command: string;
    label: string;
    condition?: string;
  }>;
  rollback?: Array<{
    command: string;
    label: string;
  }>;
}

export class NL2PatchService extends EventEmitter {
  private templates: PatchTemplate[] = [];
  private isRunning = false;

  constructor() {
    super();
    this.loadTemplates();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('NL2Patch Service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🧠 NL2Patch Service started - Ready for natural language processing');
    
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('NL2Patch Service is not running');
      return;
    }

    this.isRunning = false;
    console.log('🛑 NL2Patch Service stopped');
    
    this.emit('stopped');
  }

  /**
   * Convert natural language to patch
   */
  async convertToPatch(request: NLRequest): Promise<any> {
    console.log(`🔄 Processing NL request: "${request.text}"`);
    
    // Find matching template
    const template = this.findMatchingTemplate(request.text);
    if (!template) {
      throw new Error(`No template found for request: "${request.text}"`);
    }

    // Generate patch from template
    const patch = this.generatePatchFromTemplate(template, request);
    
    console.log(`✅ Patch generated from template: ${template.name}`);
    return patch;
  }

  /**
   * Load patch templates
   */
  private loadTemplates(): void {
    this.templates = [
      {
        id: 'install-package',
        name: 'Install Package',
        description: 'Install a new package or dependency',
        pattern: /install|add|get\s+(\w+)/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh install-package 30s bash -lc 'npm install {package}'`,
            label: 'install-package',
            condition: 'package'
          }
        ],
        rollback: [
          {
            command: `./scripts/nb-safe-detach.sh rollback-install 15s bash -lc 'npm uninstall {package}'`,
            label: 'rollback-install'
          }
        ]
      },
      {
        id: 'start-service',
        name: 'Start Service',
        description: 'Start a service or application',
        pattern: /start|run|launch\s+(\w+)/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh start-service 15s bash -lc 'npm start'`,
            label: 'start-service'
          }
        ],
        rollback: [
          {
            command: `./scripts/nb-safe-detach.sh stop-service 10s bash -lc 'pkill -f "npm start"'`,
            label: 'stop-service'
          }
        ]
      },
      {
        id: 'stop-service',
        name: 'Stop Service',
        description: 'Stop a running service',
        pattern: /stop|kill|halt\s+(\w+)/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh stop-service 10s bash -lc 'pkill -f "npm start"'`,
            label: 'stop-service'
          }
        ]
      },
      {
        id: 'restart-service',
        name: 'Restart Service',
        description: 'Restart a service',
        pattern: /restart|reboot|reload\s+(\w+)/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh restart-service 20s bash -lc 'pkill -f "npm start" && sleep 2 && npm start'`,
            label: 'restart-service'
          }
        ]
      },
      {
        id: 'update-dependencies',
        name: 'Update Dependencies',
        description: 'Update project dependencies',
        pattern: /update|upgrade|bump\s+dependencies?/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh update-deps 30s bash -lc 'npm update'`,
            label: 'update-dependencies'
          }
        ],
        rollback: [
          {
            command: `./scripts/nb-safe-detach.sh rollback-update 15s bash -lc 'npm install'`,
            label: 'rollback-update'
          }
        ]
      },
      {
        id: 'run-tests',
        name: 'Run Tests',
        description: 'Execute test suite',
        pattern: /test|run\s+tests?/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh run-tests 60s bash -lc 'npm test'`,
            label: 'run-tests'
          }
        ]
      },
      {
        id: 'build-project',
        name: 'Build Project',
        description: 'Build the project',
        pattern: /build|compile|make/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh build-project 45s bash -lc 'npm run build'`,
            label: 'build-project'
          }
        ]
      },
      {
        id: 'deploy',
        name: 'Deploy',
        description: 'Deploy the application',
        pattern: /deploy|publish|release/i,
        commands: [
          {
            command: `./scripts/nb-safe-detach.sh deploy 30s bash -lc 'npm run deploy'`,
            label: 'deploy'
          }
        ],
        rollback: [
          {
            command: `./scripts/nb-safe-detach.sh rollback-deploy 20s bash -lc 'npm run rollback'`,
            label: 'rollback-deploy'
          }
        ]
      }
    ];

    console.log(`📚 Loaded ${this.templates.length} patch templates`);
  }

  /**
   * Find matching template for natural language request
   */
  private findMatchingTemplate(text: string): PatchTemplate | null {
    for (const template of this.templates) {
      if (template.pattern.test(text)) {
        return template;
      }
    }
    return null;
  }

  /**
   * Generate patch from template
   */
  private generatePatchFromTemplate(template: PatchTemplate, request: NLRequest): any {
    const patchId = `patch-${uuidv4()}`;
    const domain = request.context?.domain || 'CYOPS';
    
    // Extract parameters from text
    const match = request.text.match(template.pattern);
    const params = match ? match.slice(1) : [];
    
    // Generate commands with parameter substitution
    const commands = template.commands.map(cmd => ({
      command: this.substituteParameters(cmd.command, params),
      label: cmd.label,
      timeout: this.extractTimeout(cmd.command)
    }));
    
    // Generate rollback plan
    const rollbackPlan = template.rollback?.map(cmd => ({
      command: this.substituteParameters(cmd.command, params),
      label: cmd.label
    })) || [];
    
    return {
      id: patchId,
      domain,
      commands,
      metadata: {
        version: 'v2.3.61',
        phase: 'P6.4.x',
        intent: template.description,
        author: 'NL2Patch-Service',
        timestamp: new Date().toISOString(),
        source: 'nl2patch',
        originalRequest: request.text,
        template: template.name
      },
      rollbackPlan
    };
  }

  /**
   * Substitute parameters in command strings
   */
  private substituteParameters(command: string, params: string[]): string {
    let result = command;
    
    // Replace {package} with first parameter
    if (params.length > 0) {
      result = result.replace(/{package}/g, params[0]);
    }
    
    return result;
  }

  /**
   * Extract timeout from command string
   */
  private extractTimeout(command: string): number {
    const match = command.match(/(\d+)s/);
    return match ? parseInt(match[1]) : 15;
  }

  /**
   * Add custom template
   */
  addTemplate(template: PatchTemplate): void {
    this.templates.push(template);
    console.log(`➕ Added template: ${template.name}`);
  }

  /**
   * Get available templates
   */
  getTemplates(): PatchTemplate[] {
    return this.templates;
  }

  /**
   * Get service status
   */
  getStatus(): { running: boolean; templateCount: number } {
    return {
      running: this.isRunning,
      templateCount: this.templates.length
    };
  }
}

// Export singleton instance
export const nl2PatchService = new NL2PatchService();

// CLI interface
if (require.main === module) {
  const service = new NL2PatchService();
  
  service.on('started', () => {
    console.log('🎯 NL2Patch Service is ready');
    console.log(`📚 Available templates: ${service.getTemplates().map(t => t.name).join(', ')}`);
  });
  
  // Start the service
  service.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down NL2Patch Service...');
    await service.stop();
    process.exit(0);
  });
}
