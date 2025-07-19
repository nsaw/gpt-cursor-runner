#!/usr/bin/env python3
"""
Test script to verify Slack command implementation and dashboard functionality.
"""

import sys
import os

# Add the gpt_cursor_runner directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "gpt_cursor_runner"))


def test_slack_commands():
    """Test that all slash commands are properly implemented."""

    # List of all expected slash commands
    expected_commands = [
        "/dashboard",
        "/patch-approve",
        "/patch-revert",
        "/pause-runner",
        "/restart-runner",
        "/restart-runner-gpt",
        "/continue-runner",
        "/status-runner",
        "/roadmap",
        "/show-roadmap",
        "/kill",
        "/toggle-runner-auto",
        "/patch-preview",
        "/approve-screenshot",
        "/revert-phase",
        "/log-phase-status",
        "/cursor-mode",
        "/whoami",
        "/retry-last-failed",
        "/lock-runner",
        "/unlock-runner",
        "/alert-runner-crash",
        "/read-secret",
        "/manual-revise",
        "/manual-append",
        "/interrupt",
        "/send-with",
        "/troubleshoot",
        "/troubleshoot-oversight",
        "/toggle-runner-on",
        "/toggle-runner-off",
    ]

    print("🧪 Testing Slack Command Implementation")
    print("=" * 50)

    # Import the slack handler
    try:
        from slack_handler import handle_slack_command

        print("✅ Successfully imported slack_handler")
    except ImportError as e:
        print("❌ Failed to import slack_handler: " + str(e))
        return False

    # Test each command
    test_data = {"user_id": "test_user", "channel_id": "test_channel", "text": ""}

    implemented_commands = []
    missing_commands = []

    for command in expected_commands:
        test_data["command"] = command
        try:
            response = handle_slack_command(test_data)
            if response and "text" in response:
                implemented_commands.append(command)
                print(f"✅ {command} - Implemented")
            else:
                missing_commands.append(command)
                print(f"❌ {command} - Missing or invalid response")
        except Exception as e:
            missing_commands.append(command)
            print(f"❌ {command} - Error: {e}")

    print("\n" + "=" * 50)
    print(f"📊 Results:")
    print(f"✅ Implemented: {len(implemented_commands)}/{len(expected_commands)}")
    print(f"❌ Missing: {len(missing_commands)}")

    if missing_commands:
        print(f"\n❌ Missing commands:")
        for cmd in missing_commands:
            print(f"   - {cmd}")

    return len(missing_commands) == 0


def test_dashboard_endpoints():
    """Test that dashboard endpoints are properly implemented."""

    print("\n🧪 Testing Dashboard Endpoints")
    print("=" * 50)

    # Import dashboard functions
    try:
        from dashboard import (
            get_dashboard_stats,
            get_tunnel_status,
            get_agent_status,
            get_queue_status,
            get_slack_command_stats,
        )

        print("✅ Successfully imported dashboard functions")
    except ImportError as e:
        print("❌ Failed to import dashboard functions: " + str(e))
        return False

    # Test each endpoint function
    endpoints = [
        ("get_dashboard_stats", get_dashboard_stats),
        ("get_tunnel_status", get_tunnel_status),
        ("get_agent_status", get_agent_status),
        ("get_queue_status", get_queue_status),
        ("get_slack_command_stats", get_slack_command_stats),
    ]

    working_endpoints = []
    failed_endpoints = []

    for name, func in endpoints:
        try:
            result = func()
            if result and not isinstance(result, dict):
                failed_endpoints.append(name)
                print(f"❌ {name} - Invalid return type")
            elif result and "error" in result:
                failed_endpoints.append(name)
                print(f"❌ {name} - Error: {result['error']}")
            else:
                working_endpoints.append(name)
                print(f"✅ {name} - Working")
        except Exception as e:
            failed_endpoints.append(name)
            print(f"❌ {name} - Exception: {e}")

    print("\n" + "=" * 50)
    print(f"📊 Dashboard Results:")
    print(f"✅ Working: {len(working_endpoints)}/{len(endpoints)}")
    print(f"❌ Failed: {len(failed_endpoints)}")

    if failed_endpoints:
        print(f"\n❌ Failed endpoints:")
        for endpoint in failed_endpoints:
            print(f"   - {endpoint}")

    return len(failed_endpoints) == 0


def test_slack_router():
    """Test that the Slack router properly handles all commands."""

    print("\n🧪 Testing Slack Router")
    print("=" * 50)

    try:
        from slack_handler import handle_slack_command

        print("✅ Successfully imported slack_handler")
    except ImportError as e:
        print("❌ Failed to import slack_handler: " + str(e))
        return False

    # Test router with unknown command
    test_data = {
        "command": "/unknown-command",
        "user_id": "test_user",
        "channel_id": "test_channel",
        "text": "",
    }

    try:
        response = handle_slack_command(test_data)
        if response and "text" in response and "Unknown command" in response["text"]:
            print("✅ Router properly handles unknown commands")
        else:
            print("❌ Router does not properly handle unknown commands")
            return False
    except Exception as e:
        print(f"❌ Router error: {e}")
        return False

    # Test router with known command
    test_data["command"] = "/dashboard"
    try:
        response = handle_slack_command(test_data)
        if response and "text" in response and "Dashboard" in response["text"]:
            print("✅ Router properly handles known commands")
        else:
            print("❌ Router does not properly handle known commands")
            return False
    except Exception as e:
        print(f"❌ Router error: {e}")
        return False

    return True


def main():
    """Run all tests."""
    print("🚀 GPT-Cursor Runner Slack Integration Test")
    print("=" * 60)

    # Run tests
    commands_ok = test_slack_commands()
    dashboard_ok = test_dashboard_endpoints()
    router_ok = test_slack_router()

    print("\n" + "=" * 60)
    print("📋 FINAL RESULTS")
    print("=" * 60)

    if commands_ok:
        print("✅ All Slack commands implemented")
    else:
        print("❌ Some Slack commands missing")

    if dashboard_ok:
        print("✅ All dashboard endpoints working")
    else:
        print("❌ Some dashboard endpoints failed")

    if router_ok:
        print("✅ Slack router working correctly")
    else:
        print("❌ Slack router has issues")

    overall_success = commands_ok and dashboard_ok and router_ok

    if overall_success:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ Slack integration is ready for production")
        return 0
    else:
        print("\n❌ SOME TESTS FAILED!")
        print("⚠️  Please fix the issues before deployment")
        return 1


if __name__ == "__main__":
    sys.exit(main())
