#!/usr/bin/env node
/**
 * Health Endpoint Service
 * 
 * Provides health check endpoints for the GPT bridge and related services.
 */

import { EventEmitter } from 'events';
import * as http from 'http';
import * as url from 'url';
import { gptBridge } from './gptBridge';
import { nl2PatchService } from './nl2PatchService';
import { slackGPTBridge } from './slackGPTBridge';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    gptBridge: {
      running: boolean;
      queueLength: number;
      processing: boolean;
    };
    nl2PatchService: {
      running: boolean;
      templateCount: number;
    };
    slackGPTBridge: {
      running: boolean;
    };
  };
  uptime: number;
  version: string;
}

export class HealthEndpointService extends EventEmitter {
  private server: http.Server | null = null;
  private isRunning = false;
  private startTime = Date.now();
  private port = 5053;

  constructor(port?: number) {
    super();
    if (port) {
      this.port = port;
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Health Endpoint Service is already running');
      return;
    }

    this.server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    return new Promise((resolve, reject) => {
      this.server!.listen(this.port, (err?: Error) => {
        if (err) {
          reject(err);
          return;
        }

        this.isRunning = true;
        console.log(`🏥 Health Endpoint Service started on port ${this.port}`);
        this.emit('started');
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning || !this.server) {
      console.log('Health Endpoint Service is not running');
      return;
    }

    return new Promise((resolve) => {
      this.server!.close(() => {
        this.isRunning = false;
        this.server = null;
        console.log('🛑 Health Endpoint Service stopped');
        this.emit('stopped');
        resolve();
      });
    });
  }

  /**
   * Handle HTTP requests
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const parsedUrl = url.parse(req.url || '', true);
    const pathname = parsedUrl.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      switch (pathname) {
        case '/health':
          this.handleHealthCheck(req, res);
          break;
        case '/status':
          this.handleStatus(req, res);
          break;
        case '/metrics':
          this.handleMetrics(req, res);
          break;
        case '/ready':
          this.handleReadiness(req, res);
          break;
        case '/live':
          this.handleLiveness(req, res);
          break;
        case '/gpt/commands':
          this.handleGPTCommands(req, res);
          break;
        default:
          this.handleNotFound(req, res);
      }
    } catch (error) {
      this.handleError(req, res, error);
    }
  }

  /**
   * Handle health check endpoint
   */
  private handleHealthCheck(req: http.IncomingMessage, res: http.ServerResponse): void {
    const healthStatus = this.getHealthStatus();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(healthStatus, null, 2));
  }

  /**
   * Handle status endpoint
   */
  private handleStatus(req: http.IncomingMessage, res: http.ServerResponse): void {
    const status = {
      service: 'GPT Bridge Health Endpoint',
      version: 'v2.3.61',
      uptime: Date.now() - this.startTime,
      timestamp: new Date().toISOString(),
      endpoints: [
        '/health - Full health check',
        '/status - Service status',
        '/metrics - Service metrics',
        '/ready - Readiness probe',
        '/live - Liveness probe',
        '/gpt/commands - GPT command processing (POST)'
      ]
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status, null, 2));
  }

  /**
   * Handle metrics endpoint
   */
  private handleMetrics(req: http.IncomingMessage, res: http.ServerResponse): void {
    const gptStatus = gptBridge.getStatus();
    const nl2Status = nl2PatchService.getStatus();
    const slackStatus = slackGPTBridge.getStatus();

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      services: {
        gptBridge: {
          running: gptStatus.running ? 1 : 0,
          queueLength: gptStatus.queueLength,
          processing: gptStatus.processing ? 1 : 0
        },
        nl2PatchService: {
          running: nl2Status.running ? 1 : 0,
          templateCount: nl2Status.templateCount
        },
        slackGPTBridge: {
          running: slackStatus.running ? 1 : 0
        }
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(metrics, null, 2));
  }

  /**
   * Handle readiness probe
   */
  private handleReadiness(req: http.IncomingMessage, res: http.ServerResponse): void {
    const gptStatus = gptBridge.getStatus();
    const nl2Status = nl2PatchService.getStatus();
    
    const ready = gptStatus.running && nl2Status.running;
    const statusCode = ready ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ready,
      timestamp: new Date().toISOString(),
      services: {
        gptBridge: gptStatus.running,
        nl2PatchService: nl2Status.running
      }
    }));
  }

  /**
   * Handle liveness probe
   */
  private handleLiveness(req: http.IncomingMessage, res: http.ServerResponse): void {
    const alive = this.isRunning;
    const statusCode = alive ? 200 : 503;

    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      alive,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    }));
  }

  /**
   * Handle GPT Commands endpoint
   */
  private handleGPTCommands(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Method Not Allowed',
        message: 'Only POST method is allowed for /gpt/commands'
      }));
      return;
    }

    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const requestData = JSON.parse(body);
        
        // Process the GPT command request
        const result = await this.processGPTCommand(requestData);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result, null, 2));
      } catch (error) {
        console.error('GPT Commands error:', error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Bad Request',
          message: error instanceof Error ? error.message : 'Invalid request format'
        }));
      }
    });
  }

  /**
   * Process GPT command request
   */
  private async processGPTCommand(requestData: any): Promise<any> {
    try {
      // Extract command information
      const { text, domain = 'CYOPS', source = 'gpt', user = 'unknown' } = requestData;
      
      if (!text) {
        throw new Error('Missing required field: text');
      }

      // Create patch request
      const patchRequest = {
        id: `gpt-${Date.now()}`,
        plainText: text,
        domain: domain as 'CYOPS' | 'MAIN',
        timestamp: new Date().toISOString(),
        source: source as 'slack' | 'gpt' | 'manual',
        priority: 'medium' as const
      };

      // Queue the patch request
      await gptBridge.queuePatchRequest(patchRequest);

      return {
        success: true,
        message: 'Command queued successfully',
        requestId: patchRequest.id,
        timestamp: new Date().toISOString(),
        status: 'queued'
      };
    } catch (error) {
      console.error('Failed to process GPT command:', error);
      throw error;
    }
  }

  /**
   * Handle 404 Not Found
   */
  private handleNotFound(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: `Endpoint ${req.url} not found`,
      availableEndpoints: ['/health', '/status', '/metrics', '/ready', '/live', '/gpt/commands']
    }));
  }

  /**
   * Handle errors
   */
  private handleError(req: http.IncomingMessage, res: http.ServerResponse, error: any): void {
    console.error('Health endpoint error:', error);
    
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Internal Server Error',
      message: error.message,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Get comprehensive health status
   */
  private getHealthStatus(): HealthStatus {
    const gptStatus = gptBridge.getStatus();
    const nl2Status = nl2PatchService.getStatus();
    const slackStatus = slackGPTBridge.getStatus();

    // Determine overall health status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (!gptStatus.running || !nl2Status.running) {
      overallStatus = 'unhealthy';
    } else if (gptStatus.queueLength > 10 || !slackStatus.running) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        gptBridge: gptStatus,
        nl2PatchService: nl2Status,
        slackGPTBridge: slackStatus
      },
      uptime: Date.now() - this.startTime,
      version: 'v2.3.61'
    };
  }

  /**
   * Get service status
   */
  getStatus(): { running: boolean; port: number; uptime: number } {
    return {
      running: this.isRunning,
      port: this.port,
      uptime: Date.now() - this.startTime
    };
  }
}

// Export singleton instance
export const healthEndpointService = new HealthEndpointService();

// CLI interface
if (require.main === module) {
  const service = new HealthEndpointService();
  
  service.on('started', () => {
    console.log('🎯 Health Endpoint Service is ready');
    console.log(`🏥 Health check available at: http://localhost:${service.getStatus().port}/health`);
  });
  
  // Start the service
  service.start().catch(console.error);
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down Health Endpoint Service...');
    await service.stop();
    process.exit(0);
  });
}
