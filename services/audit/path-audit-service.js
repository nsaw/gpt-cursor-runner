#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const CONFIG = {
  // Allowed writer roots
  allowedWriterRoots: [
    '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/',
    '/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/'
  ],
  
  // Allowed mirror roots
  allowedMirrorRoots: [
    '/Users/sawyer/gitSync/_GPTsync/__CYOPS-SYNC__/',
    '/Users/sawyer/gitSync/_GPTsync/__MAIN-SYNC__/',
    '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/'
  ],
  
  // Reports directory
  reportsDir: '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/reports/',
  
  // Public status mirror
  publicStatusDir: '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/',
  
  // Scan interval (1 hour)
  scanIntervalMs: 60 * 60 * 1000
};

class PathAuditService {
  constructor() {
    this.ensureDirectories();
    this.violations = [];
    this.lastScan = null;
  }

  ensureDirectories() {
    [CONFIG.reportsDir, CONFIG.publicStatusDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  isAllowedPath(filePath) {
    const normalizedPath = path.resolve(filePath);
    
    // Check if path is under allowed writer roots
    for (const root of CONFIG.allowedWriterRoots) {
      if (normalizedPath.startsWith(path.resolve(root))) {
        return true;
      }
    }
    
    // Check if path is under allowed mirror roots
    for (const root of CONFIG.allowedMirrorRoots) {
      if (normalizedPath.startsWith(path.resolve(root))) {
        return true;
      }
    }
    
    return false;
  }

  scanForViolations() {
    this.log('Starting path audit scan...');
    this.violations = [];
    
    // Scan common directories for artifacts
    const scanTargets = [
      '/Users/sawyer/gitSync/gpt-cursor-runner/',
      '/Users/sawyer/gitSync/tm-mobile-cursor/'
    ];
    
    for (const target of scanTargets) {
      this.scanDirectory(target);
    }
    
    this.lastScan = new Date().toISOString();
    const clean = this.violations.length === 0;
    
    this.log(`Path audit complete. Violations: ${this.violations.length}, Clean: ${clean}`);
    
    return {
      timestamp: this.lastScan,
      clean,
      violations: this.violations,
      totalScanned: scanTargets.length
    };
  }

  scanDirectory(dirPath, depth = 0) {
    if (depth > 3) return; // Limit recursion depth
    
    try {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        
        // Skip common directories that shouldn't contain artifacts
        if (['node_modules', '.git', '.expo', 'build', 'dist', '.next'].includes(item)) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.scanDirectory(fullPath, depth + 1);
        } else if (this.isArtifactFile(item)) {
          if (!this.isAllowedPath(fullPath)) {
            this.violations.push({
              path: fullPath,
              reason: 'Artifact file outside allowed writer/mirror roots',
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      this.log(`Error scanning directory ${dirPath}: ${error.message}`);
    }
  }

  isArtifactFile(filename) {
    const artifactExtensions = ['.json', '.md', '.log', '.txt', '.yml', '.yaml'];
    const artifactPatterns = [
      'status', 'report', 'summary', 'proof', 'audit', 'drift',
      'health', 'ingress', 'wrapper', 'filename', 'quarantine'
    ];
    
    const ext = path.extname(filename).toLowerCase();
    const name = filename.toLowerCase();
    
    // Check if it's a known artifact file
    if (artifactExtensions.includes(ext)) {
      for (const pattern of artifactPatterns) {
        if (name.includes(pattern)) {
          return true;
        }
      }
    }
    
    return false;
  }

  writeReport(scanResult) {
    const reportPath = path.join(CONFIG.reportsDir, `path-audit-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(scanResult, null, 2));
    
    // Update public status mirror
    const publicStatus = {
      timestamp: scanResult.timestamp,
      clean: scanResult.clean,
      violations: scanResult.violations.length,
      lastScan: scanResult.timestamp,
      status: scanResult.clean ? 'PASS' : 'FAIL'
    };
    
    const publicStatusPath = path.join(CONFIG.publicStatusDir, 'path_audit.json');
    fs.writeFileSync(publicStatusPath, JSON.stringify(publicStatus, null, 2));
    
    this.log(`Report written: ${reportPath}`);
    this.log(`Public status updated: ${publicStatusPath}`);
  }

  start() {
    this.log('Path Audit Service starting...');
    
    // Initial scan
    const result = this.scanForViolations();
    this.writeReport(result);
    
    // Schedule hourly scans
    setInterval(() => {
      const result = this.scanForViolations();
      this.writeReport(result);
      
      // If violations found, log alert
      if (!result.clean) {
        this.log(`🚨 PATH VIOLATIONS DETECTED: ${result.violations.length} violations found`);
        this.violations.forEach(v => {
          this.log(`  - ${v.path}: ${v.reason}`);
        });
      }
    }, CONFIG.scanIntervalMs);
    
    this.log('Path Audit Service started - hourly scans active');
  }

  stop() {
    this.log('Path Audit Service stopping...');
    process.exit(0);
  }
}

// Handle signals
process.on('SIGINT', () => {
  this.log('Received SIGINT, stopping service...');
  this.stop();
});

process.on('SIGTERM', () => {
  this.log('Received SIGTERM, stopping service...');
  this.stop();
});

if (require.main === module) {
  const service = new PathAuditService();
  service.start();
}

module.exports = PathAuditService;
