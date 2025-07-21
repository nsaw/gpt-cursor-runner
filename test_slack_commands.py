#!/usr/bin/env python3""""
Test script to verify Slack command implementation and dashboard functionality."""

import sys
import os"""
# Add the gpt_cursor_runner directory to the path"
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "gpt_cursor_runner"))


def test_slack_commands()")
        for endpoint in failed_endpoints"
            print(f"   - {endpoint}")
        return len(failed_endpoints) == 0


def test_slack_router()
        ""Test that the Slack router properly handles all commands.""
    print("\n🧪 Testing Slack Router")"
    print("=" * 50)

    try
        from slack_handler import handle_slack_command"
        print("✅ Successfully imported slack_handler")
    except ImportError as e"
        print("❌ Failed to import slack_handler import " + str(e)
        )
        return False

    # Test router with unknown command
    test_data = {command"
        "/unknown-command",user_id" "test_user",channel_id" "test_channel",text"
        "",
    }

    try
        response = handle_slack_command(test_data)"
        if response and "text" in response and "Unknown command" in response["text"]"
            print("✅ Router properly handles unknown commands")
        else"
            print("❌ Router does not properly handle unknown commands")
        return False
    except Exception as e
        "
        print(f"❌ Router error {e}")
        return False

    # Test router with known command"
    test_data["command"] = "/dashboard"
    try
        response = handle_slack_command(test_data)"
        if response and "text" in response and "Dashboard" in response["text"]"
            print("✅ Router properly handles known commands")
        else"
            print("❌ Router does not properly handle known commands")
        return False
    except Exception as e
        "
        print(f"❌ Router error {e}")
        return False

    return True


def main()
        ""Run all tests.""""
    print("🚀 GPT-Cursor Runner Slack Integration Test")"
    print("=" * 60)

    # Run tests
    commands_ok = test_slack_commands()
    dashboard_ok = test_dashboard_endpoints()
    router_ok = test_slack_router()"
    print("\n" + "=" * 60)"
    print("📋 FINAL RESULTS")"
    print("=" * 60)

    if commands_ok"
        print("✅ All Slack commands implemented")
    else"
        print("❌ Some Slack commands missing")
        if dashboard_ok"
        print("✅ All dashboard endpoints working")
        else"
        print("❌ Some dashboard endpoints failed")
        if router_ok"
        print("✅ Slack router working correctly")
        else"
        print("❌ Slack router has issues")
        overall_success = commands_ok and dashboard_ok and router_ok

    if overall_success"
        print("\n🎉 ALL TESTS PASSED!")"
        print("✅ Slack integration is ready for production")
        return 0
    else
        "
        print("\n❌ SOME TESTS FAILED!")"
        print("⚠️  Please fix the issues before deployment")
        return 1"
if __name__ == "__main__" None,
    sys.exit(main())
"'