#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');

class SlackRelayAuditor {
    constructor() {
        this.projectRoot = process.cwd();
        this.webhookUrl = 'https://gpt-cursor-runner.fly.dev/slack/commands';
        this.auditLog = path.join(this.projectRoot, 'logs', 'slack-relay-audit.log');
        this.ensureLogDir();
    }

    ensureLogDir() {
        const logDir = path.join(this.projectRoot, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }

    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            component: 'slack-relay-auditor'
        };
        
        console.log(`[${timestamp}] [${level}] ${message}`);
        fs.appendFileSync(this.auditLog, JSON.stringify(logEntry) + '\n');
    }

    auditWebhookConfiguration() {
        this.log('🔍 Auditing webhook configuration...');
        
        const webhookConfigs = [
            'scripts/watchdog-runner.sh',
            'scripts/watchdog-health-check.sh',
            'scripts/watchdog-tunnel.sh'
        ];
        
        const results = {};
        
        for (const configFile of webhookConfigs) {
            const fullPath = path.join(this.projectRoot, configFile);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const webhookMatch = content.match(/DASHBOARD_WEBHOOK="([^"]+)"/);
                
                if (webhookMatch) {
                    results[configFile] = {
                        exists: true,
                        webhookUrl: webhookMatch[1],
                        valid: webhookMatch[1] === this.webhookUrl
                    };
                    
                    if (results[configFile].valid) {
                        this.log(`✅ ${configFile}: Webhook URL correctly configured`);
                    } else {
                        this.log(`⚠️ ${configFile}: Webhook URL mismatch`, 'WARN');
                    }
                } else {
                    results[configFile] = {
                        exists: true,
                        webhookUrl: null,
                        valid: false
                    };
                    this.log(`❌ ${configFile}: No webhook configuration found`, 'ERROR');
                }
            } else {
                results[configFile] = {
                    exists: false,
                    webhookUrl: null,
                    valid: false
                };
                this.log(`❌ ${configFile}: File not found`, 'ERROR');
            }
        }
        
        return results;
    }

    testWebhookConnectivity() {
        this.log('🔍 Testing webhook connectivity...');
        
        return new Promise((resolve) => {
            const testData = {
                command: '/status-runner',
                text: '[SLACK-RELAY-AUDIT] Testing connectivity',
                user_name: 'slack-relay-auditor',
                channel_id: 'infrastructure'
            };
            
            const postData = JSON.stringify(testData);
            const options = {
                hostname: 'gpt-cursor-runner.fly.dev',
                port: 443,
                path: '/slack/commands',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    const success = res.statusCode >= 200 && res.statusCode < 300;
                    const result = {
                        statusCode: res.statusCode,
                        success,
                        response: data.substring(0, 500),
                        headers: res.headers
                    };
                    
                    if (success) {
                        this.log(`✅ Webhook connectivity test successful (${res.statusCode})`);
                    } else {
                        this.log(`❌ Webhook connectivity test failed (${res.statusCode})`, 'ERROR');
                    }
                    
                    resolve(result);
                });
            });
            
            req.on('error', (error) => {
                this.log(`❌ Webhook connectivity test error: ${error.message}`, 'ERROR');
                resolve({
                    statusCode: 0,
                    success: false,
                    error: error.message
                });
            });
            
            req.write(postData);
            req.end();
        });
    }

    auditNotificationFunctions() {
        this.log('🔍 Auditing notification functions...');
        
        const notificationScripts = [
            'scripts/watchdog-runner.sh',
            'scripts/watchdog-health-check.sh',
            'scripts/watchdog-tunnel.sh'
        ];
        
        const results = {};
        
        for (const scriptFile of notificationScripts) {
            const fullPath = path.join(this.projectRoot, scriptFile);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');
                const hasNotifyFunction = content.includes('notify_dashboard');
                const hasCurlCommand = content.includes('curl');
                const hasWebhookUrl = content.includes('DASHBOARD_WEBHOOK');
                
                results[scriptFile] = {
                    exists: true,
                    hasNotifyFunction,
                    hasCurlCommand,
                    hasWebhookUrl,
                    valid: hasNotifyFunction && hasCurlCommand && hasWebhookUrl
                };
                
                if (results[scriptFile].valid) {
                    this.log(`✅ ${scriptFile}: Notification functions properly configured`);
                } else {
                    this.log(`⚠️ ${scriptFile}: Missing notification components`, 'WARN');
                }
            } else {
                results[scriptFile] = {
                    exists: false,
                    hasNotifyFunction: false,
                    hasCurlCommand: false,
                    hasWebhookUrl: false,
                    valid: false
                };
                this.log(`❌ ${scriptFile}: File not found`, 'ERROR');
            }
        }
        
        return results;
    }

    auditSlackIntegration() {
        this.log('🔍 Auditing Slack integration components...');
        
        const slackComponents = {
            webhookConfigs: this.auditWebhookConfiguration(),
            notificationFunctions: this.auditNotificationFunctions(),
            connectivity: null // Will be filled by test
        };
        
        return slackComponents;
    }

    async repairWebhookConfiguration() {
        this.log('🔧 Repairing webhook configuration...');
        
        const webhookConfigs = [
            'scripts/watchdog-runner.sh',
            'scripts/watchdog-health-check.sh',
            'scripts/watchdog-tunnel.sh'
        ];
        
        let repairedCount = 0;
        
        for (const configFile of webhookConfigs) {
            const fullPath = path.join(this.projectRoot, configFile);
            if (fs.existsSync(fullPath)) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let modified = false;
                
                // Check if webhook URL is correct
                if (!content.includes(`DASHBOARD_WEBHOOK="${this.webhookUrl}"`)) {
                    // Replace incorrect webhook URL
                    content = content.replace(
                        /DASHBOARD_WEBHOOK="[^"]*"/g,
                        `DASHBOARD_WEBHOOK="${this.webhookUrl}"`
                    );
                    
                    // Add webhook URL if missing
                    if (!content.includes('DASHBOARD_WEBHOOK=')) {
                        const insertPoint = content.indexOf('CHECK_INTERVAL=');
                        if (insertPoint !== -1) {
                            const before = content.substring(0, insertPoint);
                            const after = content.substring(insertPoint);
                            content = before + `DASHBOARD_WEBHOOK="${this.webhookUrl}"\n` + after;
                        }
                    }
                    
                    fs.writeFileSync(fullPath, content);
                    modified = true;
                    repairedCount++;
                    this.log(`✅ Repaired webhook configuration in ${configFile}`);
                }
            }
        }
        
        this.log(`🔧 Webhook configuration repair complete: ${repairedCount} files updated`);
        return repairedCount;
    }

    createSlackRelayScript() {
        this.log('🔧 Creating Slack relay script...');
        
        const relayScript = `#!/bin/bash

# Slack Relay Script for tm-mobile-cursor
# Handles Slack notifications and webhook communication

WEBHOOK_URL="https://gpt-cursor-runner.fly.dev/slack/commands"
LOG_FILE="./logs/slack-relay.log"

log() {
    local level="\${1:-INFO}"
    local message="\${2:-No message}"
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    echo "[$timestamp] [\${level}] \${message}" | tee -a "$LOG_FILE"
}

send_slack_notification() {
    local command="\${1:-/status-runner}"
    local text="\${2:-No message}"
    local username="\${3:-tm-mobile-cursor}"
    local channel="\${4:-infrastructure}"
    
    local payload="{
        \\"command\\": \\"\${command}\\",
        \\"text\\": \\"\${text}\\",
        \\"user_name\\": \\"\${username}\\",
        \\"channel_id\\": \\"\${channel}\\"
    }"
    
    log "INFO" "Sending Slack notification: \${command}"
    
    local response=$(curl -s --max-time 10 -X POST "$WEBHOOK_URL" \\
        -H "Content-Type: application/json" \\
        -d "\${payload}")
    
    if [ $? -eq 0 ]; then
        log "INFO" "Slack notification sent successfully"
        echo "\${response}"
    else
        log "ERROR" "Failed to send Slack notification"
        return 1
    fi
}

test_connectivity() {
    log "INFO" "Testing Slack relay connectivity..."
    send_slack_notification "/status-runner" "[SLACK-RELAY-TEST] Connectivity test from tm-mobile-cursor" "tm-mobile-cursor"
}

case "\${1}" in
    "send")
        send_slack_notification "\${2}" "\${3}" "\${4}" "\${5}"
        ;;
    "test")
        test_connectivity
        ;;
    *)
        echo "Usage: $0 [send|test] [command] [text] [username] [channel]"
        echo "  send: Send a Slack notification"
        echo "  test: Test connectivity"
        exit 1
        ;;
esac
`;
        
        const scriptPath = path.join(this.projectRoot, 'scripts', 'slack-relay.sh');
        fs.writeFileSync(scriptPath, relayScript);
        
        // Make executable
        const { execSync } = require('child_process');
        try {
            execSync(`chmod +x "${scriptPath}"`);
            this.log(`✅ Created Slack relay script: ${scriptPath}`);
        } catch (error) {
            this.log(`⚠️ Could not make script executable: ${error.message}`, 'WARN');
        }
        
        return scriptPath;
    }

    async runAudit() {
        this.log('🚀 Starting Slack Relay Pipeline Audit...');
        
        const auditResults = {
            webhookConfigs: this.auditWebhookConfiguration(),
            notificationFunctions: this.auditNotificationFunctions(),
            connectivity: await this.testWebhookConnectivity()
        };
        
        // Summary
        this.log('\n📊 Slack Relay Audit Summary:');
        
        const webhookValid = Object.values(auditResults.webhookConfigs).every(config => config.valid);
        const notificationValid = Object.values(auditResults.notificationFunctions).every(func => func.valid);
        const connectivityValid = auditResults.connectivity.success;
        
        if (webhookValid && notificationValid && connectivityValid) {
            this.log('✅ Slack relay pipeline is fully operational!');
        } else {
            this.log('⚠️ Slack relay pipeline issues detected:');
            if (!webhookValid) {
                this.log('❌ Webhook configuration issues');
            }
            if (!notificationValid) {
                this.log('❌ Notification function issues');
            }
            if (!connectivityValid) {
                this.log('❌ Connectivity issues');
            }
        }
        
        return auditResults;
    }

    async runRepair() {
        this.log('🔧 Starting Slack Relay Pipeline Repair...');
        
        const repairs = {
            webhookConfigs: this.repairWebhookConfiguration(),
            relayScript: this.createSlackRelayScript()
        };
        
        this.log(`🔧 Repair complete: ${repairs.webhookConfigs} webhook configs updated, relay script created`);
        
        return repairs;
    }
}

// CLI interface
if (require.main === module) {
    const auditor = new SlackRelayAuditor();
    
    const command = process.argv[2];
    
    switch (command) {
        case 'audit':
            auditor.runAudit().then(results => {
                console.log(JSON.stringify(results, null, 2));
            });
            break;
        case 'repair':
            auditor.runRepair().then(results => {
                console.log(JSON.stringify(results, null, 2));
            });
            break;
        case 'test':
            auditor.testWebhookConnectivity().then(result => {
                console.log(JSON.stringify(result, null, 2));
            });
            break;
        default:
            console.log('Usage: node slack-relay-audit.js [audit|repair|test]');
            process.exit(1);
    }
}

module.exports = SlackRelayAuditor; 