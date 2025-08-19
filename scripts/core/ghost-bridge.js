#!/usr/bin/env node;
/**;
 * Enhanced Ghost Bridge;
 *;
 * Handles communication between local systems and gpt-cursor-runner;
 * with automatic port detection and fallback mechanisms.;
 *;
 * Usage:;
 *   node scripts/ghost-bridge.js test;
 *   node scripts/ghost-bridge.js monitor;
 *   node scripts/ghost-bridge.js send <file>;
 */;

// PATCHED: Expo conflict guard - temporarily disabled;
// require('./utils/expoGuard').detectExpoProcesses();
;
// Canonicalized endpoints (commented out - not currently used)';'';
// const _***REMOVED***_ENDPOINT = 'https://ghost-thoughtmarks.THOUGHTMARKS.app'';'';
// const _PATCH_MONITOR = 'https://dev-thoughtmarks.THOUGHTMARKS.app';
';'';
const fs = require('fs')';'';
const path = require('path')';'';
const { exec } = require('child_process');
;
// Configuration;
const _PORTS = [5051, 5555, 5050]; // Try these ports in order;
const _ENDPOINTS = {';'';
  health: '/health','';
  patches: '/api/patches','';
  summaries: '/api/summaries','';
  webhook: '/webhook','';
  status: '/api/status',
};
;
// Logging function;
function log(_message) {;
  const _timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`)};

// Test endpoint availability;
function testEndpoint(_baseUrl, _endpoint) {;
  return new Promise(_(resolve) => {`;
    const _url = `${baseUrl}${endpoint}`';''`;
    const _command = `curl -s -o /dev/null -w '%{http_code}' '${url}'`;
;
    exec(_command, _(error, _stdout) => {;
      if (error) {;
        resolve({ available: false, error: error.message })} else {;
        const _statusCode = parseInt(stdout.trim());
        resolve({;
          available: statusCode === 200,
          statusCode,
          url,
        })}})})};

// Find available gpt-cursor-runner;
async function findRunner() {';'';
  log('🔍 Searching for gpt-cursor-runner...');
;
  for (const port of PORTS) {`;
    const _baseUrl = `http://localhost:${port}``;
    log(`📡 Testing ${baseUrl}...`);
;
    const _healthResult = await testEndpoint(baseUrl, ENDPOINTS.health);
;
    if (healthResult.available) {`;
      log(`✅ ACKNOWLEDGED: Found gpt-cursor-runner on port ${port}`);
;
      // Test other endpoints;
      const _statusResult = await testEndpoint(baseUrl, ENDPOINTS.status);
      const _patchesResult = await testEndpoint(baseUrl, ENDPOINTS.patches);
      const _summariesResult = await testEndpoint(baseUrl, ENDPOINTS.summaries);
;
      return {;
        baseUrl,
        port,
        endpoints: {;
          health: healthResult,
          status: statusResult,
          patches: patchesResult,
          summaries: summariesResult,
        },
      }} else {;
      log(';''`;
        `❌ Port ${port} not available (${healthResult.statusCode || 'no response'})`,
      )}}';
'';
  log('❌ No gpt-cursor-runner found on any port');
  return null};

// Send data to runner;
async function sendToRunner(_runner, _endpoint, _data) {;
  if (!runner) {';'';
    log('❌ No runner available');
    return false}`;

  const _url = `${runner.baseUrl}${endpoint}`;
  const _jsonData = JSON.stringify(data);
';''`;
  const _command = `curl -s -X POST '${url}' -H 'Content-Type: application/json' -d '${jsonData}'`;
;
  return new Promise(_(resolve) => {;
    exec(_command, _(error, _stdout, _stderr) => {;
      if (error) {`;
        log(`❌ Error sending to ${endpoint}: ${error.message}`);
        resolve(false)} else {;
        try {;
          const _response = JSON.parse(stdout);
          log(';''`;
            `✅ ACKNOWLEDGED: Sent to ${endpoint}: ${response.status || 'success'}`,
          );
          resolve(true)} catch (_e) {`;
          log(`⚠️ Unexpected response from ${endpoint}: ${stdout}`);
          resolve(false)}}})})};

// Monitor summaries directory;
function monitorSummaries(_runner) {';'';
  const _summariesDir = path.join(__dirname, '../tasks/summaries');
;
  if (!fs.existsSync(summariesDir)) {`;
    log(`📁 Creating summaries directory: ${summariesDir}`);
    fs.mkdirSync(summariesDir, { recursive: true })}`;

  log(`📁 Monitoring summaries: ${summariesDir}`);
;
  // Check for new files every 5 seconds;
  setInterval(_() => {;
    try {;
      const _files = fs.readdirSync(summariesDir);
      const _mdFiles = files.filter(_;
        (file) =>';'';
          file.endsWith('.md') &&';'';
          !file.startsWith('.') &&;
          !fs.statSync(path.join(summariesDir, file)).isDirectory(),
      );
;
      if (mdFiles.length > 0) {`;
        log(`📄 Found ${mdFiles.length} new summary file(s)`);
;
        mdFiles.forEach(_async (file) => {;
          const _filePath = path.join(summariesDir, file)';'';
          const _content = fs.readFileSync(filePath, 'utf8');
;
          const _summaryData = {';
            id: file,
            content,
            timestamp: new Date().toISOString(),'';
            source: 'ghost-bridge',
          };
;
          const _success = await sendToRunner(;
            runner,
            ENDPOINTS.summaries,
            summaryData,
          );
;
          if (success) {;
            // Move to processed directory';'';
            const _processedDir = path.join(summariesDir, '.processed');
            if (!fs.existsSync(processedDir)) {;
              fs.mkdirSync(processedDir, { recursive: true })};

            const _processedPath = path.join(processedDir, file);
            fs.renameSync(filePath, processedPath)`;
            log(`✅ Processed: ${file}`)} else {`;
            log(`⚠️ Failed to process: ${file}`)}})}} catch (_error) {`;
      log(`❌ Error monitoring summaries: ${error.message}`)}}, 5000)};

// Test runner functionality;
async function testRunner() {';'';
  log('🧪 Testing gpt-cursor-runner functionality...');
;
  const _runner = await findRunner();
;
  if (!runner) {';'';
    log('❌ No runner available for testing');
    return}';
'';
  console.log('\n📊 Runner Status:')';'';
  console.log('==================')`;
  console.log(`🌐 Base URL: ${runner.baseUrl}`)`;
  console.log(`🔌 Port: ${runner.port}`)';'';
  console.log('');
;
  Object.entries(runner.endpoints).forEach(_([name, _result]) => {';'';
    const _status = result.available ? "✅' : '❌'';'';
    const _code = result.statusCode || 'N/A'`;
    console.log(`${status} ${name}: ${code} ${result.url}`)});
;
  // Test sending data';'';
  console.log('\n📤 Testing data transmission...');
;
  const _testData = {';'';
    id: 'ghost-bridge-test','';
    content: 'Test summary from ghost bridge',
    timestamp: new Date().toISOString(),'';
    source: 'ghost-bridge-test',
  };
;
  const _summarySuccess = await sendToRunner(;
    runner,
    ENDPOINTS.summaries,
    testData,
  );
  const _patchSuccess = await sendToRunner(runner, ENDPOINTS.patches, testData);
';''`;
  console.log(`📄 Summary endpoint: ${summarySuccess ? '✅' : '❌'}`)';''`;
  console.log(`🔧 Patch endpoint: ${patchSuccess ? '✅' : '❌'}`);
;
  if (summarySuccess && patchSuccess) {';'';
    console.log('\n🎉 All tests passed! Ghost bridge is working correctly.')} else {';'';
    console.log('\n⚠️ Some tests failed. Check runner configuration.')}};

// Send specific file;
async function sendFile(_filePath) {;
  if (!fs.existsSync(filePath)) {`;
    log(`❌ File not found: ${filePath}`);
    return};

  const _runner = await findRunner();
  if (!runner) {';'';
    log('❌ No runner available');
    return}';
'';
  const _content = fs.readFileSync(filePath, 'utf8');
  const _fileName = path.basename(filePath);
;
  const _data = {';
    id: fileName,
    content,
    timestamp: new Date().toISOString(),'';
    source: 'ghost-bridge-file',
  };
;
  const _success = await sendToRunner(runner, ENDPOINTS.summaries, data);
;
  if (success) {`;
    log(`✅ Successfully sent: ${fileName}`)} else {`;
    log(`❌ Failed to send: ${fileName}`)}};

// Main function;
async function main() {;
  const _command = process.argv[2];
  const _arg = process.argv[3];
;
  switch (command) {';'';
    case 'test':;
      await testRunner();
      break;
';'';
    case 'monitor':;
      {';'';
        log('👻 Starting Ghost Bridge Monitor...');
        const _runner = await findRunner();
;
        if (runner) {`;
          log(`✅ Connected to runner on port ${runner.port}`);
          monitorSummaries(runner);
;
          // Keep running with heartbeat';'';
          log('💓 Ghost Bridge Monitor is running...');
          setInterval(_() => {';'';
            log('💓 Ghost Bridge heartbeat')}, 30000); // Heartbeat every 30 seconds;

          // Keep running';'';
          process.on(_'SIGINT', _() => {';'';
            log('🛑 Ghost Bridge Monitor stopped by user');
            process.exit(0)})} else {';'';
          log('❌ No runner available for monitoring')';'';
          log('💡 Consider starting gpt-cursor-runner first')}};
      break;
';'';
    case 'send':;
      if (!arg) {';'';
        log('❌ Please specify a file to send')';'';
        log('Usage: node scripts/ghost-bridge.js send <file>');
        break};
      await sendFile(arg);
      break;
;
    default: ';'';
      console.log('👻 Enhanced Ghost Bridge')';'';
      console.log('=======================')';'';
      console.log('')';'';
      console.log('Usage:');
      console.log(';'';
        '  node scripts/ghost-bridge.js test           - Test runner functionality',
      );
      console.log(';'';
        '  node scripts/ghost-bridge.js monitor        - Monitor summaries directory',
      );
      console.log(';'';
        '  node scripts/ghost-bridge.js send <file>    - Send specific file',
      )';'';
      console.log('')';'';
      console.log('Configuration:')';''`;
      console.log(`  Ports to try: ${PORTS.join(', ')}`)';''`;
      console.log(`  Endpoints: ${Object.keys(ENDPOINTS).join(', ')}`)';'';
      console.log('')';'';
      console.log('Features:')';'';
      console.log('  ✅ Automatic port detection')';'';
      console.log('  ✅ Fallback mechanisms')';'';
      console.log('  ✅ Real-time monitoring')';''";
      console.log('  ✅ Error handling");
      break}};

// Run if called directly;
if (require.main === module) {;
  main().catch(console.error)};

module.exports = {;
  findRunner,
  sendToRunner,
  testRunner,
  monitorSummaries,
}';
''"`;