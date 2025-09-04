#!/usr/bin/env node
/**
 * Bridge Orchestrator - Unified GPT Bridge System
 * 
 * This service orchestrates all bridge components to provide a complete
 * natural language to patch conversion system.
 */

import { EventEmitter } from 'events';
import { gptBridge } from './gptBridge';
import { nl2PatchService } from './nl2PatchService';
import { slackGPTBridge } from './slackGPTBridge';
import { healthEndpointService } from './healthEndpoint';

export class BridgeOrchestrator extends EventEmitter {
  private isRunning = false;
  private services: Array<{ name: string; service: any; started: boolean }> = [];

  constructor() {
    super();
    this.initializeServices();
  }

  /**
   * Initialize all bridge services
   */
  private initializeServices(): void {
    this.services = [
      { name: 'GPT Bridge', service: gptBridge, started: false },
      { name: 'NL2Patch Service', service: nl2PatchService, started: false },
      { name: 'Slack GPT Bridge', service: slackGPTBridge, started: false },
      { name: 'Health Endpoint Service', service: healthEndpointService, started: false }
    ];
  }

  /**
   * Start all bridge services
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Bridge Orchestrator is already running');
      return;
    }

    console.log('🚀 Starting Bridge Orchestrator...');
    
    try {
      // Start services in order
      for (const serviceInfo of this.services) {
        console.log(`🔄 Starting ${serviceInfo.name}...`);
        await serviceInfo.service.start();
        serviceInfo.started = true;
        console.log(`✅ ${serviceInfo.name} started successfully`);
      }

      this.isRunning = true;
      console.log('🎯 Bridge Orchestrator is fully operational!');
      console.log('📋 Available services:');
      this.services.forEach(s => {
        console.log(`   • ${s.name}: ${s.started ? '✅ Running' : '❌ Stopped'}`);
      });
      
      this.emit('started');
    } catch (error) {
      console.error('❌ Failed to start Bridge Orchestrator:', error);
      await this.stop();
      throw error;
    }
  }

  /**
   * Stop all bridge services
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Bridge Orchestrator is not running');
      return;
    }

    console.log('🛑 Stopping Bridge Orchestrator...');
    
    // Stop services in reverse order
    for (let i = this.services.length - 1; i >= 0; i--) {
      const serviceInfo = this.services[i];
      if (serviceInfo.started) {
        try {
          console.log(`🔄 Stopping ${serviceInfo.name}...`);
          await serviceInfo.service.stop();
          serviceInfo.started = false;
          console.log(`✅ ${serviceInfo.name} stopped successfully`);
        } catch (error) {
          console.error(`❌ Failed to stop ${serviceInfo.name}:`, error);
        }
      }
    }

    this.isRunning = false;
    console.log('🛑 Bridge Orchestrator stopped');
    
    this.emit('stopped');
  }

  /**
   * Restart all services
   */
  async restart(): Promise<void> {
    console.log('🔄 Restarting Bridge Orchestrator...');
    await this.stop();
    await this.start();
  }

  /**
   * Get status of all services
   */
  getStatus(): {
    running: boolean;
    services: Array<{
      name: string;
      status: any;
      started: boolean;
    }>;
  } {
    return {
      running: this.isRunning,
      services: this.services.map(serviceInfo => ({
        name: serviceInfo.name,
        status: serviceInfo.service.getStatus ? serviceInfo.service.getStatus() : {},
        started: serviceInfo.started
      }))
    };
  }

  /**
   * Health check for the entire system
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: Array<{
      name: string;
      healthy: boolean;
      status: any;
    }>;
  }> {
    const services = this.services.map(serviceInfo => {
      const healthy = serviceInfo.started;
      let status = {};
      
      if (serviceInfo.service.getStatus) {
        status = serviceInfo.service.getStatus();
        // Additional health checks can be added here
      }
      
      return {
        name: serviceInfo.name,
        healthy,
        status
      };
    });

    const healthy = services.every(s => s.healthy);

    return {
      healthy,
      services
    };
  }

  /**
   * Process a natural language request
   */
  async processRequest(request: {
    text: string;
    domain?: 'CYOPS' | 'MAIN';
    source?: 'slack' | 'gpt' | 'manual';
    user?: string;
  }): Promise<any> {
    if (!this.isRunning) {
      throw new Error('Bridge Orchestrator is not running');
    }

    console.log(`🔄 Processing request: "${request.text}"`);
    
    try {
      // Use NL2Patch service to convert to patch
      const patch = await nl2PatchService.convertToPatch({
        id: `request-${Date.now()}`,
        text: request.text,
        context: {
          domain: request.domain || 'CYOPS',
          user: request.user || 'unknown',
          timestamp: new Date().toISOString()
        },
        priority: 'medium'
      });

      // Queue patch for execution
      await gptBridge.queuePatchRequest({
        id: patch.id,
        plainText: request.text,
        domain: request.domain || 'CYOPS',
        timestamp: new Date().toISOString(),
        source: request.source || 'manual',
        priority: 'medium'
      });

      console.log(`✅ Request processed successfully: ${patch.id}`);
      return patch;
    } catch (error) {
      console.error('❌ Failed to process request:', error);
      throw error;
    }
  }

  /**
   * Get available templates
   */
  getTemplates(): any[] {
    return nl2PatchService.getTemplates();
  }

  /**
   * Add custom template
   */
  addTemplate(template: any): void {
    nl2PatchService.addTemplate(template);
  }
}

// Export singleton instance
export const bridgeOrchestrator = new BridgeOrchestrator();

// CLI interface
if (require.main === module) {
  const orchestrator = new BridgeOrchestrator();
  
  orchestrator.on('started', () => {
    console.log('🎯 Bridge Orchestrator is fully operational!');
    console.log('📋 Available endpoints:');
    console.log('   • Health: http://localhost:5053/health');
    console.log('   • Status: http://localhost:5053/status');
    console.log('   • Metrics: http://localhost:5053/metrics');
    console.log('   • Ready: http://localhost:5053/ready');
    console.log('   • Live: http://localhost:5053/live');
  });
  
  orchestrator.on('stopped', () => {
    console.log('🛑 Bridge Orchestrator stopped');
  });
  
  // Start the orchestrator
  orchestrator.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Bridge Orchestrator...');
    await orchestrator.stop();
    process.exit(0);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught exception:', error);
    await orchestrator.stop();
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason) => {
    console.error('💥 Unhandled rejection:', reason);
    await orchestrator.stop();
    process.exit(1);
  });
}
