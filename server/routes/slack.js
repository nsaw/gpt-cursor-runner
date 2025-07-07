const express = require('express');
const router = express.Router();
const handleDashboard = require('../handlers/handleDashboard');
const handlePatchApprove = require('../handlers/handlePatchApprove');
const handlePatchRevert = require('../handlers/handlePatchRevert');
const handlePauseRunner = require('../handlers/handlePauseRunner');
const handleStatusRunner = require('../handlers/handleStatusRunner');
const handleShowRoadmap = require('../handlers/handleShowRoadmap');
const handleRoadmap = require('../handlers/handleRoadmap');
const handleKill = require('../handlers/handleKill');
const handleToggleRunnerOn = require('../handlers/handleToggleRunnerOn');
const handleToggleRunnerOff = require('../handlers/handleToggleRunnerOff');
const handleToggleRunnerAuto = require('../handlers/handleToggleRunnerAuto');
const handleTheme = require('../handlers/handleTheme');
const handleThemeStatus = require('../handlers/handleThemeStatus');
const handleThemeFix = require('../handlers/handleThemeFix');
const handlePatchPreview = require('../handlers/handlePatchPreview');
const handleRevertPhase = require('../handlers/handleRevertPhase');
const handleLogPhaseStatus = require('../handlers/handleLogPhaseStatus');
const handleCursorMode = require('../handlers/handleCursorMode');
const handleWhoami = require('../handlers/handleWhoami');
const handleLockRunner = require('../handlers/handleLockRunner');
const handleUnlockRunner = require('../handlers/handleUnlockRunner');
const handleAlertRunnerCrash = require('../handlers/handleAlertRunnerCrash');
const handleProceed = require('../handlers/handleProceed');
const handleAgain = require('../handlers/handleAgain');
const handleManualRevise = require('../handlers/handleManualRevise');
const handleManualAppend = require('../handlers/handleManualAppend');
const handleInterrupt = require('../handlers/handleInterrupt');
const handleTroubleshoot = require('../handlers/handleTroubleshoot');
const handleTroubleshootOversight = require('../handlers/handleTroubleshootOversight');
const handleSendWith = require('../handlers/handleSendWith');
const handleGPTSlackDispatch = require('../handlers/handleGPTSlackDispatch');
const handleCursorSlackDispatch = require('../handlers/handleCursorSlackDispatch');

router.post('/commands', (req, res) => {
  const { command } = req.body;
  const routes = {
    '/dashboard': handleDashboard,
    '/patch-approve': handlePatchApprove,
    '/patch-revert': handlePatchRevert,
    '/pause-runner': handlePauseRunner,
    '/status-runner': handleStatusRunner,
    '/show-roadmap': handleShowRoadmap,
    '/roadmap': handleRoadmap,
    '/kill': handleKill,
    '/toggle-runner-on': handleToggleRunnerOn,
    '/toggle-runner-off': handleToggleRunnerOff,
    '/toggle-runner-auto': handleToggleRunnerAuto,
    '/theme': handleTheme,
    '/theme-status': handleThemeStatus,
    '/theme-fix': handleThemeFix,
    '/patch-preview': handlePatchPreview,
    '/revert-phase': handleRevertPhase,
    '/log-phase-status': handleLogPhaseStatus,
    '/cursor-mode': handleCursorMode,
    '/whoami': handleWhoami,
    '/lock-runner': handleLockRunner,
    '/unlock-runner': handleUnlockRunner,
    '/alert-runner-crash': handleAlertRunnerCrash,
    '/proceed': handleProceed,
    '/again': handleAgain,
    '/manual-revise': handleManualRevise,
    '/manual-append': handleManualAppend,
    '/interrupt': handleInterrupt,
    '/troubleshoot': handleTroubleshoot,
    '/troubleshoot-oversight': handleTroubleshootOversight,
    '/send-with': handleSendWith,
    '/gpt-slack-dispatch': handleGPTSlackDispatch,
    '/cursor-slack-dispatch': handleCursorSlackDispatch,
  };
  if (routes[command]) return routes[command](req, res);
  res.send(`❓ Unknown slash command: ${command}`);
});

module.exports = router;
