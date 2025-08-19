#!/usr/bin/env python3
"""
Slack App Manifest URL Auto-Updater

This script automatically updates the Slack app manifest to use specific command URLs
instead of the generic /slack/commands endpoint. This fixes the "dispatch_failed" error
by ensuring each slash command routes to its specific endpoint.

Usage:
    python3 scripts/update-slack-manifest-urls.py

The script will:
1. Read the current manifest file
2. Find all slash commands with generic /slack/commands URLs
3. Replace them with specific URLs based on the command name
4. Write the updated manifest back to the file
"""

import re
import sys
from pathlib import Path
from typing import Match


def read_manifest_file(manifest_path: Path) -> str:
    """Read the manifest file and return its contents."""
    if not manifest_path.exists():
        print(f"❌ Manifest file not found: {manifest_path}")
        sys.exit(1)

    print(f"📁 Reading manifest from: {manifest_path}")

    try:
        return manifest_path.read_text()
    except Exception as e:
        print(f"❌ Error reading manifest file: {e}")
        sys.exit(1)


def create_backup(manifest_path: Path) -> Path:
    """Create a backup of the manifest file."""
    backup_path = manifest_path.with_suffix(".yaml.bak")
    try:
        manifest_path.rename(backup_path)
        print(f"📦 Created backup: {backup_path}")
        return backup_path
    except Exception as e:
        print(f"❌ Error creating backup: {e}")
        sys.exit(1)


def write_updated_manifest(
    manifest_path: Path, content: str, backup_path: Path
) -> None:
    """Write the updated manifest content."""
    try:
        manifest_path.write_text(content)
        print("✅ Manifest URLs updated successfully")
    except Exception as e:
        print(f"❌ Error writing updated manifest: {e}")
        # Restore backup
        try:
            backup_path.rename(manifest_path)
            print("🔄 Restored original manifest from backup")
        except Exception as restore_error:
            print(f"❌ Error restoring backup: {restore_error}")
        sys.exit(1)


def update_slack_manifest_urls() -> None:
    """Update Slack app manifest to use specific command URLs."""

    # Path to the manifest file
    manifest_path = Path(
        "/Users/sawyer/gitSync/gpt-cursor-runner/config/slack-app-manifest.yaml"
    )

    # Read the original manifest
    yaml_text = read_manifest_file(manifest_path)

    # Pattern to find each slash command entry with generic URL
    # This matches: command: /command-name + url: https://slack.thoughtmarks.app/slack/commands
    pattern = re.compile(
        r"(command:\s+)(/[\w-]+)(\s+url:\s+)https://slack\.thoughtmarks\.app/slack/commands"
    )

    def replace_url(match: Match[str]) -> str:
        """Replace generic URL with specific command URL."""
        command = match.group(2).lstrip("/")  # Remove leading slash
        return f"{match.group(1)}{match.group(2)}{match.group(3)}https://slack.thoughtmarks.app/slack/{command}"

    # Apply replacements
    fixed_yaml = pattern.sub(replace_url, yaml_text)

    # Check if any changes were made
    if fixed_yaml == yaml_text:
        print("✅ Manifest already has correct URLs - no changes needed")
        return

    # Create backup before writing
    backup_path = create_backup(manifest_path)

    # Write the updated manifest
    write_updated_manifest(manifest_path, fixed_yaml, backup_path)

    # Count the changes made
    original_matches = len(pattern.findall(yaml_text))
    print(f"🔧 Updated {original_matches} command URLs")

    # Show some examples of changes
    print("\n📋 Example changes made:")
    matches = list(pattern.finditer(yaml_text))
    for i, match in enumerate(matches):
        command = match.group(2)
        print(f"   {command} → https://slack.thoughtmarks.app/slack{command}")
        if i >= 4:  # Limit output
            print("   ... and more")
            break


def verify_manifest_urls() -> bool:
    """Verify that all URLs in the manifest are correct."""

    manifest_path = Path(
        "/Users/sawyer/gitSync/gpt-cursor-runner/config/slack-app-manifest.yaml"
    )

    if not manifest_path.exists():
        print(f"❌ Manifest file not found: {manifest_path}")
        return False

    yaml_text = manifest_path.read_text()

    # Pattern to find slash commands
    command_pattern = re.compile(r"command:\s+(/[\w-]+)")
    url_pattern = re.compile(r"url:\s+(https://slack\.thoughtmarks\.app/slack/[\w-]+)")

    commands = command_pattern.findall(yaml_text)
    urls = url_pattern.findall(yaml_text)

    print(f"🔍 Found {len(commands)} commands and {len(urls)} URLs")

    # Check for mismatches
    errors = []
    for i, command in enumerate(commands):
        if i < len(urls):
            expected_url = f"https://slack.thoughtmarks.app/slack{command}"
            actual_url = urls[i]
            if actual_url != expected_url:
                errors.append(
                    f"   {command}: expected {expected_url}, got {actual_url}"
                )

    if errors:
        print("❌ URL mismatches found:")
        for error in errors:
            print(error)
        return False
    else:
        print("✅ All URLs are correctly configured")
        return True


def main() -> None:
    """Main function to run the manifest updater."""
    print("🚀 Slack App Manifest URL Auto-Updater")
    print("=" * 50)

    # Update the manifest
    update_slack_manifest_urls()

    print("\n" + "=" * 50)
    print("🔍 Verifying manifest URLs...")

    # Verify the changes
    if verify_manifest_urls():
        print("\n✅ Manifest update completed successfully!")
        print("\n📝 Next steps:")
        print("   1. Deploy the updated manifest to your Slack app")
        print("   2. Test slash commands in your Slack workspace")
        print("   3. Monitor logs for any routing issues")
    else:
        print("\n❌ Manifest verification failed - please check manually")
        sys.exit(1)


if __name__ == "__main__":
    main()
