#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  CYOPS_SPOOL: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches',
  MAIN_SPOOL: '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches',
  CYOPS_QUEUE: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/queue',
  MAIN_QUEUE: '/Users/sawyer/gitSync/.cursor-cache/MAIN/queue',
  CYOPS_REPORTS: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/reports',
  MAIN_REPORTS: '/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/reports',
  LOG_FILE: '/Users/sawyer/gitSync/gpt-cursor-runner/logs/ghost/spool-watcher.log',
  SCAN_INTERVAL: 3000, // 3 seconds
  MAX_FILENAME_LENGTH: 200,
  ALLOWED_EXTENSIONS: ['.json']
};

// Ensure directories exist
Object.entries(CONFIG).forEach(([key, dir]) => {
  if (typeof dir === 'string' && dir.includes('/') && !dir.includes('.')) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      // Directory might already exist
    }
  }
});

class SpoolWatcher {
  constructor() {
    this.isRunning = false;
    this.stats = {
      totalScanned: 0,
      promoted: 0,
      rejected: 0,
      errors: 0,
      lastRun: null
    };
    this.setupLogging();
  }

  setupLogging() {
    const logDir = path.dirname(CONFIG.LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    if (!fs.existsSync(CONFIG.LOG_FILE)) {
      fs.writeFileSync(CONFIG.LOG_FILE, '');
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    try {
      fs.appendFileSync(CONFIG.LOG_FILE, logEntry);
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
    
    console.log(`[${timestamp}] [${level}] ${message}`);
  }

  validatePatch(patchFile, domain) {
    try {
      // Check filename length
      const fileName = path.basename(patchFile);
      if (fileName.length > CONFIG.MAX_FILENAME_LENGTH) {
        return {
          valid: false,
          reason: 'filename_too_long',
          message: `Filename '${fileName}' exceeds maximum length of ${CONFIG.MAX_FILENAME_LENGTH} characters`
        };
      }

      // Check file extension
      const ext = path.extname(fileName);
      if (!CONFIG.ALLOWED_EXTENSIONS.includes(ext)) {
        return {
          valid: false,
          reason: 'invalid_extension',
          message: `File extension '${ext}' is not allowed. Allowed: ${CONFIG.ALLOWED_EXTENSIONS.join(', ')}`
        };
      }

      // Check if file is readable
      if (!fs.existsSync(patchFile)) {
        return {
          valid: false,
          reason: 'file_not_found',
          message: `File '${patchFile}' not found`
        };
      }

      // Check if file is readable
      try {
        fs.accessSync(patchFile, fs.constants.R_OK);
      } catch (err) {
        return {
          valid: false,
          reason: 'file_not_readable',
          message: `File '${patchFile}' is not readable`
        };
      }

      // Check if file is not empty
      const stats = fs.statSync(patchFile);
      if (stats.size === 0) {
        return {
          valid: false,
          reason: 'file_empty',
          message: `File '${patchFile}' is empty`
        };
      }

      // Try to parse JSON
      try {
        const content = fs.readFileSync(patchFile, 'utf8');
        const patch = JSON.parse(content);
        
        // Basic schema validation
        if (!patch.blockId || typeof patch.blockId !== 'string') {
          return {
            valid: false,
            reason: 'invalid_schema',
            message: 'Missing or invalid blockId field'
          };
        }

        if (!patch.description || typeof patch.description !== 'string') {
          return {
            valid: false,
            reason: 'invalid_schema',
            message: 'Missing or invalid description field'
          };
        }

        if (!patch.target || typeof patch.target !== 'string') {
          return {
            valid: false,
            reason: 'invalid_schema',
            message: 'Missing or invalid target field'
          };
        }

        if (!patch.version || typeof patch.version !== 'string') {
          return {
            valid: false,
            reason: 'invalid_schema',
            message: 'Missing or invalid version field'
          };
        }

        return {
          valid: true,
          reason: 'valid',
          message: 'Patch validation passed'
        };

      } catch (err) {
        return {
          valid: false,
          reason: 'invalid_json',
          message: `Invalid JSON: ${err.message}`
        };
      }

    } catch (err) {
      return {
        valid: false,
        reason: 'validation_error',
        message: `Validation error: ${err.message}`
      };
    }
  }

  async promotePatch(patchFile, domain) {
    try {
      const fileName = path.basename(patchFile);
      const queueDir = CONFIG[`${domain}_QUEUE`];
      const queuePath = path.join(queueDir, fileName);

      // Move file to queue
      fs.renameSync(patchFile, queuePath);
      
      this.log(`Promoted patch: ${fileName} to ${domain} queue`);
      this.stats.promoted++;
      
      return true;
    } catch (err) {
      this.log(`Failed to promote patch ${patchFile}: ${err.message}`, 'ERROR');
      this.stats.errors++;
      return false;
    }
  }

  async rejectPatch(patchFile, domain, reason, message) {
    try {
      const fileName = path.basename(patchFile);
      const rejectedDir = path.join(CONFIG[`${domain}_SPOOL`], '.rejected');
      
      // Ensure rejected directory exists
      if (!fs.existsSync(rejectedDir)) {
        fs.mkdirSync(rejectedDir, { recursive: true });
      }

      const rejectedPath = path.join(rejectedDir, fileName);
      
      // Move file to rejected directory
      fs.renameSync(patchFile, rejectedPath);
      
      // Create rejection report
      const report = {
        fileName: fileName,
        domain: domain,
        timestamp: new Date().toISOString(),
        reason: reason,
        message: message,
        originalPath: patchFile
      };

      const reportFile = path.join(CONFIG[`${domain}_REPORTS`], `rejection-${Date.now()}.json`);
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
      
      this.log(`Rejected patch: ${fileName} - ${reason}: ${message}`);
      this.stats.rejected++;
      
      return true;
    } catch (err) {
      this.log(`Failed to reject patch ${patchFile}: ${err.message}`, 'ERROR');
      this.stats.errors++;
      return false;
    }
  }

  async scanSpool(domain) {
    const spoolDir = CONFIG[`${domain}_SPOOL`];
    
    try {
      if (fs.existsSync(spoolDir)) {
        const files = fs.readdirSync(spoolDir)
          .filter(file => !file.startsWith('.') && !file.endsWith('.md'))
          .filter(file => CONFIG.ALLOWED_EXTENSIONS.some(ext => file.endsWith(ext)));

        for (const file of files) {
          const filePath = path.join(spoolDir, file);
          
          // Skip if it's a directory
          if (fs.statSync(filePath).isDirectory()) {
            continue;
          }

          this.stats.totalScanned++;
          
          // Validate patch
          const validation = this.validatePatch(filePath, domain);
          
          if (validation.valid) {
            // Promote to queue
            await this.promotePatch(filePath, domain);
          } else {
            // Reject patch
            await this.rejectPatch(filePath, domain, validation.reason, validation.message);
          }
        }
      }
    } catch (err) {
      this.log(`Error scanning ${domain} spool: ${err.message}`, 'ERROR');
    }
  }

  updateFilenameGuardReport(domain) {
    const reportFile = path.join(CONFIG[`${domain}_REPORTS`], 'filename-guard.json');
    const report = {
      timestamp: new Date().toISOString(),
      domain: domain,
      maxFilenameLength: CONFIG.MAX_FILENAME_LENGTH,
      allowedExtensions: CONFIG.ALLOWED_EXTENSIONS,
      stats: this.stats,
      status: this.stats.errors === 0 ? 'PASS' : 'FAIL'
    };
    
    try {
      fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    } catch (err) {
      this.log(`Failed to update filename guard report for ${domain}: ${err.message}`, 'ERROR');
    }
  }

  async scanAllSpools() {
    const domains = ['CYOPS', 'MAIN'];
    
    for (const domain of domains) {
      await this.scanSpool(domain);
      this.updateFilenameGuardReport(domain);
    }
    
    this.stats.lastRun = Date.now();
  }

  async start() {
    if (this.isRunning) {
      this.log('Service is already running');
      return;
    }

    this.isRunning = true;
    this.log('Spool Watcher Service starting...');

    // Start scanning loop
    const scanInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(scanInterval);
        return;
      }
      await this.scanAllSpools();
    }, CONFIG.SCAN_INTERVAL);

    // Handle shutdown gracefully
    process.on('SIGINT', () => {
      this.log('Shutting down gracefully...');
      this.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      this.log('Shutting down gracefully...');
      this.stop();
      process.exit(0);
    });

    this.log('Spool Watcher Service started successfully');
  }

  stop() {
    this.isRunning = false;
    this.log('Spool Watcher Service stopped');
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new SpoolWatcher();
  service.start().catch(err => {
    console.error('Failed to start service:', err);
    process.exit(1);
  });
}

module.exports = SpoolWatcher;
