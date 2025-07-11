#!/usr/bin/env node

/**
 * Universal Launchd Watchdog Generator
 * 
 * Generates macOS launchd .plist files for watchdog daemons
 * Supports CLI usage and module export for programmatic use
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const DEFAULT_CONFIG = {
  label: 'com.thoughtmarks.patchwatchdog',
  scriptPath: './scripts/patch-watchdog.js',
  workingDirectory: process.cwd(),
  logDir: './logs',
  startInterval: 30,
  throttleInterval: 10,
  keepAlive: true,
  runAtLoad: true,
  processType: 'Background'
};

class LaunchdWatchdogGenerator {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.operationUuid = crypto.randomUUID();
    this.startTime = Date.now();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${this.operationUuid}] ${message}`;
    console.log(logEntry);
  }

  /**
   * Detect project name from working directory
   */
  detectProjectName() {
    const cwd = process.cwd();
    const dirName = path.basename(cwd);
    
    // Map common project names to labels
    const projectMap = {
      'gpt-cursor-runner': 'gpt-cursor-runner',
      'tm-mobile-cursor': 'tm-mobile-cursor',
      '_global': 'global-tools'
    };
    
    return projectMap[dirName] || dirName;
  }

  /**
   * Generate unique label based on project
   */
  generateLabel() {
    const projectName = this.detectProjectName();
    return `com.thoughtmarks.watchdog.${projectName}`;
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    const errors = [];
    
    // Check if script exists
    const scriptPath = path.resolve(this.config.scriptPath);
    if (!fs.existsSync(scriptPath)) {
      errors.push(`Watchdog script not found: ${scriptPath}`);
    }
    
    // Check if working directory exists
    if (!fs.existsSync(this.config.workingDirectory)) {
      errors.push(`Working directory not found: ${this.config.workingDirectory}`);
    }
    
    // Check if log directory exists or can be created
    const logDir = path.resolve(this.config.logDir);
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
    
    this.log('✅ Configuration validated');
    return true;
  }

  /**
   * Generate .plist content
   */
  generatePlistContent() {
    const label = this.generateLabel();
    const scriptPath = path.resolve(this.config.scriptPath);
    const workingDirectory = path.resolve(this.config.workingDirectory);
    const logDir = path.resolve(this.config.logDir);
    
    const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${label}</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/node</string>
        <string>${scriptPath}</string>
    </array>
    
    <key>WorkingDirectory</key>
    <string>${workingDirectory}</string>
    
    <key>RunAtLoad</key>
    <${this.config.runAtLoad ? 'true' : 'false'}/>
    
    <key>KeepAlive</key>
    <${this.config.keepAlive ? 'true' : 'false'}/>
    
    <key>StandardOutPath</key>
    <string>${logDir}/patch-watchdog-stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>${logDir}/patch-watchdog-stderr.log</string>
    
    <key>ProcessType</key>
    <string>${this.config.processType}</string>
    
    <key>ThrottleInterval</key>
    <integer>${this.config.throttleInterval}</integer>
    
    <key>StartInterval</key>
    <integer>${this.config.startInterval}</integer>
    
    <key>StartCalendarInterval</key>
    <dict>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
        <key>WATCHDOG_MODE</key>
        <string>launchd</string>
        <key>WATCHDOG_INSTALLATION_UUID</key>
        <string>${this.operationUuid}</string>
        <key>PROJECT_NAME</key>
        <string>${this.detectProjectName()}</string>
    </dict>
    
    <key>WatchPaths</key>
    <array>
        <string>${workingDirectory}/patches</string>
        <string>${workingDirectory}/logs</string>
    </array>
    
    <key>QueueDirectories</key>
    <array>
        <string>${workingDirectory}/quarantine</string>
    </array>
</dict>
</plist>`;

    return plistContent;
  }

  /**
   * Get plist file path
   */
  getPlistPath() {
    const label = this.generateLabel();
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const launchAgentsDir = path.join(homeDir, 'Library', 'LaunchAgents');
    
    // Ensure LaunchAgents directory exists
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }
    
    return path.join(launchAgentsDir, `${label}.plist`);
  }

  /**
   * Generate and optionally write .plist file
   */
  generate(writeToDisk = false) {
    this.log('🔧 Generating launchd watchdog configuration...');
    
    try {
      // Validate configuration
      this.validateConfig();
      
      // Generate content
      const plistContent = this.generatePlistContent();
      const plistPath = this.getPlistPath();
      const label = this.generateLabel();
      
      this.log(`📝 Generated .plist for label: ${label}`);
      this.log(`📁 Target path: ${plistPath}`);
      
      // Write to disk if requested
      if (writeToDisk) {
        fs.writeFileSync(plistPath, plistContent);
        this.log(`✅ .plist file written to: ${plistPath}`);
        
        // Set proper permissions
        fs.chmodSync(plistPath, 0o644);
        this.log('✅ File permissions set to 644');
        
        return {
          success: true,
          label,
          plistPath,
          content: plistContent,
          operationUuid: this.operationUuid
        };
      } else {
        this.log('📋 Dry run - .plist content generated but not written');
        return {
          success: true,
          label,
          plistPath,
          content: plistContent,
          operationUuid: this.operationUuid,
          dryRun: true
        };
      }
    } catch (error) {
      this.log(`❌ Generation failed: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message,
        operationUuid: this.operationUuid
      };
    }
  }

  /**
   * Load the generated .plist into launchd
   */
  loadPlist() {
    const { execSync } = require('child_process');
    const plistPath = this.getPlistPath();
    const label = this.generateLabel();
    
    try {
      this.log(`🚀 Loading .plist into launchd: ${label}`);
      
      // Unload if already loaded
      try {
        execSync(`launchctl unload "${plistPath}"`, { stdio: 'pipe' });
        this.log('🔄 Unloaded existing service');
      } catch (error) {
        // Service not loaded, that's fine
      }
      
      // Load the service
      execSync(`launchctl load "${plistPath}"`, { stdio: 'inherit' });
      this.log('✅ Service loaded successfully');
      
      // Start the service
      execSync(`launchctl start "${label}"`, { stdio: 'inherit' });
      this.log('✅ Service started successfully');
      
      return {
        success: true,
        label,
        plistPath
      };
    } catch (error) {
      this.log(`❌ Failed to load .plist: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check service status
   */
  checkStatus() {
    const { execSync } = require('child_process');
    const label = this.generateLabel();
    const plistPath = this.getPlistPath();
    
    try {
      // Check if .plist exists
      const plistExists = fs.existsSync(plistPath);
      
      // Check if service is loaded
      const launchctlOutput = execSync('launchctl list', { encoding: 'utf8' });
      const isLoaded = launchctlOutput.includes(label);
      
      // Check if process is running
      const psOutput = execSync('ps aux | grep patch-watchdog', { encoding: 'utf8' });
      const isRunning = psOutput.includes('patch-watchdog.js') && !psOutput.includes('grep');
      
      return {
        label,
        plistExists,
        isLoaded,
        isRunning,
        plistPath
      };
    } catch (error) {
      return {
        label,
        plistExists: false,
        isLoaded: false,
        isRunning: false,
        error: error.message
      };
    }
  }
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const writeToDisk = args.includes('--write-to-disk');
  const dryRun = args.includes('--dry-run');
  const loadService = args.includes('--load');
  const checkStatus = args.includes('--status');
  const help = args.includes('--help');
  
  if (help) {
    console.log(`
Universal Launchd Watchdog Generator

Usage: node gen-launchd-watchdog.js [options]

Options:
  --write-to-disk    Write .plist file to disk
  --dry-run          Generate content without writing
  --load             Load service into launchd after generation
  --status           Check current service status
  --help             Show this help

Examples:
  node gen-launchd-watchdog.js --dry-run
  node gen-launchd-watchdog.js --write-to-disk --load
  node gen-launchd-watchdog.js --status
`);
    return;
  }
  
  const generator = new LaunchdWatchdogGenerator();
  
  if (checkStatus) {
    const status = generator.checkStatus();
    console.log('\n📊 Service Status:');
    console.log('==================');
    console.log(`Label: ${status.label}`);
    console.log(`Plist exists: ${status.plistExists ? '✅' : '❌'}`);
    console.log(`Service loaded: ${status.isLoaded ? '✅' : '❌'}`);
    console.log(`Process running: ${status.isRunning ? '✅' : '❌'}`);
    console.log(`Plist path: ${status.plistPath}`);
    
    if (status.error) {
      console.log(`Error: ${status.error}`);
    }
    return;
  }
  
  const result = generator.generate(writeToDisk);
  
  if (result.success) {
    console.log('\n✅ Generation completed successfully!');
    console.log(`📁 Plist file: ${result.plistPath}`);
    console.log(`🏷️  Label: ${result.label}`);
    console.log(`🆔 Operation UUID: ${result.operationUuid}`);
    
    if (loadService && writeToDisk) {
      const loadResult = generator.loadPlist();
      if (loadResult.success) {
        console.log('✅ Service loaded and started successfully');
      } else {
        console.log(`❌ Failed to load service: ${loadResult.error}`);
      }
    }
  } else {
    console.log(`❌ Generation failed: ${result.error}`);
    process.exit(1);
  }
}

// Export for programmatic use
if (require.main === module) {
  main();
} else {
  module.exports = LaunchdWatchdogGenerator;
} 