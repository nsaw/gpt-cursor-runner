// 🔁 PATCH ROUTER — HARDENED + LOGGING
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const PATCHES_DIR = process.env.PATCHES_DIRECTORY || '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';
const MAIN_PATCH_DIR = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/';
const FAILED_DIR = path.join(PATCHES_DIR, '.failed/');
const REJECTED_DIR = path.join(PATCHES_DIR, '.rejected/');
const LOG_DIR = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/';
const LOG_PATH = path.join(LOG_DIR, 'patch-delivery.log');

// Ensure all directories exist
[FAILED_DIR, REJECTED_DIR, LOG_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.error(`Failed to create directory ${dir}:`, err.message);
    }
  }
});

function validatePatch(patch) {
  if (!patch || typeof patch !== 'object') {
    return { valid: false, reason: 'invalid_patch_object' };
  }
  
  if (typeof patch.blockId !== 'string' || patch.blockId.length <= 3) {
    return { valid: false, reason: 'invalid_blockId' };
  }
  
  if (!Array.isArray(patch.mutations) || patch.mutations.length === 0) {
    return { valid: false, reason: 'invalid_mutations_array' };
  }
  
  if (typeof patch.mutations[0].path !== 'string') {
    return { valid: false, reason: 'invalid_mutation_path' };
  }
  
  if (typeof patch.version !== 'string') {
    return { valid: false, reason: 'invalid_version' };
  }
  
  return { valid: true, reason: 'valid' };
}

function logRequest(id, status, patch, reason = '', details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    patchId: id,
    status,
    reason,
    details,
    patchKeys: patch ? Object.keys(patch) : [],
    mutationsCount: patch?.mutations?.length || 0
  };
  
  const logLine = `[${timestamp}] PATCH ${id} → ${status}${reason ? ` | Reason: ${reason}` : ''} | Keys: ${logEntry.patchKeys.join(',')} | Mutations: ${logEntry.mutationsCount}\n`;
  
  try {
    fs.appendFileSync(LOG_PATH, logLine);
  } catch (err) {
    console.error('Failed to write to log file:', err.message);
  }
  
  // Store rejected patches for analysis
  if (status === 'REJECTED') {
    try {
      const rejectPath = path.join(REJECTED_DIR, `${id}.json`);
      fs.writeFileSync(rejectPath, JSON.stringify({ ...patch, _rejection: { reason, timestamp } }, null, 2));
    } catch (err) {
      console.error('Failed to store rejected patch:', err.message);
    }
  }
}

router.post('/api/patches', (req, res) => {
  const startTime = Date.now();
  const patch = req.body;
  const id = patch?.blockId || `unknown-${Date.now()}`;
  const filename = `${id}.json`;

  // Log incoming request
  logRequest(id, 'RECEIVED', patch, '', { 
    contentType: req.get('Content-Type'),
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  });

  try {
    // Validate request body
    if (!patch || typeof patch !== 'object') {
      logRequest(id, 'REJECTED', patch, 'missing_or_invalid_body');
      return res.status(400).json({ 
        ok: false, 
        reason: 'missing_or_invalid_body', 
        id,
        message: 'Request body is missing or invalid'
      });
    }

    // Validate patch schema
    const validation = validatePatch(patch);
    if (!validation.valid) {
      logRequest(id, 'REJECTED', patch, validation.reason);
      return res.status(400).json({ 
        ok: false, 
        reason: validation.reason, 
        id,
        message: `Schema validation failed: ${validation.reason}`
      });
    }

    // Determine destination based on validation
    const destination = path.join(PATCHES_DIR, filename);
    
    // Write patch to disk
    try {
      fs.writeFileSync(destination, JSON.stringify(patch, null, 2));
    } catch (writeErr) {
      logRequest(id, 'REJECTED', patch, 'disk_write_failed', { error: writeErr.message });
      return res.status(500).json({ 
        ok: false, 
        reason: 'disk_write_failed', 
        id,
        message: `Failed to write patch to disk: ${writeErr.message}`
      });
    }

    // Verify file was written
    if (!fs.existsSync(destination)) {
      logRequest(id, 'REJECTED', patch, 'file_verification_failed');
      return res.status(500).json({ 
        ok: false, 
        reason: 'file_verification_failed', 
        id,
        message: 'File write succeeded but file does not exist'
      });
    }

    // Copy to MAIN if validation passed
    try {
      const mainCopy = path.join(MAIN_PATCH_DIR, filename);
      fs.copyFileSync(destination, mainCopy);
      
      const processingTime = Date.now() - startTime;
      logRequest(id, 'ACCEPTED', patch, '', { 
        processingTimeMs: processingTime,
        destination,
        mainCopy
      });
      
      return res.status(200).json({ 
        ok: true, 
        id, 
        message: 'Patch stored and copied to MAIN',
        path: destination,
        processingTimeMs: processingTime
      });
    } catch (copyErr) {
      logRequest(id, 'PARTIAL_SUCCESS', patch, 'main_copy_failed', { error: copyErr.message });
      return res.status(200).json({ 
        ok: true, 
        id, 
        message: 'Patch stored but MAIN copy failed',
        path: destination,
        warning: `Main copy failed: ${copyErr.message}`
      });
    }

  } catch (err) {
    const processingTime = Date.now() - startTime;
    logRequest(id, 'REJECTED', patch, 'unexpected_error', { 
      error: err.message,
      processingTimeMs: processingTime
    });
    
    return res.status(500).json({ 
      ok: false, 
      reason: 'unexpected_error', 
      id,
      message: `Unexpected error: ${err.message}`,
      processingTimeMs: processingTime
    });
  }
});

module.exports = router; 