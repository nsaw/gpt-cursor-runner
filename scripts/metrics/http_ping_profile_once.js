#!/usr/bin/env node
const https = require('https');

function pingUrl(url) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      resolve({ status: res.statusCode, ok: res.statusCode < 400 });
    });
    
    req.on('error', () => {
      resolve({ status: 0, ok: false });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({ status: 0, ok: false });
    });
  });
}

async function main() {
  const url = process.argv[2] || 'https://httpbin.org/status/200';
  
  try {
    const result = await pingUrl(url);
    console.log(`PING_RESULT: ${result.ok ? 'OK' : 'FAIL'} (${result.status})`);
    return result.ok ? 0 : 1;
  } catch (error) {
    console.error('PING_FAILED:', error.message);
    return 1;
  }
}

if (require.main === module) {
  process.exit(main());
}
