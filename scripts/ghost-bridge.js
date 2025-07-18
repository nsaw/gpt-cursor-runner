#!/usr/bin/env node

/**
 * Ghost Bridge System
 * Connects tm-mobile-cursor to gpt-cursor-runner infrastructure
 * Provides seamless integration without duplicating systems
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class GhostBridge {
    constructor() {
        this.projectRoot = process.cwd();
        this.projectName = path.basename(this.projectRoot);
        
        // gpt-cursor-runner endpoints
        this.runnerEndpoints = {
            health: 'https://gpt-cursor-runner.fly.dev/health',
            slack: 'https://gpt-cursor-runner.fly.dev/slack/commands',
            dashboard: 'https://gpt-cursor-runner.fly.dev/dashboard',
            patches: 'https://gpt-cursor-runner.fly.dev/api/patches',
            summaries: 'https://gpt-cursor-runner.fly.dev/api/summaries'
        };
        
        // Local paths for tm-mobile-cursor
        this.localPaths = {
            patches: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'patches'),
            summaries: path.join(this.projectRoot, 'mobile-native-fresh', 'tasks', 'summaries'),
            logs: path.join(this.projectRoot, 'logs'),
            scripts: path.join(this.projectRoot, 'scripts')
        };
        
        // Bridge configuration
        this.bridgeConfig = {
            syncInterval: 30000, // 30 seconds
            maxRetries: 3,
            timeout: 10000,
            enableLocalProcessing: true,
            enableRemoteSync: true,
            enableSlackIntegration: true
        };
    }

    // Check if gpt-cursor-runner is accessible
    async checkRunnerHealth() {
        try {
            const response = await this.makeRequest(this.runnerEndpoints.health);
            return {
                accessible: true,
                status: response.status,
                data: response.data
            };
        } catch (error) {
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    // Make HTTP/HTTPS request
    makeRequest(url, options = {}) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const client = isHttps ? https : http;
            
            const requestOptions = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: options.method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'GhostBridge/1.0',
                    ...options.headers
                },
                timeout: this.bridgeConfig.timeout
            };

            const req = client.request(requestOptions, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonData = JSON.parse(data);
                        resolve({
                            status: res.statusCode,
                            data: jsonData
                        });
                    } catch (error) {
                        resolve({
                            status: res.statusCode,
                            data: data
                        });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => req.destroy());
            
            if (options.body) {
                req.write(JSON.stringify(options.body));
            }
            
            req.end();
        });
    }

    // Send patch to gpt-cursor-runner
    async sendPatch(patchData, target = 'tm-mobile-cursor') {
        try {
            const payload = {
                ...patchData,
                source: 'tm-mobile-cursor',
                target: target,
                timestamp: new Date().toISOString()
            };

            const response = await this.makeRequest(this.runnerEndpoints.patches, {
                method: 'POST',
                body: payload
            });

            return {
                success: response.status === 200 || response.status === 201,
                status: response.status,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Send summary to gpt-cursor-runner
    async sendSummary(summaryData, target = 'tm-mobile-cursor') {
        try {
            const payload = {
                content: summaryData,
                source: 'tm-mobile-cursor',
                target: target,
                timestamp: new Date().toISOString()
            };

            const response = await this.makeRequest(this.runnerEndpoints.summaries, {
                method: 'POST',
                body: payload
            });

            return {
                success: response.status === 200 || response.status === 201,
                status: response.status,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Send Slack command to gpt-cursor-runner
    async sendSlackCommand(command, args = {}) {
        try {
            const payload = {
                command: command,
                args: args,
                source: 'tm-mobile-cursor',
                timestamp: new Date().toISOString()
            };

            const response = await this.makeRequest(this.runnerEndpoints.slack, {
                method: 'POST',
                body: payload
            });

            return {
                success: response.status === 200,
                status: response.status,
                data: response.data
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Monitor local files and sync to gpt-cursor-runner
    async monitorAndSync() {
        console.log('Starting Ghost Bridge monitoring...');
        
        // Monitor patches directory
        this.monitorDirectory(this.localPaths.patches, 'patch', async (filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                const patchData = JSON.parse(content);
                
                console.log(`Syncing patch: ${path.basename(filePath)}`);
                const result = await this.sendPatch(patchData);
                
                if (result.success) {
                    console.log(`✅ Patch synced successfully`);
                } else {
                    console.log(`❌ Patch sync failed: ${result.error}`);
                }
            } catch (error) {
                console.log(`❌ Error processing patch: ${error.message}`);
            }
        });

        // Monitor summaries directory
        this.monitorDirectory(this.localPaths.summaries, 'summary', async (filePath) => {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                
                console.log(`Syncing summary: ${path.basename(filePath)}`);
                const result = await this.sendSummary(content);
                
                if (result.success) {
                    console.log(`✅ Summary synced successfully`);
                } else {
                    console.log(`❌ Summary sync failed: ${result.error}`);
                }
            } catch (error) {
                console.log(`❌ Error processing summary: ${error.message}`);
            }
        });
    }

    // Monitor directory for new files
    monitorDirectory(dirPath, fileType, callback) {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        // Check for existing files
        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);
            
            // Process files created in the last 5 minutes
            const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
            if (stats.mtime.getTime() > fiveMinutesAgo) {
                callback(filePath);
            }
        });

        // Set up periodic checking
        setInterval(() => {
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
                const filePath = path.join(dirPath, file);
                const stats = fs.statSync(filePath);
                
                // Process files created in the last 30 seconds
                const thirtySecondsAgo = Date.now() - (30 * 1000);
                if (stats.mtime.getTime() > thirtySecondsAgo) {
                    callback(filePath);
                }
            });
        }, this.bridgeConfig.syncInterval);
    }

    // Get bridge status
    async getBridgeStatus() {
        const health = await this.checkRunnerHealth();
        
        return {
            project: this.projectName,
            runnerAccessible: health.accessible,
            runnerStatus: health.status,
            localPaths: this.localPaths,
            bridgeConfig: this.bridgeConfig,
            endpoints: this.runnerEndpoints
        };
    }

    // Test bridge functionality
    async testBridge() {
        console.log('Testing Ghost Bridge functionality...');
        
        // Test runner health
        const health = await this.checkRunnerHealth();
        console.log(`Runner Health: ${health.accessible ? '✅ Accessible' : '❌ Not Accessible'}`);
        
        // Test patch sending
        const testPatch = {
            test: true,
            source: 'tm-mobile-cursor',
            timestamp: new Date().toISOString()
        };
        const patchResult = await this.sendPatch(testPatch);
        console.log(`Patch Test: ${patchResult.success ? '✅ Success' : '❌ Failed'}`);
        
        // Test summary sending
        const testSummary = '# Test Summary\n\nThis is a test summary from tm-mobile-cursor.';
        const summaryResult = await this.sendSummary(testSummary);
        console.log(`Summary Test: ${summaryResult.success ? '✅ Success' : '❌ Failed'}`);
        
        // Test Slack command
        const slackResult = await this.sendSlackCommand('status-runner');
        console.log(`Slack Test: ${slackResult.success ? '✅ Success' : '❌ Failed'}`);
        
        return {
            health: health,
            patchTest: patchResult,
            summaryTest: summaryResult,
            slackTest: slackResult
        };
    }
}

module.exports = GhostBridge;

// CLI usage
if (require.main === module) {
    const bridge = new GhostBridge();
    const command = process.argv[2];
    
    switch (command) {
        case 'status':
            bridge.getBridgeStatus().then(status => {
                console.log(JSON.stringify(status, null, 2));
            });
            break;
        case 'test':
            bridge.testBridge().then(results => {
                console.log(JSON.stringify(results, null, 2));
            });
            break;
        case 'monitor':
            bridge.monitorAndSync();
            break;
        case 'send-patch':
            const patchData = JSON.parse(process.argv[3] || '{"test": true}');
            bridge.sendPatch(patchData).then(result => {
                console.log(JSON.stringify(result, null, 2));
            });
            break;
        case 'send-summary':
            const summaryData = process.argv[3] || '# Test Summary\n\nThis is a test summary.';
            bridge.sendSummary(summaryData).then(result => {
                console.log(JSON.stringify(result, null, 2));
            });
            break;
        case 'slack-command':
            const command = process.argv[3] || 'status-runner';
            const args = JSON.parse(process.argv[4] || '{}');
            bridge.sendSlackCommand(command, args).then(result => {
                console.log(JSON.stringify(result, null, 2));
            });
            break;
        default:
            console.log('Usage: node ghost-bridge.js [status|test|monitor|send-patch|send-summary|slack-command]');
            console.log('');
            console.log('Commands:');
            console.log('  status         - Get bridge status');
            console.log('  test           - Test bridge functionality');
            console.log('  monitor        - Start monitoring and syncing');
            console.log('  send-patch     - Send test patch to runner');
            console.log('  send-summary   - Send test summary to runner');
            console.log('  slack-command  - Send Slack command to runner');
    }
} 