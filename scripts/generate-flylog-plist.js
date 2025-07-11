#!/usr/bin/env node

/**
 * Fly Log Daemon Plist Generator
 * 
 * Generates macOS launchd .plist for safe-fly-logs daemon
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Fly log daemon specific configuration
const FLYLOG_CONFIG = {
  label: 'com.gpt.flylog',
  scriptPath: './scripts/safe-fly-logs.sh',
  workingDirectory: process.cwd(),
  logDir: './logs/fly',
  startInterval: 30,
  throttleInterval: 10,
  keepAlive: true,
  runAtLoad: true,
  processType: 'Background'
};

class FlyLogPlistGenerator {
  constructor() {
    this.operationUuid = crypto.randomUUID();
    this.startTime = Date.now();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${this.operationUuid}] ${message}`;
    console.log(logEntry);
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];
    
    // Check if safe-fly-logs.sh exists
    const scriptPath = path.resolve(FLYLOG_CONFIG.scriptPath);
    if (!fs.existsSync(scriptPath)) {
      errors.push(`Safe fly logs script not found: ${scriptPath}`);
    }
    
    // Check if working directory exists
    if (!fs.existsSync(FLYLOG_CONFIG.workingDirectory)) {
      errors.push(`Working directory not found: ${FLYLOG_CONFIG.workingDirectory}`);
    }
    
    // Check if log directory exists or can be created
    const logDir = path.resolve(FLYLOG_CONFIG.logDir);
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
        this.log(`Created log directory: ${logDir}`);
      } catch (error) {
        errors.push(`Cannot create log directory: ${logDir}`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    this.log('✅ Fly log daemon configuration validated');
    return true;
  }

  /**
   * Generate .plist content for Fly log daemon
   */
  generatePlistContent() {
    const scriptPath = path.resolve(FLYLOG_CONFIG.scriptPath);
    const workingDirectory = path.resolve(FLYLOG_CONFIG.workingDirectory);
    const logDir = path.resolve(FLYLOG_CONFIG.logDir);
    
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${FLYLOG_CONFIG.label}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>${scriptPath}</string>
        <string>start</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>${workingDirectory}</string>
    
    <key>RunAtLoad</key>
    <${FLYLOG_CONFIG.runAtLoad ? 'true' : 'false'}/>
    
    <key>KeepAlive</key>
    <${FLYLOG_CONFIG.keepAlive ? 'true' : 'false'}/>
    
    <key>StandardOutPath</key>
    <string>${logDir}/flylog-plist-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>${logDir}/flylog-plist-stderr.log</string>
    
    <key>ProcessType</key>
    <string>${FLYLOG_CONFIG.processType}</string>
    
    <key>ThrottleInterval</key>
    <integer>${FLYLOG_CONFIG.throttleInterval}</integer>
    
    <key>StartInterval</key>
    <integer>${FLYLOG_CONFIG.startInterval}</integer>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>FLYLOG_MODE</key>
        <string>launchd</string>
        <key>FLYLOG_INSTALLATION_UUID</key>
        <string>${this.operationUuid}</string>
        <key>PROJECT_NAME</key>
        <string>gpt-cursor-runner</string>
        <key>FLY_APP_NAME</key>
        <string>gpt-cursor-runner</string>
    </dict>
    
    <key>WatchPaths</key>
    <array>
        <string>${workingDirectory}/logs/fly</string>
        <string>${workingDirectory}/logs/fly-log-daemon.pid</string>
    </array>
    
    <key>QueueDirectories</key>
    <array>
        <string>${workingDirectory}/logs</string>
    </array>
</dict>
</plist>`;

    return plistContent;
  }

  /**
   * Get plist file path
   */
  getPlistPath() {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');
    
    // Ensure LaunchAgents directory exists
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
      this.log(`Created LaunchAgents directory: ${launchAgentsDir}`);
    }
    
    return path.join(launchAgentsDir, `${FLYLOG_CONFIG.label}.plist`);
  }

  /**
   * Generate and write .plist file
   */
  generate(writeToDisk = true) {
    try {
      this.log('🔧 Generating Fly log daemon plist...');
      
      // Validate configuration
      this.validateConfig();
      
      // Generate plist content
      const plistContent = this.generatePlistContent();
      const plistPath = this.getPlistPath();
      
      if (writeToDisk) {
        // Write plist file
        fs.writeFileSync(plistPath, plistContent, 'utf8');
        this.log(`✅ Plist written to: ${plistPath}`);
        
        // Set proper permissions
        fs.chmodSync(plistPath, 0o644);
        this.log('✅ Plist permissions set to 644');
        
        return {
          success: true,
          plistPath,
          content: plistContent,
          operationUuid: this.operationUuid
        };
      } else {
        return {
          success: true,
          plistPath: this.getPlistPath(),
          content: plistContent,
          operationUuid: this.operationUuid
        };
      }
    } catch (error) {
      this.log(`❌ Error generating plist: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message,
        operationUuid: this.operationUuid
      };
    }
  }

  /**
   * Load the plist into launchd
   */
  loadPlist() {
    const { execSync } = require('child_process');
    const plistPath = this.getPlistPath();
    
    try {
      this.log('🔄 Loading plist into launchd...');
      
      // Unload if already loaded
      try {
        execSync(`launchctl unload "${plistPath}"`, { stdio: 'pipe' });
        this.log('✅ Unloaded existing plist');
      } catch (error) {
        // Ignore errors if not loaded
        this.log('ℹ️ No existing plist to unload');
      }
      
      // Load the plist
      execSync(`launchctl load "${plistPath}"`, { stdio: 'pipe' });
      this.log('✅ Plist loaded into launchd');
      
      // Verify it's running
      const status = this.checkStatus();
      if (status.loaded) {
        this.log('✅ Fly log daemon plist is active');
        return true;
      } else {
        this.log('⚠️ Plist loaded but not running', 'WARN');
        return false;
      }
    } catch (error) {
      this.log(`❌ Error loading plist: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Check plist status
   */
  checkStatus() {
    const { execSync } = require('child_process');
    
    try {
      const output = execSync('launchctl list', { encoding: 'utf8' });
      const loaded = output.includes(FLYLOG_CONFIG.label);
      
      return {
        loaded,
        label: FLYLOG_CONFIG.label,
        plistPath: this.getPlistPath()
      };
    } catch (error) {
      return {
        loaded: false,
        error: error.message,
        label: FLYLOG_CONFIG.label,
        plistPath: this.getPlistPath()
      };
    }
  }
}

// CLI usage
if (require.main === module) {
  const generator = new FlyLogPlistGenerator();
  
  const command = process.argv[2] || 'generate';
  
  switch (command) {
  case 'generate':
    const result = generator.generate(true);
    if (result.success) {
      console.log('✅ Fly log daemon plist generated successfully');
      console.log(`📁 Location: ${result.plistPath}`);
    } else {
      console.error('❌ Failed to generate plist:', result.error);
      process.exit(1);
    }
    break;
      
  case 'load':
    const loaded = generator.loadPlist();
    if (loaded) {
      console.log('✅ Fly log daemon plist loaded successfully');
    } else {
      console.error('❌ Failed to load plist');
      process.exit(1);
    }
    break;
      
  case 'status':
    const status = generator.checkStatus();
    console.log('📊 Fly log daemon status:');
    console.log(`   Label: ${status.label}`);
    console.log(`   Loaded: ${status.loaded ? '✅ Yes' : '❌ No'}`);
    console.log(`   Plist: ${status.plistPath}`);
    break;
      
  default:
    console.log('Usage: node generate-flylog-plist.js [generate|load|status]');
    process.exit(1);
  }
}

module.exports = FlyLogPlistGenerator; 