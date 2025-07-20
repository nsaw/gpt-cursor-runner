const statusRunner = require('./handleStatusRunner');
const dashboard = require('./handleDashboard');
const patchPass = require('./handlePatchPass');
const patchRevert = require('./handlePatchRevert');
const restartRunner = require('./handleRestartRunner');
const roadmap = require('./handleRoadmap');
const kill = require('./handleKill');
const statusPush = require('./handleStatusPush');
const patchPreview = require('./handlePatchPreview');
const approveScreenshot = require('./handleApproveScreenshot');
const revertPhase = require('./handleRevertPhase');
const logPhaseStatus = require('./handleLogPhaseStatus');
const cursorMode = require('./handleCursorMode');
const alertRunnerCrash = require('./handleAlertRunnerCrash');
const proceed = require('./handleProceed');
const again = require('./handleAgain');
const manualRevise = require('./handleManualRevise');
const manualAppend = require('./handleManualAppend');
const interrupt = require('./handleInterrupt');
const troubleshoot = require('./handleTroubleshoot');
const sendWith = require('./handleSendWith');
const troubleshootOversight = require('./handleTroubleshootOversight');
const watchdogPing = require('./handleWatchdogPing');
const toggleRunner = require('./handleToggleRunner');
const runnerLock = require('./handleRunnerLock');

module.exports = {
  '/status-runner': statusRunner,
  '/dashboard': dashboard,
  '/patch-pass': patchPass,
  '/patch-revert': patchRevert,
  '/restart-runner': restartRunner,
  '/roadmap': roadmap,
  '/kill': kill,
  '/status-push': statusPush,
  '/patch-preview': patchPreview,
  '/approve-screenshot': approveScreenshot,
  '/revert-phase': revertPhase,
  '/log-phase-status': logPhaseStatus,
  '/cursor-mode': cursorMode,
  '/alert-runner-crash': alertRunnerCrash,
  '/proceed': proceed,
  '/again': again,
  '/manual-revise': manualRevise,
  '/manual-append': manualAppend,
  '/interrupt': interrupt,
  '/troubleshoot': troubleshoot,
  '/send-with': sendWith,
  '/troubleshoot-oversight': troubleshootOversight,
  '/watchdog-ping': watchdogPing,
  '/toggle-runner': toggleRunner,
  '/runner-lock': runnerLock
}; 