#!/usr/bin/env node

/**
 * Verify Anchors Once
 * NB2.0: direct Node, non-blocking
 * Verifies file checksums against anchors manifest
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function verifyAnchors() {
  try {
    const manifestPath = path.resolve('/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_freeze/anchors.manifest.json');
    const out = path.resolve('/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/_freeze/anchors.verify.json');
    
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const results = [];
    
    for (const file of manifest.files) {
      const exists = fs.existsSync(file.path);
      let checksum = null;
      let match = false;
      
      if (exists) {
        checksum = crypto.createHash('sha256').update(fs.readFileSync(file.path)).digest('hex');
        match = (file.sha256 === 'AUTO_COMPUTE' || file.sha256 === checksum);
      }
      
      results.push({
        path: file.path,
        exists,
        sha256: checksum,
        match
      });
    }
    
    const output = {
      version: manifest.version,
      timestamp: Date.now(),
      results
    };
    
    fs.writeFileSync(out, JSON.stringify(output, null, 2));
    
    const mismatches = results.filter(r => r.exists && r.sha256 && !r.match);
    if (mismatches.length > 0) {
      console.error('ANCHORS_VERIFY_FAIL: Found mismatches:', mismatches.length);
      process.exitCode = 2;
    } else {
      console.log('ANCHORS_VERIFY_PASS: All anchors match');
    }
    
  } catch (error) {
    console.error('ANCHORS_VERIFY_ERROR:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  verifyAnchors();
}

module.exports = { verifyAnchors };
