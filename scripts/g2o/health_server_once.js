#!/usr/bin/env node

const http = require('http');

function startHealthServer() {
  try {
    const server = http.createServer((req, res) => {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        status: 'OK', 
        timestamp: new Date().toISOString()
      }));
    });
        
    server.listen(5555, () => {
      console.log('Health server on 5555');
    });
        
    console.log('HEALTH_SERVER_STARTED:5555');
    process.exit(0);
  } catch (error) {
    console.error(`HEALTH_SERVER_ERROR:${error.message}`);
    process.exit(1);
  }
}

startHealthServer();
