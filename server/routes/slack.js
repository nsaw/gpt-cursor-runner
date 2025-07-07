const express = require('express');
const router = express.Router();
const handleDashboard = require('../handlers/handleDashboard');
const handlePatchApprove = require('../handlers/handlePatchApprove');
const handlePatchRevert = require('../handlers/handlePatchRevert');
const handlePauseRunner = require('../handlers/handlePauseRunner');
const handleRestartRunner = require('../handlers/handleRestartRunner');
const handleRestartRunnerGpt = require('../handlers/handleRestartRunnerGpt');
const handleContinueRunner = require('../handlers/handleContinueRunner');
const handleStatus = require('../handlers/handleStatus');
const handleShowRoadmap = require('../handlers/handleShowRoadmap');
const handleRoadmap = require('../handlers/handleRoadmap');
const handleKillRunner = require('../handlers/handleKillRunner');
const handleToggleRunnerOn = require('../handlers/handleToggleRunnerOn');
const handleToggleRunnerOff = require('../handlers/handleToggleRunnerOff');
const handleToggleRunnerAuto = require('../handlers/handleToggleRunnerAuto');
const handleTheme = require('../handlers/handleTheme');
const handleThemeStatus = require('../handlers/handleThemeStatus');
const handleThemeFix = require('../handlers/handleThemeFix');
const handlePatchPreview = require('../handlers/handlePatchPreview');
const handleApproveScreenshot = require('../handlers/handleApproveScreenshot');
const handleRevertPhase = require('../handlers/handleRevertPhase');
const handleLogPhaseStatus = require('../handlers/handleLogPhaseStatus');
const handleCursorMode = require('../handlers/handleCursorMode');
const handleWhoami = require('../handlers/handleWhoami');
const handleRetryLastFailed = require('../handlers/handleRetryLastFailed');
const handleLockRunner = require('../handlers/handleLockRunner');
const handleUnlockRunner = require('../handlers/handleUnlockRunner');
const handleAlertRunnerCrash = require('../handlers/handleAlertRunnerCrash');

router.post('/commands', (req, res) => {
  const { command } = req.body;
  const routes = {
    '/dashboard': handleDashboard,
    '/patch-approve': handlePatchApprove,
    '/patch-revert': handlePatchRevert,
    '/pause-runner': handlePauseRunner,
    '/restart-runner': handleRestartRunner,
    '/restart-runner-gpt': handleRestartRunnerGpt,
    '/continue-runner': handleContinueRunner,
    '/status': handleStatus,
    '/show-roadmap': handleShowRoadmap,
    '/roadmap': handleRoadmap,
    '/kill-runner': handleKillRunner,
    '/toggle-runner-on': handleToggleRunnerOn,
    '/toggle-runner-off': handleToggleRunnerOff,
    '/toggle-runner-auto': handleToggleRunnerAuto,
    '/theme': handleTheme,
    '/theme-status': handleThemeStatus,
    '/theme-fix': handleThemeFix,
    '/patch-preview': handlePatchPreview,
    '/approve-screenshot': handleApproveScreenshot,
    '/revert-phase': handleRevertPhase,
    '/log-phase-status': handleLogPhaseStatus,
    '/cursor-mode': handleCursorMode,
    '/whoami': handleWhoami,
    '/retry-last-failed': handleRetryLastFailed,
    '/lock-runner': handleLockRunner,
    '/unlock-runner': handleUnlockRunner,
    '/alert-runner-crash': handleAlertRunnerCrash,
  };
  if (routes[command]) return routes[command](req, res);
  res.send(`❓ Unknown slash command: ${command}`);
});

module.exports = router;
