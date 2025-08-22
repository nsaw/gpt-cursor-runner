#!/usr/bin/env node

/**
 * Lock Checksum Once
 * Creates checksums for file immutability verification
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
      case '--file':
        config.filePath = args[++i];
        break;
      case '--many':
        config.manyFiles = args[++i].split(',');
        break;
      case '--manifest':
        config.manifestPath = args[++i];
        break;
      case '--signOut':
        config.signOutPath = args[++i];
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

function createChecksumManifest(files, algorithm = 'sha256') {
  const timestamp = new Date().toISOString();
  const manifest = {
    timestamp,
    algorithm,
    files: {}
  };

  for (const filePath of files) {
    try {
      const checksum = calculateFileChecksum(filePath, algorithm);
      const stats = fs.statSync(filePath);
      manifest.files[filePath] = {
        checksum,
        size: stats.size,
        modified: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error(`Error processing ${filePath}: ${error.message}`);
      manifest.files[filePath] = {
        error: error.message
      };
    }
  }

  return manifest;
}

function createSignature(manifest, privateKeyPath = null) {
  const manifestString = JSON.stringify(manifest, null, 2);
  const hash = crypto.createHash('sha256');
  hash.update(manifestString);
  const digest = hash.digest('hex');
  
  // For now, create a simple signature using the hash
  // In a production environment, this would use proper cryptographic signing
  const signature = {
    timestamp: new Date().toISOString(),
    algorithm: 'sha256',
    signature: digest,
    manifestHash: digest
  };

  return signature;
}

function main() {
  const config = parseArgs();

  try {
    let manifest;

    if (config.filePath) {
      // Single file mode
      manifest = createChecksumManifest([config.filePath], config.algorithm);
    } else if (config.manyFiles) {
      // Multiple files mode
      manifest = createChecksumManifest(config.manyFiles, config.algorithm);
    } else {
      throw new Error('Either --file or --many must be specified');
    }

    // Write manifest
    if (config.manifestPath) {
      fs.writeFileSync(config.manifestPath, JSON.stringify(manifest, null, 2));
      console.log(`CHECKSUM_MANIFEST_WRITTEN:${config.manifestPath}`);
    }

    // Create and write signature if requested
    if (config.signOutPath) {
      const signature = createSignature(manifest);
      fs.writeFileSync(config.signOutPath, JSON.stringify(signature, null, 2));
      console.log(`SIGNATURE_WRITTEN:${config.signOutPath}`);
    }

    // Output summary
    const fileCount = Object.keys(manifest.files).length;
    const errorCount = Object.values(manifest.files).filter(f => f.error).length;
    console.log(`CHECKSUM_LOCK_COMPLETED: ${fileCount} files processed, ${errorCount} errors`);

    process.exit(errorCount === 0 ? 0 : 1);

  } catch (error) {
    console.error('CHECKSUM_LOCK_ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { calculateFileChecksum, createChecksumManifest, createSignature };
