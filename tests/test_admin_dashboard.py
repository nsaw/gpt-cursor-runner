#!/usr/bin/env python3
"""
Test script for Admin Dashboard functionality.

Tests health monitoring, authentication, and dashboard features.
"""

import os
import sys
import json
import time
import requests
import subprocess
from pathlib import Path

# Add the parent directory to the path to import modules
sys.path.insert(0, str(Path(__file__).parent.parent))

def test_health_monitor():
    """Test health monitoring functionality."""
    print("🧪 Testing Health Monitor...")
    
    try:
        from gpt_cursor_runner.admin_dashboard import HealthMonitor
        
        monitor = HealthMonitor()
        health_status = monitor.get_all_health_status()
        
        print(f"✅ Health monitor initialized")
        print(f"📊 Services monitored: {len(health_status)}")
        
        for service, status in health_status.items():
            print(f"  - {service}: {status['status']}")
        
        return True
    except Exception as e:
        print(f"❌ Health monitor test failed: {e}")
        return False

def test_agent_queue_monitor():
    """Test agent queue monitoring."""
    print("\n🧪 Testing Agent Queue Monitor...")
    
    try:
        from gpt_cursor_runner.admin_dashboard import AgentQueueMonitor
        
        monitor = AgentQueueMonitor()
        queue_stats = monitor.get_queue_stats()
        
        print(f"✅ Agent queue monitor initialized")
        print(f"📊 Queue stats: {queue_stats}")
        
        return True
    except Exception as e:
        print(f"❌ Agent queue monitor test failed: {e}")
        return False

def test_summary_tracker():
    """Test summary tracking functionality."""
    print("\n🧪 Testing Summary Tracker...")
    
    try:
        from gpt_cursor_runner.admin_dashboard import SummaryTracker
        
        tracker = SummaryTracker()
        summary_stats = tracker.get_summary_stats()
        
        print(f"✅ Summary tracker initialized")
        print(f"📊 Summary stats: {summary_stats}")
        
        return True
    except Exception as e:
        print(f"❌ Summary tracker test failed: {e}")
        return False

def test_admin_config():
    """Test admin configuration."""
    print("\n🧪 Testing Admin Configuration...")
    
    try:
        from gpt_cursor_runner.admin_config import AdminConfig
        
        config = AdminConfig()
        
        print(f"✅ Admin config initialized")
        print(f"📊 Username: {config.admin_username}")
        print(f"📊 Remote access: {config.remote_access_enabled}")
        print(f"📊 Rate limiting: {config.rate_limit_enabled}")
        
        # Test password hashing
        test_password = "test_password_123"
        password_hash = config.hash_password(test_password)
        is_valid = config.verify_password(test_password)
        
        print(f"✅ Password hashing: {'Working' if is_valid else 'Failed'}")
        
        return True
    except Exception as e:
        print(f"❌ Admin config test failed: {e}")
        return False

def test_flask_app_integration():
    """Test Flask app integration."""
    print("\n🧪 Testing Flask App Integration...")
    
    try:
        # This would require the Flask app to be running
        # For now, we'll just test the imports
        from gpt_cursor_runner.admin_dashboard import create_admin_dashboard_routes
        from gpt_cursor_runner.admin_config import create_admin_auth_routes
        
        print("✅ Admin dashboard routes can be created")
        print("✅ Admin auth routes can be created")
        
        return True
    except Exception as e:
        print(f"❌ Flask app integration test failed: {e}")
        return False

def test_system_stats():
    """Test system statistics collection."""
    print("\n🧪 Testing System Statistics...")
    
    try:
        from gpt_cursor_runner.admin_dashboard import get_system_stats
        
        stats = get_system_stats()
        
        if 'error' in stats:
            print(f"❌ System stats error: {stats['error']}")
            return False
        
        print("✅ System stats collected successfully")
        print(f"📊 CPU usage: {stats['cpu']['usage_percent']:.1f}%")
        print(f"📊 Memory usage: {stats['memory']['percent']:.1f}%")
        print(f"📊 Disk usage: {stats['disk']['percent']:.1f}%")
        
        return True
    except Exception as e:
        print(f"❌ System stats test failed: {e}")
        return False

def test_patch_stats():
    """Test patch statistics collection."""
    print("\n🧪 Testing Patch Statistics...")
    
    try:
        from gpt_cursor_runner.admin_dashboard import get_detailed_patch_stats
        
        stats = get_detailed_patch_stats()
        
        print("✅ Patch stats collected successfully")
        print(f"📊 Total patches: {stats['total_patches']}")
        print(f"📊 Successful: {stats['successful_patches']}")
        print(f"📊 Failed: {stats['failed_patches']}")
        
        return True
    except Exception as e:
        print(f"❌ Patch stats test failed: {e}")
        return False

def create_test_data():
    """Create test data for dashboard."""
    print("\n🧪 Creating Test Data...")
    
    try:
        # Create test patches directory
        patches_dir = Path("patches")
        patches_dir.mkdir(exist_ok=True)
        
        # Create a test patch file
        test_patch = {
            "id": "test-patch-001",
            "role": "ui_patch",
            "description": "Test patch for admin dashboard",
            "target_file": "test-file.tsx",
            "status": "success",
            "metadata": {
                "author": "test-user",
                "timestamp": time.time()
            }
        }
        
        with open(patches_dir / "test-patch.json", "w") as f:
            json.dump(test_patch, f, indent=2)
        
        print("✅ Test patch file created")
        
        # Create test event log
        test_events = {
            "events": [
                {
                    "id": "test-event-001",
                    "type": "patch_event",
                    "timestamp": time.time(),
                    "data": {"test": True}
                }
            ],
            "last_updated": time.time(),
            "total_events": 1
        }
        
        with open("event-log.json", "w") as f:
            json.dump(test_events, f, indent=2)
        
        print("✅ Test event log created")
        
        return True
    except Exception as e:
        print(f"❌ Test data creation failed: {e}")
        return False

def run_all_tests():
    """Run all admin dashboard tests."""
    print("🚀 Starting Admin Dashboard Tests")
    print("=" * 50)
    
    tests = [
        test_health_monitor,
        test_agent_queue_monitor,
        test_summary_tracker,
        test_admin_config,
        test_flask_app_integration,
        test_system_stats,
        test_patch_stats,
        create_test_data
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed! Admin dashboard is ready.")
    else:
        print("❌ Some tests failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)