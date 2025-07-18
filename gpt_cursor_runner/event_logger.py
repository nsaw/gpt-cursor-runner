"""
Event Logger for GPT-Cursor Runner.

Captures patch results and Slack events for UI display and automation.
"""

import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional

class EventLogger:
    """Logs events for UI display and automation."""
    
    def __init__(self, log_file: str = "data/event-log.json"):
        self.log_file = log_file
        self.max_entries = 1000
        self.ensure_log_file()
    
    def ensure_log_file(self):
        """Ensure log file exists with proper structure."""
        if not os.path.exists(self.log_file):
            initial_data = {
                "events": [],
                "last_updated": datetime.now().isoformat(),
                "total_events": 0
            }
            self._write_log(initial_data)
    
    def _write_log(self, data: Dict[str, Any]):
        """Write log data to file."""
        try:
            with open(self.log_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error writing to log file: {e}")
    
    def _read_log(self) -> Dict[str, Any]:
        """Read log data from file."""
        try:
            with open(self.log_file, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error reading log file: {e}")
            try:
                from .slack_proxy import create_slack_proxy
                slack_proxy = create_slack_proxy()
                slack_proxy.notify_error(f"Error reading log file: {e}", context=self.log_file)
            except Exception:
                pass
            return {"events": [], "last_updated": datetime.now().isoformat(), "total_events": 0}
    
    def log_patch_event(self, event_type: str, patch_data: Dict[str, Any], result: Optional[Dict[str, Any]] = None):
        """Log patch-related events."""
        event = {
            "id": f"patch_{int(time.time() * 1000)}",
            "type": "patch_event",
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "patch_id": patch_data.get("id", "unknown"),
            "target_file": patch_data.get("target_file", ""),
            "description": patch_data.get("description", ""),
            "author": patch_data.get("metadata", {}).get("author", "unknown"),
            "source": patch_data.get("metadata", {}).get("source", "unknown"),
            "result": result or {}
        }
        
        self._add_event(event)
    
    def log_slack_event(self, event_type: str, slack_data: Dict[str, Any], result: Optional[Dict[str, Any]] = None):
        """Log Slack-related events."""
        event = {
            "id": f"slack_{int(time.time() * 1000)}",
            "type": "slack_event",
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "user_id": slack_data.get("user_id", "unknown"),
            "channel_id": slack_data.get("channel_id", "unknown"),
            "command": slack_data.get("command", ""),
            "text": slack_data.get("text", ""),
            "result": result or {}
        }
        
        self._add_event(event)
    
    def log_system_event(self, event_type: str, data: Optional[Dict[str, Any]] = None):
        """Log system events."""
        event = {
            "id": f"system_{int(time.time() * 1000)}",
            "type": "system_event",
            "event_type": event_type,
            "timestamp": datetime.now().isoformat(),
            "data": data or {}
        }
        
        self._add_event(event)
    
    def log_patch_retry(self, patch_data, result):
        self.log_patch_event('retry_failed', patch_data, result)
    def log_patch_quarantine(self, patch_data, result):
        self.log_patch_event('quarantined', patch_data, result)
    def log_health_check(self, status, message):
        self.log_system_event('patch_health_check', {'status': status, 'message': message})
    
    def _add_event(self, event: Dict[str, Any]):
        """Add event to log."""
        log_data = self._read_log()
        
        # Add event
        log_data["events"].append(event)
        log_data["last_updated"] = datetime.now().isoformat()
        log_data["total_events"] = len(log_data["events"])
        
        # Trim old events
        if len(log_data["events"]) > self.max_entries:
            log_data["events"] = log_data["events"][-self.max_entries:]
        
        self._write_log(log_data)
    
    def get_recent_events(self, limit: int = 50, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get recent events, optionally filtered by type."""
        log_data = self._read_log()
        events = log_data.get("events", [])
        
        if event_type:
            events = [e for e in events if e.get("type") == event_type]
        
        return events[-limit:]
    
    def get_patch_events(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent patch events."""
        return self.get_recent_events(limit, "patch_event")
    
    def get_slack_events(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent Slack events."""
        return self.get_recent_events(limit, "slack_event")
    
    def get_system_events(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Get recent system events."""
        return self.get_recent_events(limit, "system_event")
    
    def get_event_summary(self) -> Dict[str, Any]:
        """Get summary of recent events."""
        log_data = self._read_log()
        events = log_data.get("events", [])
        
        # Count by type
        type_counts = {}
        for event in events:
            event_type = event.get("type", "unknown")
            type_counts[event_type] = type_counts.get(event_type, 0) + 1
        
        # Get recent activity
        recent_events = events[-10:] if events else []
        
        return {
            "total_events": len(events),
            "type_counts": type_counts,
            "recent_events": recent_events,
            "last_updated": log_data.get("last_updated", "")
        }
    
    def clear_old_events(self, days: int = 30):
        """Clear events older than specified days."""
        cutoff_time = datetime.now().timestamp() - (days * 24 * 60 * 60)
        
        log_data = self._read_log()
        events = log_data.get("events", [])
        
        # Filter out old events
        filtered_events = []
        for event in events:
            try:
                event_time = datetime.fromisoformat(event.get("timestamp", "")).timestamp()
                if event_time > cutoff_time:
                    filtered_events.append(event)
            except Exception as e:
                # Keep events with invalid timestamps
                filtered_events.append(event)
                try:
                    from .slack_proxy import create_slack_proxy
                    slack_proxy = create_slack_proxy()
                    slack_proxy.notify_error(f"Error parsing event timestamp: {e}", context=str(event))
                except Exception:
                    pass
        
        log_data["events"] = filtered_events
        log_data["total_events"] = len(filtered_events)
        log_data["last_updated"] = datetime.now().isoformat()
        
        self._write_log(log_data)
        print(f"Cleared {len(events) - len(filtered_events)} old events")

# Global instance
event_logger = EventLogger() 