const express = require('express');
const router = express.Router();

// API status endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    service: 'ghost-runner-api',
    timestamp: new Date().toISOString()
  });
});

// API patches endpoint
router.post('/patches', async (req, res) => {
  try {
    const patchData = req.body;
    console.log('Received patch data:', patchData);
    
    // Process the patch data (placeholder for now)
    const result = {
      status: 'success',
      message: 'Patch received and queued for processing',
      patchId: patchData.id || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing patch:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API summaries endpoint
router.post('/summaries', async (req, res) => {
  try {
    const summaryData = req.body;
    console.log('Received summary data:', summaryData);
    
    // Process the summary data (placeholder for now)
    const result = {
      status: 'success',
      message: 'Summary received and stored',
      summaryId: summaryData.id || 'unknown',
      timestamp: new Date().toISOString()
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error processing summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 