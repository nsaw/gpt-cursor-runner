#!/usr/bin/env python3
"""
Event Viewer for GPT-Cursor Runner.

Provides event viewing and analysis capabilities.
"""

import json
from datetime import datetime
from typing import Dict, Any, Optional

# Import dependencies
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None

try:
    from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None


def format_timestamp(timestamp_str: str) -> str:
    """Format timestamp for display."""
    try:
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception as e:
        try:
            if slack_proxy:
                slack_proxy.notify_error(
                    f"Error formatting timestamp: {e}", context=timestamp_str
                )
        except Exception:
            pass
    return timestamp_str


def display_event(event: Dict[str, Any], show_details: bool = False):
    """Display a single event."""
    event_type = event.get("type", "unknown")
    event_id = event.get("id", "unknown")
    timestamp = format_timestamp(event.get("timestamp", ""))

    print(f"\n📅 {timestamp}")
    print(f"🆔 {event_id}")
    print(f"📋 Type: {event_type}")

    if event_type == "patch_event":
        event.get("patch_id", "unknown")
        target_file = event.get("target_file", "unknown")
        description = event.get("description", "No description")

        print(f"🎯 Target: {target_file}")
        print(f"📝 Description: {description}")
        print(f"👤 Author: {event.get('author', 'unknown')}")
        print(f"🔗 Source: {event.get('source', 'unknown')}")

        if show_details:
            result = event.get("result", {})
            print(f"✅ Success: {result.get('success', False)}")
            print(f"💬 Message: {result.get('message', 'No message')}")
            print(f"🔄 Changes: {result.get('changes_made', False)}")
            print(f"💾 Backup: {result.get('backup_created', False)}")

    elif event_type == "slack_event":
        user_id = event.get("user_id", "unknown")
        channel_id = event.get("channel_id", "unknown")
        command = event.get("command", "unknown")
        text = event.get("text", "")

        print(f"👤 User: {user_id}")
        print(f"📢 Channel: {channel_id}")
        print(f"⌨️  Command: {command}")
        print(f"💬 Text: {text}")

        if show_details:
            result = event.get("result", {})
            print(f"✅ Success: {result.get('success', False)}")
            print(f"💬 Message: {result.get('message', 'No message')}")

    elif event_type == "system_event":
        event_subtype = event.get("event_type", "unknown")
        data = event.get("data", {})

        print(f"🔧 Subtype: {event_subtype}")
        if show_details:
            print(f"📊 Data: {json.dumps(data, indent=2)}")

    print("-" * 50)


def list_events(
    limit: int = 50, event_type: Optional[str] = None, show_details: bool = False
):
    """List recent events."""
    if not event_logger:
        print("❌ Event logger not available")
        return

    try:
        events = event_logger.get_recent_events(limit, event_type)

        if not events:
            print("📭 No events found")
            return

        print(f"📋 Found {len(events)} events")
        print("=" * 80)

        for event in events:
            display_event(event, show_details)

    except Exception as e:
        print(f"❌ Error listing events: {e}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error listing events: {e}")
        except Exception:
            pass


def search_events(query: str, limit: int = 50, show_details: bool = False):
    """Search events by query string."""
    if not event_logger:
        print("❌ Event logger not available")
        return

    try:
        events = event_logger.get_recent_events(1000)  # Get more events for searching

        if not events:
            print("📭 No events found")
            return

        # Filter events by query
        query_lower = query.lower()
        matching_events = []

        for event in events:
            # Search in various fields
            searchable_text = " ".join(
                [
                    str(event.get("id", "")),
                    str(event.get("type", "")),
                    str(event.get("patch_id", "")),
                    str(event.get("target_file", "")),
                    str(event.get("description", "")),
                    str(event.get("user_id", "")),
                    str(event.get("command", "")),
                    str(event.get("text", "")),
                ]
            )

            if query_lower in searchable_text.lower():
                matching_events.append(event)

        if not matching_events:
            print(f"🔍 No events found matching '{query}'")
            return

        print(f"🔍 Found {len(matching_events)} events matching '{query}'")
        print("=" * 80)

        for event in matching_events[:limit]:
            display_event(event, show_details)

    except Exception as e:
        print(f"❌ Error searching events: {e}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error searching events: {e}")
        except Exception:
            pass


def get_event_summary():
    """Get summary of events."""
    if not event_logger:
        print("❌ Event logger not available")
        return

    try:
        summary = event_logger.get_event_summary()

        print("📊 Event Summary")
        print("=" * 50)
        print(f"📈 Total Events: {summary.get('total_events', 0)}")
        print(f"🕒 Last Updated: {summary.get('last_updated', 'Unknown')}")

        event_counts = summary.get("event_counts", {})
        if event_counts:
            print("\n📋 By Type:")
            for event_type, count in event_counts.items():
                print(f"  {event_type}: {count}")

    except Exception as e:
        print(f"❌ Error getting event summary: {e}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting event summary: {e}")
        except Exception:
            pass


def get_event_analytics():
    """Get analytics for events."""
    if not event_logger:
        print("❌ Event logger not available")
        return

    try:
        events = event_logger.get_recent_events(1000)

        if not events:
            print("📭 No events found for analytics")
            return

        # Count by type
        type_counts = {}
        user_counts = {}
        command_counts = {}
        file_counts = {}

        for event in events:
            event_type = event.get("type", "unknown")
            type_counts[event_type] = type_counts.get(event_type, 0) + 1

            if event_type == "slack_event":
                user_id = event.get("user_id", "unknown")
                user_counts[user_id] = user_counts.get(user_id, 0) + 1

                command = event.get("command", "unknown")
                command_counts[command] = command_counts.get(command, 0) + 1

            elif event_type == "patch_event":
                target_file = event.get("target_file", "unknown")
                file_counts[target_file] = file_counts.get(target_file, 0) + 1

        print("📊 Event Analytics")
        print("=" * 50)
        print(f"📈 Total Events: {len(events)}")

        print("\n📋 By Type:")
        for event_type, count in type_counts.items():
            print(f"  {event_type}: {count}")

        if user_counts:
            print("\n👤 Top Users:")
            for user_id, count in sorted(
                user_counts.items(), key=lambda x: x[1], reverse=True
            )[:5]:
                print(f"  {user_id}: {count}")

        if command_counts:
            print("\n⌨️  Top Commands:")
            for command, count in sorted(
                command_counts.items(), key=lambda x: x[1], reverse=True
            )[:5]:
                print(f"  {command}: {count}")

        if file_counts:
            print("\n📁 Top Files:")
            for file_path, count in sorted(
                file_counts.items(), key=lambda x: x[1], reverse=True
            )[:5]:
                print(f"  {file_path}: {count}")

    except Exception as e:
        print(f"❌ Error getting event analytics: {e}")
        try:
            if slack_proxy:
                slack_proxy.notify_error(f"Error getting event analytics: {e}")
        except Exception:
            pass


def main():
    """Main function for event viewer."""
    import argparse

    parser = argparse.ArgumentParser(description="Event Viewer for GPT-Cursor Runner")
    parser.add_argument("--limit", type=int, default=20, help="Limit number of events")
    parser.add_argument("--type", help="Filter by event type")
    parser.add_argument("--search", help="Search events by content")
    parser.add_argument(
        "--details", action="store_true", help="Show detailed information"
    )
    parser.add_argument("--summary", action="store_true", help="Show event summary")
    parser.add_argument("--analytics", action="store_true", help="Show event analytics")

    args = parser.parse_args()

    if args.summary:
        get_event_summary()
    elif args.analytics:
        get_event_analytics()
    elif args.search:
        search_events(args.search, args.limit, args.details)
    else:
        list_events(args.limit, args.type, args.details)


if __name__ == "__main__":
    main()
