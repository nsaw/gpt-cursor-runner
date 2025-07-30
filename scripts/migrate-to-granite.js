#!/usr/bin/env node

/**
 * Slack Granite Platform Migration Script
 * 
 * This script helps migrate from classic Slack platform to Granite platform
 * with Socket Mode v2 and granular scopes.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MANIFEST_V2_PATH = path.join(__dirname, '..', 'slack-app-manifest-v2.yaml');
// const MANIFEST_V1_PATH = path.join(__dirname, '..', 'slack-app-manifest.yaml'); // Unused variable
const ENV_FILE_PATH = path.join(__dirname, '..', '.env');

class GraniteMigration {
  constructor() {
    this.steps = [];
    this.currentStep = 0;
  }

  /**
   * Add a migration step
   */
  addStep(name, action) {
    this.steps.push({ name, action });
  }

  /**
   * Execute migration steps
   */
  async execute() {
    console.log('🚀 Starting Slack Granite Platform Migration');
    console.log('=============================================\n');

    for (let i = 0; i < this.steps.length; i++) {
      this.currentStep = i + 1;
      const step = this.steps[i];
      
      console.log(`📋 Step ${this.currentStep}/${this.steps.length}: ${step.name}`);
      console.log('─'.repeat(50));
      
      try {
        await step.action();
        console.log(`✅ Step ${this.currentStep} completed successfully\n`);
      } catch (_error) {
        console.error(`❌ Step ${this.currentStep} failed:`, error.message);
        console.log('\n💡 You can continue manually or restart the migration.\n');
        return false;
      }
    }

    console.log('🎉 Migration completed successfully!');
    return true;
  }

  /**
   * Check prerequisites
   */
  async checkPrerequisites() {
    console.log('🔍 Checking prerequisites...');

    // Check if manifest v2 exists
    if (!fs.existsSync(MANIFEST_V2_PATH)) {
      throw new Error('slack-app-manifest-v2.yaml not found. Please create it first.');
    }

    // Check if Slack CLI is installed
    try {
      execSync('slack --version', { stdio: 'pipe' });
      console.log('✅ Slack CLI is installed');
    } catch (_error) {
      console.log('⚠️  Slack CLI not found. Installing...');
      try {
        execSync('npm install -g @slack/cli', { stdio: 'inherit' });
        console.log('✅ Slack CLI installed');
      } catch (installError) {
        throw new Error('Failed to install Slack CLI. Please install manually: npm install -g @slack/cli');
      }
    }

    // Check environment variables
    const requiredEnvVars = [
      'SLACK_APP_TOKEN',
      'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing environment variables:', missingVars.join(', '));
      console.log('💡 Please set these variables before continuing.');
      console.log('   You can get them from your Slack app settings.');
    } else {
      console.log('✅ All required environment variables are set');
    }

    console.log('✅ Prerequisites check completed');
  }

  /**
   * Create new Slack app with Granite manifest
   */
  async createNewApp() {
    console.log('🏗️  Creating new Slack app with Granite manifest...');

    if (!fs.existsSync(MANIFEST_V2_PATH)) {
      throw new Error('Manifest v2 file not found');
    }

    console.log('📝 Manifest v2 contents:');
    console.log('─'.repeat(50));
    const manifestContent = fs.readFileSync(MANIFEST_V2_PATH, 'utf8');
    console.log(manifestContent);
    console.log('─'.repeat(50));

    console.log('\n📋 Next steps:');
    console.log('1. Go to https://api.slack.com/apps');
    console.log('2. Click "Create New App"');
    console.log('3. Choose "From an app manifest"');
    console.log('4. Select your workspace');
    console.log('5. Copy and paste the manifest content above');
    console.log('6. Click "Create"');
    console.log('7. Note the App ID for the next step');

    // Wait for user confirmation
    await this.waitForUserInput('Press Enter when you have created the new app...');
  }

  /**
   * Update app with new manifest
   */
  async updateAppManifest() {
    console.log('📝 Updating app manifest...');

    const appId = await this.promptForInput('Enter your Slack App ID: ');
    
    if (!appId) {
      throw new Error('App ID is required');
    }

    try {
      console.log('🔄 Updating manifest via Slack CLI...');
      execSync(`slack apps manifest update --app-id ${appId} --manifest-file ${MANIFEST_V2_PATH}`, {
        stdio: 'inherit'
      });
      console.log('✅ Manifest updated successfully');
    } catch (_error) {
      console.log('⚠️  CLI update failed, you can update manually:');
      console.log('1. Go to your app settings');
      console.log('2. Navigate to "App Manifest"');
      console.log('3. Replace with the content from slack-app-manifest-v2.yaml');
      console.log('4. Save changes');
    }
  }

  /**
   * Update scopes to granular
   */
  async updateScopes() {
    console.log('🔐 Updating to granular scopes...');

    console.log('📋 Manual steps required:');
    console.log('1. Go to your Slack app settings');
    console.log('2. Navigate to "OAuth & Permissions"');
    console.log('3. Click "Update to Granular Scopes"');
    console.log('4. Follow the UI-driven migration process');
    console.log('5. Reinstall the app to your workspace');

    await this.waitForUserInput('Press Enter when you have updated the scopes...');
  }

  /**
   * Enable Socket Mode
   */
  async enableSocketMode() {
    console.log('🔌 Enabling Socket Mode...');

    console.log('📋 Manual steps required:');
    console.log('1. Go to your Slack app settings');
    console.log('2. Navigate to "Socket Mode"');
    console.log('3. Enable Socket Mode');
    console.log('4. Generate app-level token');
    console.log('5. Copy the token (starts with xapp-)');

    await this.waitForUserInput('Press Enter when you have enabled Socket Mode...');
  }

  /**
   * Update environment configuration
   */
  async updateEnvironment() {
    console.log('🔧 Updating environment configuration...');

    // Read current .env file
    let envContent = '';
    if (fs.existsSync(ENV_FILE_PATH)) {
      envContent = fs.readFileSync(ENV_FILE_PATH, 'utf8');
    }

    // Add Socket Mode token if not present
    if (!envContent.includes('SLACK_APP_TOKEN')) {
      const appToken = await this.promptForInput('Enter your Socket Mode token (xapp-...): ');
      if (appToken) {
        envContent += `\n# Socket Mode Configuration\nSLACK_APP_TOKEN=${appToken}\n`;
      }
    }

    // Update .env file
    fs.writeFileSync(ENV_FILE_PATH, envContent);
    console.log('✅ Environment file updated');

    // Update Fly.io secrets
    console.log('🚀 Updating Fly.io secrets...');
    try {
      execSync('fly secrets set SLACK_APP_TOKEN="xapp-your-socket-mode-token" --app gpt-cursor-runner', {
        stdio: 'inherit'
      });
      console.log('✅ Fly.io secrets updated');
    } catch (_error) {
      console.log('⚠️  Failed to update Fly.io secrets. Please update manually:');
      console.log('fly secrets set SLACK_APP_TOKEN="your-token" --app gpt-cursor-runner');
    }
  }

  /**
   * Install Socket Mode dependencies
   */
  async installDependencies() {
    console.log('📦 Installing Socket Mode dependencies...');

    try {
      execSync('npm install @slack/socket-mode @slack/web-api', {
        stdio: 'inherit'
      });
      console.log('✅ Dependencies installed');
    } catch (_error) {
      throw new Error('Failed to install dependencies');
    }
  }

  /**
   * Test the migration
   */
  async testMigration() {
    console.log('🧪 Testing migration...');

    console.log('📋 Test commands:');
    console.log('1. slack auth list');
    console.log('2. /status (in Slack)');
    console.log('3. /dashboard (in Slack)');
    console.log('4. /whoami (in Slack)');

    await this.waitForUserInput('Press Enter when you have tested the commands...');
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

// Main execution
async function main() {
  const migration = new GraniteMigration();

  // Add migration steps
  migration.addStep('Check Prerequisites', () => migration.checkPrerequisites());
  migration.addStep('Create New App', () => migration.createNewApp());
  migration.addStep('Update App Manifest', () => migration.updateAppManifest());
  migration.addStep('Update Scopes', () => migration.updateScopes());
  migration.addStep('Enable Socket Mode', () => migration.enableSocketMode());
  migration.addStep('Update Environment', () => migration.updateEnvironment());
  migration.addStep('Install Dependencies', () => migration.installDependencies());
  migration.addStep('Test Migration', () => migration.testMigration());

  // Execute migration
  const success = await migration.execute();

  if (success) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Deploy your updated app: fly deploy');
    console.log('2. Monitor logs: fly logs');
    console.log('3. Test all slash commands in Slack');
    console.log('4. Update documentation if needed');
  } else {
    console.log('\n❌ Migration failed. Please check the errors above.');
    console.log('📋 You can continue manually using the guide in SLACK_GRANITE_MIGRATION_GUIDE.md');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = GraniteMigration; 