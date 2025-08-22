#!/usr/bin/env node

/**
 * Webhook Emit Tool (Non-blocking)
 * Emits compact state messages to webhook URL if present
 */

const fs = require('fs');
const https = require('https');
const http = require('http');

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--payload-file':
                options.payloadFile = args[++i];
                break;
        }
    }
    
    return options;
}

function loadPayload(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(content);
    } catch (err) {
        throw new Error(`Failed to load payload: ${err.message}`);
    }
}

function sendWebhook(url, payload) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const postData = JSON.stringify(payload);
        
        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 3500 // 3.5 second timeout
        };
        
        const req = client.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Webhook request timeout'));
        });
        
        req.write(postData);
        req.end();
    });
}

async function main() {
    const options = parseArgs();
    
    if (!options.payloadFile) {
        console.error('Usage: node webhook_emit_once.js --payload-file <json>');
        process.exit(1);
    }
    
    const webhookUrl = process.env.WEBHOOK_URL;
    
    if (!webhookUrl) {
        console.log('WEBHOOK_EMIT_SKIP: No WEBHOOK_URL environment variable set');
        process.exit(0);
    }
    
    try {
        const payload = loadPayload(options.payloadFile);
        
        // Add webhook metadata
        const webhookPayload = {
            ...payload,
            webhook: {
                timestamp: new Date().toISOString(),
                source: 'g2o-pm2-freeze-hardening',
                version: '1.4.1036'
            }
        };
        
        const result = await sendWebhook(webhookUrl, webhookPayload);
        
        console.log(`WEBHOOK_EMIT_SUCCESS: ${result.statusCode} - ${webhookUrl}`);
        process.exit(0);
    } catch (error) {
        console.error(`WEBHOOK_EMIT_ERROR: ${error.message}`);
        // Don't fail the patch for webhook errors
        process.exit(0);
    }
}

// Hard timeout: 5 seconds
const TIMEOUT_MS = 5000;
const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
        reject(new Error('Webhook emit timeout after 5s'));
    }, TIMEOUT_MS);
});

Promise.race([main(), timeoutPromise])
    .catch((error) => {
        console.error(`WEBHOOK_EMIT_TIMEOUT: ${error.message}`);
        process.exit(0); // Don't fail for webhook timeouts
    });
