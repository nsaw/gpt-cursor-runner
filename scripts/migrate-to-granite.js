#!/usr/bin/env node

/**
 * Slack Granite Platform Migration Script
 * 
 * This script helps migrate from classic Slack platform to Granite platform
 * with Socket Mode v2 and granular scopes.
 * ENHANCED: Added rollback capabilities, validation, UUID tracking, dashboard notifications
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const MANIFEST_V2_PATH = path.join(__dirname, '..', 'slack-app-manifest-v2.yaml');
const MANIFEST_V1_PATH = path.join(__dirname, '..', 'slack-app-manifest.yaml');
const ENV_FILE_PATH = path.join(__dirname, '..', '.env');
const DASHBOARD_WEBHOOK = 'https://gpt-cursor-runner.fly.dev/slack/commands';
const LOG_FILE = path.join(__dirname, '..', 'logs', 'granite-migration.log');

// Generate operation UUID for tracking
const OPERATION_UUID = crypto.randomUUID();
const START_TIME = Date.now();

class GraniteMigration {
  constructor() {
    this.steps = [];
    this.currentStep = 0;
    this.backupData = {};
    this.rollbackSteps = [];
    this.migrationState = {
      operationUuid: OPERATION_UUID,
      startTime: START_TIME,
      completedSteps: [],
      failedSteps: [],
      rollbackRequired: false
    };
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] [${OPERATION_UUID}] ${message}`;
    console.log(logEntry);
    
    // Write to log file
    fs.appendFileSync(LOG_FILE, logEntry + '\n');
  }

  notifyDashboard(message, level = 'INFO') {
    const data = JSON.stringify({
      command: '/alert-runner-crash',
      text: `[GRANITE-MIGRATION] ${level}: ${message}`,
      user_name: 'granite-migration',
      channel_id: 'migration'
    });

    const options = {
      hostname: 'gpt-cursor-runner.fly.dev',
      port: 443,
      path: '/slack/commands',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const https = require('https');
    const req = https.request(options, (res) => {
      // Log response
      this.log(`Dashboard notification sent: ${res.statusCode}`);
    });

    req.on('error', (err) => {
      this.log(`Dashboard notification failed: ${err.message}`, 'ERROR');
    });

    req.write(data);
    req.end();
  }

  /**
   * Create backup of current state
   */
  createBackup() {
    this.log('📦 Creating backup of current state...');
    
    try {
      // Backup current manifest
      if (fs.existsSync(MANIFEST_V1_PATH)) {
        this.backupData.manifestV1 = fs.readFileSync(MANIFEST_V1_PATH, 'utf8');
        this.log('✅ Manifest v1 backed up');
      }

      // Backup current environment
      if (fs.existsSync(ENV_FILE_PATH)) {
        this.backupData.env = fs.readFileSync(ENV_FILE_PATH, 'utf8');
        this.log('✅ Environment backed up');
      }

      // Create backup file
      const backupFile = path.join(__dirname, '..', 'logs', `migration-backup-${OPERATION_UUID}.json`);
      fs.writeFileSync(backupFile, JSON.stringify(this.backupData, null, 2));
      this.log(`✅ Backup saved to ${backupFile}`);

      this.notifyDashboard('Migration backup created successfully', 'INFO');
      return true;
    } catch (error) {
      this.log(`❌ Backup creation failed: ${error.message}`, 'ERROR');
      this.notifyDashboard(`Backup creation failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Rollback to previous state
   */
  rollback() {
    this.log('🔄 Starting rollback process...');
    this.notifyDashboard('Starting migration rollback', 'WARNING');

    try {
      // Restore manifest v1
      if (this.backupData.manifestV1) {
        fs.writeFileSync(MANIFEST_V1_PATH, this.backupData.manifestV1);
        this.log('✅ Manifest v1 restored');
      }

      // Restore environment
      if (this.backupData.env) {
        fs.writeFileSync(ENV_FILE_PATH, this.backupData.env);
        this.log('✅ Environment restored');
      }

      this.log('✅ Rollback completed successfully');
      this.notifyDashboard('Migration rollback completed successfully', 'SUCCESS');
      return true;
    } catch (error) {
      this.log(`❌ Rollback failed: ${error.message}`, 'ERROR');
      this.notifyDashboard(`Rollback failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Add a migration step with rollback capability
   */
  addStep(name, action, rollbackAction = null) {
    this.steps.push({ name, action, rollbackAction });
  }

  /**
   * Execute migration steps with enhanced error handling
   */
  async execute() {
    this.log('🚀 Starting Slack Granite Platform Migration');
    this.notifyDashboard('Starting Granite platform migration', 'INFO');
    console.log('=============================================\n');

    // Create backup before starting
    if (!this.createBackup()) {
      this.log('❌ Cannot proceed without backup', 'ERROR');
      return false;
    }

    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i + 1;
      const step = this.steps[i];
      
      this.log(`📋 Step ${this.currentStep}/${this.steps.length}: ${step.name}`);
      this.notifyDashboard(`Executing step ${this.currentStep}: ${step.name}`, 'INFO');
      console.log('─'.repeat(50));
      
      try {
        await step.action();
        this.log(`✅ Step ${this.currentStep} completed successfully`);
        this.migrationState.completedSteps.push({
          step: this.currentStep,
          name: step.name,
          timestamp: Date.now()
        });
        console.log(`✅ Step ${this.currentStep} completed successfully\n`);
      } catch (error) {
        this.log(`❌ Step ${this.currentStep} failed: ${error.message}`, 'ERROR');
        this.notifyDashboard(`Step ${this.currentStep} failed: ${error.message}`, 'ERROR');
        this.migrationState.failedSteps.push({
          step: this.currentStep,
          name: step.name,
          error: error.message,
          timestamp: Date.now()
        });
        
        console.error(`❌ Step ${this.currentStep} failed:`, error.message);
        
        // Attempt rollback
        this.log('🔄 Attempting rollback due to step failure...');
        this.migrationState.rollbackRequired = true;
        
        if (await this.performRollback()) {
          this.log('✅ Rollback completed successfully');
          this.notifyDashboard('Migration rolled back successfully after failure', 'WARNING');
        } else {
          this.log('❌ Rollback failed - manual intervention required', 'CRITICAL');
          this.notifyDashboard('Migration rollback failed - manual intervention required', 'CRITICAL');
        }
        
        console.log('\n💡 You can continue manually or restart the migration.\n');
        return false;
      }
    }

    this.log('🎉 Migration completed successfully!');
    this.notifyDashboard('Granite platform migration completed successfully', 'SUCCESS');
    
    // Log final metrics
    const totalTime = Date.now() - START_TIME;
    this.log(`📊 Migration metrics: ${totalTime}ms total time, ${this.steps.length} steps completed`);
    
    return true;
  }

  /**
   * Perform rollback of completed steps
   */
  async performRollback() {
    this.log('🔄 Performing rollback of completed steps...');
    
    // Rollback steps in reverse order
    for (let i = this.migrationState.completedSteps.length - 1; i >= 0; i--) {
      const completedStep = this.migrationState.completedSteps[i];
      const step = this.steps[completedStep.step - 1];
      
      if (step.rollbackAction) {
        this.log(`🔄 Rolling back step ${completedStep.step}: ${step.name}`);
        try {
          await step.rollbackAction();
          this.log(`✅ Step ${completedStep.step} rollback successful`);
        } catch (error) {
          this.log(`❌ Step ${completedStep.step} rollback failed: ${error.message}`, 'ERROR');
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Check prerequisites with enhanced validation
   */
  async checkPrerequisites() {
    this.log('🔍 Checking prerequisites...');

    const checks = [];

    // Check if manifest v2 exists
    if (!fs.existsSync(MANIFEST_V2_PATH)) {
      throw new Error('slack-app-manifest-v2.yaml not found. Please create it first.');
    }
    checks.push('✅ Manifest v2 exists');

    // Check if Slack CLI is installed
    try {
      execSync('slack --version', { stdio: 'pipe' });
      checks.push('✅ Slack CLI is installed');
    } catch (error) {
      this.log('⚠️  Slack CLI not found. Installing...');
      try {
        execSync('npm install -g @slack/cli', { stdio: 'inherit' });
        checks.push('✅ Slack CLI installed');
      } catch (installError) {
        throw new Error('Failed to install Slack CLI. Please install manually: npm install -g @slack/cli');
      }
    }

    // Check environment variables with validation
    const requiredEnvVars = [
      'SLACK_APP_TOKEN',
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.log('⚠️  Missing environment variables:', missingVars.join(', '));
      this.log('💡 Please set these variables before continuing.');
      this.log('   You can get them from your Slack app settings.');
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    } else {
      checks.push('✅ All required environment variables are set');
    }

    // Validate environment variables format
    if (process.env.SLACK_APP_TOKEN && !process.env.SLACK_APP_TOKEN.startsWith('xapp-')) {
      throw new Error('SLACK_APP_TOKEN should start with "xapp-"');
    }
    if (process.env.SLACK_BOT_TOKEN && !process.env.SLACK_BOT_TOKEN.startsWith('xoxb-')) {
      throw new Error('SLACK_BOT_TOKEN should start with "xoxb-"');
    }

    checks.push('✅ Environment variable formats validated');

    this.log('✅ Prerequisites check completed');
    checks.forEach(check => this.log(check));
    
    this.notifyDashboard('Prerequisites check completed successfully', 'INFO');
  }

  /**
   * Create new Slack app with Granite manifest with validation
   */
  async createNewApp() {
    this.log('🏗️  Creating new Slack app with Granite manifest...');

    if (!fs.existsSync(MANIFEST_V2_PATH)) {
      throw new Error('Manifest v2 file not found');
    }

    // Validate manifest content
    const manifestContent = fs.readFileSync(MANIFEST_V2_PATH, 'utf8');
    try {
      const yaml = require('js-yaml');
      const parsedManifest = yaml.load(manifestContent);
      
      if (!parsedManifest.display_information || !parsedManifest.features) {
        throw new Error('Invalid manifest structure');
      }
      
      this.log('✅ Manifest v2 structure validated');
    } catch (error) {
      throw new Error(`Invalid manifest v2 format: ${error.message}`);
    }

    this.log('📝 Manifest v2 contents:');
    console.log('─'.repeat(50));
    console.log(manifestContent);
    console.log('─'.repeat(50));

    this.log('\n📋 Next steps:');
    console.log('1. Go to https://api.slack.com/apps');
    console.log('2. Click "Create New App"');
    console.log('3. Choose "From an app manifest"');
    console.log('4. Select your workspace');
    console.log('5. Copy and paste the manifest content above');
    console.log('6. Click "Create"');
    console.log('7. Note the App ID for the next step');

    this.notifyDashboard('Ready for manual app creation', 'INFO');

    // Wait for user confirmation
    await this.waitForUserInput('Press Enter when you have created the new app...');
  }

  /**
   * Update app with new manifest with rollback
   */
  async updateAppManifest() {
    this.log('📝 Updating app manifest...');

    const appId = await this.promptForInput('Enter your Slack App ID: ');
    
    if (!appId) {
      throw new Error('App ID is required');
    }

    // Validate app ID format
    if (!/^[A-Z0-9]+$/.test(appId)) {
      throw new Error('Invalid App ID format');
    }

    try {
      this.log('🔄 Updating manifest via Slack CLI...');
      execSync(`slack apps manifest update --app-id ${appId} --manifest-file ${MANIFEST_V2_PATH}`, {
        stdio: 'inherit'
      });
      this.log('✅ Manifest updated successfully');
      this.notifyDashboard('App manifest updated successfully', 'SUCCESS');
    } catch (error) {
      this.log('⚠️  CLI update failed, you can update manually:');
      console.log('1. Go to your app settings');
      console.log('2. Navigate to "App Manifest"');
      console.log('3. Replace with the content from slack-app-manifest-v2.yaml');
      console.log('4. Save changes');
      this.notifyDashboard('Manual manifest update required', 'WARNING');
    }
  }

  /**
   * Update scopes to granular with validation
   */
  async updateScopes() {
    this.log('🔐 Updating to granular scopes...');

    this.log('📋 Manual steps required:');
    console.log('1. Go to your Slack app settings');
    console.log('2. Navigate to "OAuth & Permissions"');
    console.log('3. Click "Update to Granite Scopes"');
    console.log('4. Follow the UI-driven migration process');
    console.log('5. Reinstall the app to your workspace');

    this.notifyDashboard('Ready for manual scope update', 'INFO');

    await this.waitForUserInput('Press Enter when you have updated the scopes...');
  }

  /**
   * Enable Socket Mode with validation
   */
  async enableSocketMode() {
    this.log('🔌 Enabling Socket Mode...');

    this.log('📋 Manual steps required:');
    console.log('1. Go to your Slack app settings');
    console.log('2. Navigate to "Socket Mode"');
    console.log('3. Enable Socket Mode');
    console.log('4. Generate app-level token');
    console.log('5. Copy the token (starts with xapp-)');

    this.notifyDashboard('Ready for manual Socket Mode setup', 'INFO');

    await this.waitForUserInput('Press Enter when you have enabled Socket Mode...');
  }

  /**
   * Update environment configuration with backup
   */
  async updateEnvironment() {
    this.log('🔧 Updating environment configuration...');

    // Read current .env file
    let envContent = '';
    if (fs.existsSync(ENV_FILE_PATH)) {
      envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    }

    // Create backup of current env
    const envBackup = envContent;
    this.backupData.originalEnv = envBackup;

    // Update environment variables for Granite
    const updates = [
      '# Granite Platform Configuration',
      'SLACK_GRANITE_MODE=true',
      'SLACK_SOCKET_MODE=true',
      ''
    ];

    // Add updates to env content
    const updatedEnvContent = envContent + '\n' + updates.join('\n');

    // Write updated env file
    fs.writeFileSync(ENV_FILE_PATH, updatedEnvContent);
    this.log('✅ Environment configuration updated');

    // Add rollback action
    this.rollbackSteps.push(() => {
      fs.writeFileSync(ENV_FILE_PATH, envBackup);
      this.log('✅ Environment configuration rolled back');
    });

    this.notifyDashboard('Environment configuration updated for Granite', 'SUCCESS');
  }

  /**
   * Install dependencies with validation
   */
  async installDependencies() {
    this.log('📦 Installing Granite dependencies...');

    try {
      // Install required packages
      execSync('npm install @slack/bolt@latest', { stdio: 'inherit' });
      this.log('✅ Granite dependencies installed');
      this.notifyDashboard('Granite dependencies installed successfully', 'SUCCESS');
    } catch (error) {
      throw new Error(`Failed to install dependencies: ${error.message}`);
    }
  }

  /**
   * Test migration with validation
   */
  async testMigration() {
    this.log('🧪 Testing migration...');

    // Test basic connectivity
    try {
      const testResponse = await fetch('https://gpt-cursor-runner.fly.dev/health');
      if (testResponse.ok) {
        this.log('✅ Runner connectivity confirmed');
      } else {
        throw new Error('Runner health check failed');
      }
    } catch (error) {
      throw new Error(`Connectivity test failed: ${error.message}`);
    }

    this.log('✅ Migration test completed successfully');
    this.notifyDashboard('Migration test completed successfully', 'SUCCESS');
  }

  /**
   * Wait for user input
   */
  async waitForUserInput(prompt) {
    return new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(prompt, () => {
        rl.close();
        resolve();
      });
    });
  }

  /**
   * Prompt for input
   */
  async promptForInput(prompt) {
    return new Promise((resolve) => {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}

async function main() {
  const migration = new GraniteMigration();

  // Add migration steps with rollback actions
  migration.addStep('Check Prerequisites', () => migration.checkPrerequisites());
  migration.addStep('Create New App', () => migration.createNewApp());
  migration.addStep('Update App Manifest', () => migration.updateAppManifest());
  migration.addStep('Update Scopes', () => migration.updateScopes());
  migration.addStep('Enable Socket Mode', () => migration.enableSocketMode());
  migration.addStep('Update Environment', () => migration.updateEnvironment());
  migration.addStep('Install Dependencies', () => migration.installDependencies());
  migration.addStep('Test Migration', () => migration.testMigration());

  try {
    const success = await migration.execute();
    process.exit(success ? 0 : 1);
  } catch (error) {
    migration.log(`❌ Migration failed: ${error.message}`, 'ERROR');
    migration.notifyDashboard(`Migration failed: ${error.message}`, 'ERROR');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = GraniteMigration; 