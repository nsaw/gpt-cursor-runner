#!/usr/bin/env node

/**
 * Block Name: update_slack_manifest_cli_v1
 * Purpose: Use Slack CLI to update the app manifest with essential 25 slash command list and interactivity settings
 * Triggers: GPT-controlled deployment pipeline, runner boot sequence, or admin command
 * Precondition: Slack CLI installed and authorized. App must be accessible via CLI.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const SLACK_APP_ID = process.env.SLACK_APP_ID || 'A09469H0C2K';
// const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'C0955JLTKJ4'; // Unused variable

// Generate improved manifest YAML with essential 25 commands
function generateManifest() {
  return `display_information:
  name: gpt-cursor-runner
  description: cursor's boss
  background_color: '#000000'
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
    # Core Runner Control (8 commands)
    - command: /dashboard
      description: View Dashboard
      usage_hint: View dashboard
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /status-runner
      description: Check current runner status and health
      usage_hint: Check status
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /status-push
      description: Status pulse now
      usage_hint: Status pulse
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /restart-runner
      description: Restart the GPT-Cursor Runner service
      usage_hint: Restart service
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /kill
      description: Force stop the runner (emergency)
      usage_hint: Emergency stop
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /toggle-runner
      description: Toggles between on (auto mode) and off
      usage_hint: Toggle runner state
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /runner-lock
      description: toggle (un)Lock runner (prevent changes)
      usage_hint: Lock/unlock runner
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /watchdog-ping
      description: Ping watchdog
      usage_hint: Check system health
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false

    # Patch Management (7 commands)
    - command: /patch-pass
      description: Pass next pending patches with options
      usage_hint: Pass patches
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /patch-revert
      description: Revert the last applied patch
      usage_hint: Revert patch
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /patch-preview
      description: Preview pending patches
      usage_hint: Preview patch
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /patch-approve
      description: Approve specific patch by ID
      usage_hint: Approve patch
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /patch-reject
      description: Reject specific patch by ID
      usage_hint: Reject patch
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /patch-status
      description: Check patch execution status
      usage_hint: Check patch status
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /patch-rollback
      description: Rollback to previous patch state
      usage_hint: Rollback patches
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false

    # Workflow Control (5 commands)
    - command: /proceed
      description: Continue execution after pause
      usage_hint: Continue execution
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /pause-runner
      description: Pause runner execution
      usage_hint: Pause execution
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /again
      description: Retry last failed operation
      usage_hint: Retry operation
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /manual-revise
      description: Enter manual revision mode
      usage_hint: Manual revision
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /manual-append
      description: Append to current operation
      usage_hint: Append operation
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false

    # System Management (5 commands)
    - command: /whoami
      description: Check current user and permissions
      usage_hint: Check user
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /troubleshoot
      description: Run system diagnostics
      usage_hint: Run diagnostics
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /troubleshoot-oversight
      description: Run oversight diagnostics
      usage_hint: Oversight diagnostics
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /cursor-mode
      description: Toggle Cursor integration mode
      usage_hint: Toggle mode
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false
    - command: /log-phase-status
      description: Log current phase status
      usage_hint: Log status
      url: https://runner.thoughtmarks.app/slack/commands
      should_escape: false

  interactivity:
    request_url: https://runner.thoughtmarks.app/slack/interactivity
    is_enabled: true

  event_subscriptions:
    request_url: https://runner.thoughtmarks.app/slack/events
    bot_events:
      - app_mention
      - message.im
      - message.channels
      - message.groups

oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - channels:read
      - chat:write
      - commands
      - groups:history
      - groups:read
      - im:history
      - im:read
      - im:write
      - mpim:history
      - mpim:read
      - mpim:write
      - users:read
      - users:read.email

settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false`;
}

// Update manifest using Slack CLI
function updateManifest() {
  try {
    console.log('🔧 Updating Slack app manifest...');
    
    const manifest = generateManifest();
    const manifestPath = path.join(process.cwd(), 'slack-manifest.yaml');
    
    // Write manifest to file
    fs.writeFileSync(manifestPath, manifest, 'utf8');
    console.log('✅ Manifest written to:', manifestPath);
    
    // Update app using Slack CLI
    const command = `slack apps manifest update --app-id ${SLACK_APP_ID} --manifest-file ${manifestPath}`;
    console.log('🚀 Executing:', command);
    
    const result = execSync(command, { encoding: 'utf8' });
    console.log('✅ Manifest updated successfully');
    console.log('📋 Result:', result);
    
    // Clean up manifest file
    fs.unlinkSync(manifestPath);
    console.log('🧹 Cleaned up temporary manifest file');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to update manifest:', error.message);
    return false;
  }
}

// Main execution
if (require.main === module) {
  console.log('🚀 Starting Slack manifest update...');
  const success = updateManifest();
  
  if (success) {
    console.log('✅ Slack manifest update completed successfully');
    process.exit(0);
  } else {
    console.error('❌ Slack manifest update failed');
    process.exit(1);
  }
}

module.exports = { generateManifest, updateManifest };