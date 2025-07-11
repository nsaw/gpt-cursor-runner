#!/usr/bin/env node

/**
 * Block Name: update_slack_manifest_cli_v1
 * Purpose: Use Slack CLI to update the app manifest with full slash command list and interactivity settings
 * Triggers: GPT-controlled deployment pipeline, runner boot sequence, or admin command
 * Precondition: Slack CLI installed and authorized. App must be accessible via CLI.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SLACK_APP_ID = process.env.SLACK_APP_ID || 'A09469H0C2K';
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'C0955JLTKJ4';

// Generate improved manifest YAML
function generateManifest() {
  return `display_information:
  name: gpt-cursor-runner
  description: cursor's boss
  background_color: "#000000"
  long_description: >
    Robots using robots to control robots. This Slack app serves as a command interface
    for a GPT-powered hybrid automation pipeline, controlling Cursor through carefully
    structured instructional blocks and real-time patch orchestration. It's a fusion
    of natural language and precision tooling, letting humans guide AI which guides
    other AI.

    Robots using robots to control robots. From phase tagging to thematic overrides,
    this app delivers full-cycle control over Cursor's render, audit, and layout enforcement loop.
    Integration flows are driven via slash commands, Slack events, and webhook triggers—
    all wrapped in a command interface for structured patch logic and rollback safety.

    Robots using robots to control robots. From approving patches to reverting failed phases,
    from restarting GPT workflows to toggling auto modes, this is the control center.
    This is the war room. This is Cursor's boss. And Cursor listens to it.

features:
  bot_user:
    display_name: gpt-cursor-runner
    always_online: true
  slash_commands:
    - command: /dashboard
      description: View dashboard and stats
      usage_hint: View dashboard
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /patch-approve
      description: Approve next pending patch
      usage_hint: Approve patch
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /patch-revert
      description: Revert the last applied patch
      usage_hint: Revert patch
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /pause-runner
      description: Pause the GPT-Cursor Runner
      usage_hint: Pause runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /restart-runner
      description: Restart the GPT-Cursor Runner service
      usage_hint: Restart service
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /restart-runner-gpt
      description: Restart GPT integration specifically
      usage_hint: Restart GPT
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /continue-runner
      description: Resume the paused runner
      usage_hint: Continue runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /status
      description: Check current runner status and health
      usage_hint: Check status
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /show-roadmap
      description: Display development roadmap
      usage_hint: Show roadmap
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /roadmap
      description: Show project roadmap and milestones
      usage_hint: View roadmap
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /kill-runner
      description: Force stop the runner (emergency)
      usage_hint: Kill runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /toggle-runner-on
      description: Enable the runner
      usage_hint: Enable runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /toggle-runner-off
      description: Disable the runner
      usage_hint: Disable runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /toggle-runner-auto
      description: Toggle automatic patch processing
      usage_hint: Toggle auto mode
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /theme
      description: Manage Cursor theme settings
      usage_hint: Manage theme
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /theme-status
      description: Check current theme status
      usage_hint: Theme status
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /theme-fix
      description: Fix theme-related issues
      usage_hint: Fix theme
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /patch-preview
      description: Preview pending patches
      usage_hint: Preview patch
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /approve-screenshot
      description: Approve screenshot-based patches
      usage_hint: Approve screenshot
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /revert-phase
      description: Revert to previous phase
      usage_hint: Revert phase
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /log-phase-status
      description: Log current phase status
      usage_hint: Log status
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /cursor-mode
      description: Switch Cursor operation modes
      usage_hint: Switch mode
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /whoami
      description: Show current user and permissions
      usage_hint: Show user info
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /retry-last-failed
      description: Retry the last failed operation
      usage_hint: Retry failed
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /lock-runner
      description: Lock runner (prevent changes)
      usage_hint: Lock runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /unlock-runner
      description: Unlock runner (allow changes)
      usage_hint: Unlock runner
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false
    - command: /alert-runner-crash
      description: Send crash alert notification
      usage_hint: Alert crash
      url: https://gpt-cursor-runner.fly.dev/slack/commands
      should_escape: false

oauth_config:
  redirect_urls:
    - https://gpt-cursor-runner.fly.dev/slack/oauth/callback
  scopes:
    bot:
      - commands
      - chat:write
      - users:read
      - app_mentions:read
      - incoming-webhook
      - channels:history

settings:
  event_subscriptions:
    request_url: https://gpt-cursor-runner.fly.dev/slack/events
    bot_events:
      - app_mention
      - message.channels
  interactivity:
    is_enabled: true
    request_url: https://gpt-cursor-runner.fly.dev/slack/interactions
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false`;
}

// Save manifest to temporary file
function saveManifestToFile(manifest) {
  const manifestPath = path.join(__dirname, 'temp_manifest.yaml');
  fs.writeFileSync(manifestPath, manifest);
  return manifestPath;
}

// Update manifest using Slack CLI
async function updateManifestWithCLI(manifestPath) {
  try {
    console.log('🔄 Updating Slack app manifest using CLI...');
    
    // First, let's check if we're logged in
    console.log('🔍 Checking Slack CLI authentication...');
    execSync('slack auth list', { stdio: 'inherit' });
    
    // Try to update the manifest using the CLI
    console.log('📝 Applying manifest update...');
    execSync(`slack apps manifest update --app-id ${SLACK_APP_ID} --manifest-file ${manifestPath}`, { 
      stdio: 'inherit' 
    });
    
    console.log('✅ Slack app manifest updated successfully via CLI!');
    return true;
  } catch (error) {
    console.error('❌ Error updating manifest via CLI:', error.message);
    return false;
  }
}

// Main execution function
async function main() {
  try {
    console.log('🚀 Starting Slack manifest injection via CLI...');
    console.log(`📋 App ID: ${SLACK_APP_ID}`);
    console.log(`📊 Channel: ${SLACK_CHANNEL}`);
    console.log('🔗 Commands: 27 slash commands configured');
    
    // Generate manifest
    console.log('\n📝 Generating manifest...');
    const manifest = generateManifest();
    console.log('✅ Manifest generated');
    
    // Save to file
    console.log('\n💾 Saving manifest to temporary file...');
    const manifestPath = saveManifestToFile(manifest);
    console.log(`✅ Manifest saved to: ${manifestPath}`);
    
    // Update via CLI
    const success = await updateManifestWithCLI(manifestPath);
    
    if (success) {
      console.log('\n🎉 Manifest injection completed successfully!');
      console.log('📝 You can verify the changes at: https://api.slack.com/apps');
    } else {
      console.log('\n💡 CLI approach failed. You can manually update the manifest:');
      console.log('   1. Go to https://api.slack.com/apps');
      console.log('   2. Select your app (ID: ' + SLACK_APP_ID + ')');
      console.log('   3. Click "App Manifest" in the left sidebar');
      console.log('   4. Replace the content with the generated manifest');
      console.log('\n📋 Generated manifest:');
      console.log(manifest);
    }
    
    // Clean up
    try {
      fs.unlinkSync(manifestPath);
      console.log('🧹 Temporary file cleaned up');
    } catch (cleanupError) {
      console.log('⚠️  Could not clean up temporary file');
    }
    
  } catch (error) {
    console.error('\n💥 Manifest injection failed:', error.message);
    console.log('\n📋 Generated manifest for manual use:');
    console.log(generateManifest());
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateManifest,
  updateManifestWithCLI,
  saveManifestToFile
}; 