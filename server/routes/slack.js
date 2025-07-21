const express = require('express');
const router = express.Router();

// Core Runner Control Handlers
const handleDashboard = require('../handlers/handleDashboard');
const handleStatusRunner = require('../handlers/handleStatusRunner');
const handleStatusPush = require('../handlers/handleStatusPush');
const handleRestartRunner = require('../handlers/handleRestartRunner');
const handleKill = require('../handlers/handleKill');
const handleToggleRunner = require('../handlers/handleToggleRunner');
const handleRunnerLock = require('../handlers/handleRunnerLock');
const handleWatchdogPing = require('../handlers/handleWatchdogPing');

// Patch Management Handlers
const handlePatchPass = require('../handlers/handlePatchPass');
const handlePatchRevert = require('../handlers/handlePatchRevert');
const handlePatchPreview = require('../handlers/handlePatchPreview');
const handleApproveScreenshot = require('../handlers/handleApproveScreenshot');
const handleRevertPhase = require('../handlers/handleRevertPhase');
const handleLogPhaseStatus = require('../handlers/handleLogPhaseStatus');
const handleCursorMode = require('../handlers/handleCursorMode');

// Workflow Control Handlers
const handleProceed = require('../handlers/handleProceed');
const handleAgain = require('../handlers/handleAgain');
const handleManualRevise = require('../handlers/handleManualRevise');
const handleManualAppend = require('../handlers/handleManualAppend');
const handleInterrupt = require('../handlers/handleInterrupt');

// Troubleshooting & Diagnostics Handlers
const handleTroubleshoot = require('../handlers/handleTroubleshoot');
const handleTroubleshootOversight = require('../handlers/handleTroubleshootOversight');
const handleSendWith = require('../handlers/handleSendWith');

// Information & Alerts Handlers
const handleRoadmap = require('../handlers/handleRoadmap');
const handleAlertRunnerCrash = require('../handlers/handleAlertRunnerCrash');

router.post('/commands', (req, res) => {
  const { command } = req.body;
  
  // Essential 25 Commands
  const routes = {
    // Core Runner Control (8 commands)
    '/dashboard': handleDashboard,
    '/status-runner': handleStatusRunner,
    '/status-push': handleStatusPush,
    '/restart-runner': handleRestartRunner,
    '/kill': handleKill,
    '/toggle-runner': handleToggleRunner,
    '/runner-lock': handleRunnerLock,
    '/watchdog-ping': handleWatchdogPing,
    
    // Patch Management (7 commands)
    '/patch-pass': handlePatchPass,
    '/patch-revert': handlePatchRevert,
    '/patch-preview': handlePatchPreview,
    '/approve-screenshot': handleApproveScreenshot,
    '/revert-phase': handleRevertPhase,
    '/log-phase-status': handleLogPhaseStatus,
    '/cursor-mode': handleCursorMode,
    
    // Workflow Control (5 commands)
    '/proceed': handleProceed,
    '/again': handleAgain,
    '/manual-revise': handleManualRevise,
    '/manual-append': handleManualAppend,
    '/interrupt': handleInterrupt,
    
    // Troubleshooting & Diagnostics (3 commands)
    '/troubleshoot': handleTroubleshoot,
    '/troubleshoot-oversight': handleTroubleshootOversight,
    '/send-with': handleSendWith,
    
    // Information & Alerts (2 commands)
    '/roadmap': handleRoadmap,
    '/alert-runner-crash': handleAlertRunnerCrash,
  };
  
  if (routes[command]) {
    return routes[command](req, res);
  }
  
  res.send(`❓ Unknown slash command: ${command}\n\nAvailable commands: ${Object.keys(routes).join(', ')}`);
});

module.exports = router;
