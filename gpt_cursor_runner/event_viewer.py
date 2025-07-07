#!/usr/bin/env python3
"""
Event Viewer CLI for GPT-Cursor Runner.

Browse and search logged events from patch runner and Slack integration.
"""

import json
import argparse
from datetime import datetime
from typing import Dict, Any
from .event_logger import EventLogger

def format_timestamp(timestamp_str: str) -> str:
    """Format timestamp for display."""
    try:
        dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m-%d %H:%M:%S")
    except Exception as e:
        try:
            from .slack_proxy import create_slack_proxy
            slack_proxy = create_slack_proxy()
            slack_proxy.notify_error(f"Error formatting timestamp: {e}", context=timestamp_str)
        except Exception:
            pass
        return timestamp_str

def display_event(event: Dict[str, Any], show_details: bool = False):
    """Display a single event."""
    event_type = event.get("type", "unknown")
    event_subtype = event.get("event_type", "unknown")
    timestamp = format_timestamp(event.get("timestamp", ""))
    
    # Color coding based on event type
    if event_type == "patch_event":
        icon = "📄"
        if event_subtype == "patch_applied":
            icon = "✅"
        elif event_subtype == "validation_failed":
            icon = "❌"
        elif event_subtype == "dangerous_pattern":
            icon = "⚠️"
    elif event_type == "slack_event":
        icon = "💬"
        if event_subtype == "slash_command":
            icon = "🔧"
        elif event_subtype == "app_mention":
            icon = "👤"
    elif event_type == "system_event":
        icon = "⚙️"
    else:
        icon = "📝"
    
    print(f"{icon} {timestamp} [{event_type}/{event_subtype}]")
    
    # Show relevant details based on event type
    if event_type == "patch_event":
        patch_id = event.get("patch_id", "unknown")
        target_file = event.get("target_file", "unknown")
        description = event.get("description", "")[:50]
        print(f"   📄 {patch_id} → {target_file}")
        if description:
            print(f"   📝 {description}...")
        
        result = event.get("result", {})
        if result.get("success"):
            print(f"   ✅ Success: {result.get('message', '')}")
        else:
            print(f"   ❌ Error: {result.get('message', '')}")
    
    elif event_type == "slack_event":
        user_id = event.get("user_id", "unknown")
        command = event.get("command", "")
        text = event.get("text", "")[:50]
        print(f"   👤 User: {user_id}")
        if command:
            print(f"   🔧 Command: {command}")
        if text:
            print(f"   💬 Text: {text}...")
    
    elif event_type == "system_event":
        data = event.get("data", {})
        print(f"   ⚙️  {data}")
    
    if show_details:
        print(f"   🔍 Full event: {json.dumps(event, indent=2)}")
    
    print()

def main():
    parser = argparse.ArgumentParser(description="Event Viewer for GPT-Cursor Runner")
    parser.add_argument("--type", choices=["patch_event", "slack_event", "system_event"], 
                       help="Filter by event type")
    parser.add_argument("--limit", type=int, default=20, help="Number of events to show")
    parser.add_argument("--search", help="Search in event content")
    parser.add_argument("--details", action="store_true", help="Show full event details")
    parser.add_argument("--summary", action="store_true", help="Show event summary")
    parser.add_argument("--clear-old", type=int, help="Clear events older than N days")
    
    args = parser.parse_args()
    
    event_logger = EventLogger()
    
    if args.clear_old:
        event_logger.clear_old_events(args.clear_old)
        print(f"🧹 Cleared events older than {args.clear_old} days")
        return
    
    if args.summary:
        summary = event_logger.get_event_summary()
        print("📊 Event Summary")
        print("=" * 50)
        print(f"Total events: {summary['total_events']}")
        print(f"Last updated: {format_timestamp(summary['last_updated'])}")
        print()
        
        print("Event counts by type:")
        for event_type, count in summary['type_counts'].items():
            print(f"  {event_type}: {count}")
        
        if summary['recent_events']:
            print("\nRecent activity:")
            for event in summary['recent_events'][-5:]:
                display_event(event, show_details=False)
        return
    
    # Get events
    events = event_logger.get_recent_events(args.limit, args.type)
    
    if args.search:
        # Filter events by search term
        search_term = args.search.lower()
        filtered_events = []
        for event in events:
            event_text = json.dumps(event).lower()
            if search_term in event_text:
                filtered_events.append(event)
        events = filtered_events
        print(f"🔍 Found {len(events)} events matching '{args.search}':")
    
    if not events:
        print("📭 No events found.")
        return
    
    print(f"📋 Showing {len(events)} events:")
    print("=" * 80)
    
    for event in events:
        display_event(event, show_details=args.details)
    
    print("\n💡 Use --summary to see event statistics")
    print("💡 Use --search <term> to search events")
    print("💡 Use --details to see full event data")
    print("💡 Use --type <type> to filter by event type")

if __name__ == "__main__":
    main() 