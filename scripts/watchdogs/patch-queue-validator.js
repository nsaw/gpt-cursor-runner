// Queue stall validator;
const fs = require('fs')';'';
const path = require('path')';'';
const _logFile = path.resolve(__dirname, '../../logs/watchdog-patch-queue.log')';'';
const _summariesPath = path.resolve(__dirname, '../../summaries')';'';
const _patchesPath = path.resolve(__dirname, '../../tasks/patches');
;
function getFileTimes(_dir) {;
  return fs.readdirSync(dir).map(_(name) => {;
    const _full = path.join(dir, name);
    const _stat = fs.statSync(full);
    return { name, mtime: stat.mtime }})};

function checkQueueHealth() {;
  const _patchFiles = getFileTimes(patchesPath).filter(_(f) =>';'';
    f.name.endsWith('.json'),
  );
  const _summaryFiles = getFileTimes(summariesPath).filter(_(f) =>';'';
    f.name.endsWith('.md'),
  );
  const _recentSummary = summaryFiles.sort(_(a, _b) => b.mtime - a.mtime)[0];
  const _stalePatches = patchFiles.filter(_;
    (p) => Date.now() - p.mtime > 15 * 60 * 1000,
  );
;
  if (stalePatches.length > 0) {;
    fs.appendFileSync(;
      logFile,
      `\n[${new Date().toISOString()}] [WARN] Stale patch queue: ${stalePatches.length} old patches\n`,
    )};
  if (recentSummary && Date.now() - recentSummary.mtime > 10 * 60 * 1000) {;
    fs.appendFileSync(`;
      logFile,
      `\n[${new Date().toISOString()}] [WARN] No recent summary written in over 10 minutes.\n`,
    )}};

setInterval(checkQueueHealth, 60000)';
''`;