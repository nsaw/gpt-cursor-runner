#!/usr/bin/env node

/**
 * Verify Checksum Once
 * Verifies checksums for file immutability verification
 * Node-only implementation with no shell dependencies
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const DEFAULT_CONFIG = {
  algorithm: 'sha256',
  encoding: 'hex'
};

function parseArgs() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--manifest':
        config.manifestPath = args[++i];
        break;
      case '--algorithm':
        config.algorithm = args[++i] || DEFAULT_CONFIG.algorithm;
        break;
    }
  }

  return config;
}

function calculateFileChecksum(filePath, algorithm = 'sha256') {
  try {
    const content = fs.readFileSync(filePath);
    const hash = crypto.createHash(algorithm);
    hash.update(content);
    return hash.digest('hex');
  } catch (error) {
    throw new Error(`Failed to calculate checksum for ${filePath}: ${error.message}`);
  }
}

function verifyChecksumManifest(manifestPath, algorithm = 'sha256') {
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    const timestamp = new Date().toISOString();
    const verificationResult = {
      timestamp,
      manifestPath,
      algorithm,
      files: {},
      summary: {
        totalFiles: 0,
        verifiedFiles: 0,
        failedFiles: 0,
        missingFiles: 0
      }
    };

    for (const [filePath, fileInfo] of Object.entries(manifest.files)) {
      verificationResult.summary.totalFiles++;

      if (fileInfo.error) {
        verificationResult.files[filePath] = {
          status: 'ERROR',
          error: fileInfo.error
        };
        verificationResult.summary.failedFiles++;
        continue;
      }

      if (!fs.existsSync(filePath)) {
        verificationResult.files[filePath] = {
          status: 'MISSING',
          expectedChecksum: fileInfo.checksum
        };
        verificationResult.summary.missingFiles++;
        continue;
      }

      try {
        const currentChecksum = calculateFileChecksum(filePath, algorithm);
        const isMatch = currentChecksum === fileInfo.checksum;

        verificationResult.files[filePath] = {
          status: isMatch ? 'VERIFIED' : 'MODIFIED',
          expectedChecksum: fileInfo.checksum,
          currentChecksum: currentChecksum,
          match: isMatch
        };

        if (isMatch) {
          verificationResult.summary.verifiedFiles++;
        } else {
          verificationResult.summary.failedFiles++;
        }
      } catch (error) {
        verificationResult.files[filePath] = {
          status: 'ERROR',
          error: error.message,
          expectedChecksum: fileInfo.checksum
        };
        verificationResult.summary.failedFiles++;
      }
    }

    return verificationResult;
  } catch (error) {
    throw new Error(`Failed to verify manifest ${manifestPath}: ${error.message}`);
  }
}

function main() {
  const config = parseArgs();

  if (!config.manifestPath) {
    console.error('Usage: node verify_checksum_once.js --manifest <manifest.json>');
    process.exit(1);
  }

  try {
    const result = verifyChecksumManifest(config.manifestPath, config.algorithm);

    // Output summary
    console.log(`CHECKSUM_VERIFICATION_COMPLETED: ${result.summary.verifiedFiles}/${result.summary.totalFiles} files verified`);
    console.log(`MISSING_FILES: ${result.summary.missingFiles}`);
    console.log(`FAILED_FILES: ${result.summary.failedFiles}`);

    // Exit with appropriate code
    const hasFailures = result.summary.failedFiles > 0 || result.summary.missingFiles > 0;
    process.exit(hasFailures ? 1 : 0);

  } catch (error) {
    console.error('CHECKSUM_VERIFICATION_ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateFileChecksum, verifyChecksumManifest };
