#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Parse command line arguments
const args = process.argv.slice(2);
let url = null;
let timeoutMs = 4000; // Default: 4 seconds
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--url' && i + 1 < args.length) {
    url = args[i + 1];
  } else if (args[i] === '--timeoutMs' && i + 1 < args.length) {
    timeoutMs = parseInt(args[i + 1], 10);
  } else if (args[i] === '--out' && i + 1 < args.length) {
    outputPath = args[i + 1];
  }
}

if (!url || !outputPath) {
  console.error('Usage: node health_http_ping_once.js --url <url> --timeoutMs <ms> --out <path>');
  process.exit(1);
}

// Hard timeout: use provided timeout
let timeoutId = null;

const timeoutPromise = new Promise((_, reject) => {
  timeoutId = setTimeout(() => {
    reject(new Error(`HTTP ping timeout after ${timeoutMs}ms`));
  }, timeoutMs);
});

const pingPromise = new Promise((resolve, reject) => {
  try {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'g2o-health-ping/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
        // Limit response size to 1KB
        if (data.length > 1024) {
          data = data.substring(0, 1024) + '...';
          req.destroy();
        }
      });
      
      res.on('end', () => {
        const result = {
          timestamp: new Date().toISOString(),
          url: url,
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data,
          reachable: res.statusCode >= 200 && res.statusCode < 300,
          responseTime: Date.now() - startTime
        };
        resolve(result);
      });
    });

    const startTime = Date.now();
    
    req.on('error', (error) => {
      resolve({
        timestamp: new Date().toISOString(),
        url: url,
        error: error.message,
        reachable: false,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        timestamp: new Date().toISOString(),
        url: url,
        error: 'Request timeout',
        reachable: false,
        responseTime: Date.now() - startTime
      });
    });

    req.end();
  } catch (error) {
    resolve({
      timestamp: new Date().toISOString(),
      url: url,
      error: error.message,
      reachable: false,
      responseTime: 0
    });
  }
});

Promise.race([pingPromise, timeoutPromise])
  .then((result) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write JSON output
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    console.log(`HTTP_PING_WRITTEN:${outputPath} (${result.reachable ? 'reachable' : 'unreachable'})`);
    process.exit(0);
  })
  .catch((error) => {
    if (timeoutId) clearTimeout(timeoutId);
    
    console.error(`HTTP_PING_ERROR:${error.message}`);
    
    const errorResult = {
      timestamp: new Date().toISOString(),
      url: url,
      error: error.message,
      reachable: false,
      responseTime: 0
    };
    
    try {
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(outputPath, JSON.stringify(errorResult, null, 2));
    } catch (writeError) {
      console.error(`HTTP_PING_WRITE_ERROR:${writeError.message}`);
    }
    
    process.exit(2);
  });
