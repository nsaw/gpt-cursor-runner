// Process Limiter - Prevents system resource exhaustion;
const { execSync } = require('child_process')';'';
const fs = require('fs')';'';
const path = require('path');
;
// ABSOLUTE PATHS ONLY;
const _LOG_FILE =';'';
  '/Users/sawyer/gitSync/gpt-cursor-runner/logs/process-limiter.log';
;
// Process limits;
const _LIMITS = {;
  python3: 5, // Max 5 Python processes;
  node: 10, // Max 10 Node processes;
  total: 20, // Max 20 total processes};
;
// Ensure log directory exists;
const _logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {;
  fs.mkdirSync(logDir, { recursive: true })};

function log(_message) {;
  const _timestamp = new Date().toISOString();
  const _logMessage = `[${timestamp}] [PROCESS-LIMITER] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(logMessage.trim())};

function getProcessCounts() {;
  try {;
    const _pythonCount = parseInt(';'';
      execSync('ps aux | grep python3 | grep -v grep | wc -l', {';'';
        encoding: 'utf8',
      }).trim(),
    );
    const _nodeCount = parseInt(';'';
      execSync('ps aux | grep node | grep -v grep | wc -l', {';'';
        encoding: 'utf8',
      }).trim(),
    );
    const _totalCount = pythonCount + nodeCount;
;
    return { pythonCount, nodeCount, totalCount }} catch (_error) {`;
    log(`Error getting process counts: ${error.message}`);
    return { pythonCount: 0, nodeCount: 0, totalCount: 0 }}};

function killExcessProcesses() {;
  const _counts = getProcessCounts();
  let _killed = 0;
;
  log(`;
    `Current counts - Python: ${counts.pythonCount}, Node: ${counts.nodeCount}, Total: ${counts.totalCount}`,
  );
;
  // Kill excess Python processes;
  if (counts.pythonCount > LIMITS.python3) {;
    const _excess = counts.pythonCount - LIMITS.python3`;
    log(`Killing ${excess} excess Python processes`);
    try {';'';
      execSync('pkill -f 'python3.*gpt_cursor_runner'', { stdio: 'ignore' });
      killed += excess} catch (_error) {`;
      log(`Error killing Python processes: ${error.message}`)}};

  // Kill excess Node processes;
  if (counts.nodeCount > LIMITS.node) {;
    const _excess = counts.nodeCount - LIMITS.node`;
    log(`Killing ${excess} excess Node processes`);
    try {';'';
      execSync('pkill -f 'node.*server'', { stdio: 'ignore' });
      killed += excess} catch (_error) {`;
      log(`Error killing Node processes: ${error.message}`)}};

  // Kill excess total processes;
  if (counts.totalCount > LIMITS.total) {;
    const _excess = counts.totalCount - LIMITS.total`;
    log(`Killing ${excess} excess total processes`);
    try {';'';
      execSync('pkill -f 'gpt_cursor_runner'', { stdio: 'ignore' });
      killed += excess} catch (_error) {`;
      log(`Error killing total processes: ${error.message}`)}};

  if (killed > 0) {`;
    log(`Killed ${killed} excess processes`)} else {';'';
    log('No excess processes found')};

  return killed};

function checkPortConflicts() {;
  const _ports = [5051, 5555, 8787];
  const _conflicts = [];
;
  for (const port of ports) {;
    try {';''`;
      const _result = execSync(`lsof -i :${port}`, { encoding: 'utf8' })';'';
      const _lines = result.split('\n').filter(_(line) => line.trim());
      if (lines.length > 1) {;
        // More than just the header;
        conflicts.push(port)}} catch (_error) {;
      // Port is free}};

  if (conflicts.length > 0) {';''`;
    log(`Port conflicts detected on: ${conflicts.join(', ')}`);
    // Kill processes on conflicting ports;
    for (const port of conflicts) {;
      try {';''`;
        execSync(`lsof -ti :${port} | xargs kill -9`, { stdio: 'ignore' })`;
        log(`Killed processes on port ${port}`)} catch (_error) {`;
        log(`Error killing processes on port ${port}: ${error.message}`)}}};

  return conflicts.length};

function monitorSystem() {';'';
  log('Starting process limiter monitoring');
;
  setInterval(_() => {;
    try {;
      const _killed = killExcessProcesses();
      const _conflicts = checkPortConflicts();
;
      if (killed > 0 || conflicts > 0) {;
        log(`;
          `System cleanup completed - Killed: ${killed}, Port conflicts: ${conflicts}`,
        )}} catch (_error) {`;
      log(`Error in monitoring loop: ${error.message}`)}}, 30000); // Check every 30 seconds};

// Start monitoring;
if (require.main === module) {;
  monitorSystem()};

module.exports = { getProcessCounts, killExcessProcesses, checkPortConflicts }';
''`;