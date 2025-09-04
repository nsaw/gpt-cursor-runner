#!/usr/bin/env node
/**
 * DEV Service Health Check Script
 * Validates service health and operational status
 */

const http = require('http');
const { execSync } = require('child_process');

class DEVServiceHealthChecker {
  constructor() {
    this.services = [
      { name: 'webhook-server', port: 5051, path: '/health' },
      { name: 'bridge-orchestrator', port: 5053, path: '/health' }
    ];
  }

  /**
   * Check HTTP service health
   */
  async checkHTTPService(service) {
    return new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: service.port,
        path: service.path,
        method: 'GET',
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          resolve({ service: service.name, status: 'healthy', code: res.statusCode });
        } else {
          resolve({ service: service.name, status: 'unhealthy', code: res.statusCode });
        }
      });

      req.on('error', () => {
        resolve({ service: service.name, status: 'unreachable', code: 0 });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ service: service.name, status: 'timeout', code: 0 });
      });

      req.end();
    });
  }

  /**
   * Check PM2 process status
   */
  checkPM2Status() {
    try {
      const output = execSync('pm2 list --no-color', { encoding: 'utf8' });
      const lines = output.split('\n');
      
      const processes = [];
      for (const line of lines) {
        if (line.includes('│') && !line.includes('┌') && !line.includes('└')) {
          const parts = line.split('│').map(part => part.trim());
          if (parts.length >= 4) {
            processes.push({
              name: parts[1],
              status: parts[3],
              cpu: parts[4],
              memory: parts[5]
            });
          }
        }
      }

      return processes;
    } catch (error) {
      console.error('❌ Failed to check PM2 status:', error.message);
      return [];
    }
  }

  /**
   * Check all services
   */
  async checkAllServices() {
    console.log('🔍 Checking service health...');
    
    const results = [];
    
    // Check HTTP services
    for (const service of this.services) {
      const result = await this.checkHTTPService(service);
      results.push(result);
    }

    // Check PM2 processes
    const pm2Processes = this.checkPM2Status();
    for (const process of pm2Processes) {
      results.push({
        service: process.name,
        status: process.status === 'online' ? 'healthy' : 'unhealthy',
        code: process.status === 'online' ? 200 : 500
      });
    }

    return results;
  }

  /**
   * Generate health report
   */
  async generateHealthReport() {
    console.log('🚀 Generating service health report...');
    
    const results = await this.checkAllServices();
    
    console.log('\n📊 Service Health Report:');
    console.log('========================');
    
    let allHealthy = true;
    
    for (const result of results) {
      const status = result.status === 'healthy' ? '✅' : '❌';
      console.log(`${status} ${result.service}: ${result.status} (${result.code})`);
      
      if (result.status !== 'healthy') {
        allHealthy = false;
      }
    }

    console.log('\n========================');
    console.log(`Overall Status: ${allHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    
    return allHealthy;
  }
}

// CLI interface
if (require.main === module) {
  const checker = new DEVServiceHealthChecker();
  
  checker.generateHealthReport()
    .then(healthy => {
      process.exit(healthy ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Health check failed:', error.message);
      process.exit(1);
    });
}

module.exports = DEVServiceHealthChecker;
