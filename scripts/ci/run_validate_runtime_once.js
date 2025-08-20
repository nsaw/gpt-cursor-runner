/* eslint-disable */
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = '/Users/sawyer/gitSync/gpt-cursor-runner';
const EXPO_ROOT = '/Users/sawyer/gitSync/tm-mobile-cursor/mobile-native-fresh';

const checkPort = (port) => new Promise((resolve) => {
  const req = http.get({ host: '127.0.0.1', port, path: '/' }, (res) => {
    res.resume();
    resolve(res.statusCode || 0);
  });
  req.on('error', () => resolve(0));
  req.setTimeout(5000, () => resolve(0));
});

const checkFile = (filePath) => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

(async () => {
  console.log('[validate-runtime] Checking runtime environment...');
  
  // Check if mobile-native-fresh directory exists
  if (!checkFile(EXPO_ROOT)) {
    console.log('[validate-runtime] mobile-native-fresh directory not found');
    process.exit(1);
  }
  
  // Check if package.json exists in mobile-native-fresh
  if (!checkFile(path.join(EXPO_ROOT, 'package.json'))) {
    console.log('[validate-runtime] package.json not found in mobile-native-fresh');
    process.exit(1);
  }
  
  // Check if node_modules exists
  if (!checkFile(path.join(EXPO_ROOT, 'node_modules'))) {
    console.log('[validate-runtime] node_modules not found in mobile-native-fresh');
    process.exit(1);
  }
  
  // Check if Expo CLI is available
  const checkExpo = spawn('npx', ['expo', '--version'], { 
    cwd: EXPO_ROOT, 
    stdio: 'pipe' 
  });
  
  let expoVersion = '';
  checkExpo.stdout.on('data', (data) => {
    expoVersion += data.toString();
  });
  
  const expoCheck = new Promise((resolve) => {
    checkExpo.on('exit', (code) => {
      resolve(code === 0);
    });
  });
  
  const expoAvailable = await expoCheck;
  if (!expoAvailable) {
    console.log('[validate-runtime] Expo CLI not available');
    process.exit(1);
  }
  
  console.log(`[validate-runtime] Expo CLI available: ${expoVersion.trim()}`);
  console.log('[validate-runtime] Runtime environment validated');
  process.exit(0);
})();
