const express = require('express');
const router = express.Router();
const { handlePlistStatus } = require('../handlers/handlePlistStatus');
const { handleRecoveryStatus } = require('../handlers/handleRecoveryStatus');

// Plist status API endpoint
router.get('/plist-status', async (req, res) => {
  await handlePlistStatus(req, res);
});

// Recovery status API endpoint
router.get('/recovery-status', async (req, res) => {
  await handleRecoveryStatus(req, res);
});

module.exports = router;