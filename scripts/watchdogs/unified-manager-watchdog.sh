#!/bin/bash
set -euo pipefail

# Unified Manager Watchdog
# Monitors and auto-recovers services using unified-manager.sh

LOG="/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/unified-manager-watchdog.log"
UNIFIED_MANAGER="/Users/sawyer/gitSync/gpt-cursor-runner/scripts/core/unified-manager.sh"

# Create log directory
mkdir -p $(dirname "$LOG")

# Enhanced logging
exec 2>> "$LOG"

# Function to check if unified manager is available
check_unified_manager() {
    if [ ! -f "$UNIFIED_MANAGER" ]; then
        echo "[$(date)] ❌ CRITICAL: unified-manager.sh not found at $UNIFIED_MANAGER"
        return 1
    fi
    
    if [ ! -x "$UNIFIED_MANAGER" ]; then
        echo "[$(date)] 🔧 Making unified-manager.sh executable..."
        chmod +x "$UNIFIED_MANAGER"
    fi
    
    return 0
}

# Function to monitor services
monitor_services() {
    echo "[$(date)] 🔍 Monitoring services via unified manager..."
    
    (
        if "$UNIFIED_MANAGER" monitor; then
            echo "[$(date)] ✅ All services healthy"
            return 0
        else
            echo "[$(date)] ❌ Some services unhealthy, attempting recovery..."
            return 1
        fi
    ) &
    MONITOR_PID=$!
    sleep 30
    disown $MONITOR_PID
    
    # Check if monitor process is still running (indicating failure)
    if ps -p $MONITOR_PID > /dev/null 2>&1; then
        echo "[$(date)] ⏰ Monitor timed out, attempting recovery..."
        return 1
    fi
    
    return 0
}

# Function to perform auto-recovery
auto_recovery() {
    echo "[$(date)] 🔄 Performing auto-recovery..."
    
    (
        if "$UNIFIED_MANAGER" recover; then
            echo "[$(date)] ✅ Auto-recovery completed"
        else
            echo "[$(date)] ❌ Auto-recovery failed"
        fi
    ) &
    RECOVERY_PID=$!
    sleep 60
    disown $RECOVERY_PID
}

# Function to check system resources
check_resources() {
    echo "[$(date)] 📊 Checking system resources..."
    
    (
        "$UNIFIED_MANAGER" resources
    ) &
    RESOURCE_PID=$!
    sleep 10
    disown $RESOURCE_PID
}

# Function to validate dashboard API
validate_dashboard() {
    echo "[$(date)] 🌐 Validating dashboard API..."
    
    (
        if curl -s --max-time 30 "http://localhost:8787/api/manager-status" > /dev/null 2>&1; then
            echo "[$(date)] ✅ Dashboard API responding"
        else
            echo "[$(date)] ❌ Dashboard API not responding"
        fi
    ) &
    DASHBOARD_PID=$!
    sleep 10
    disown $DASHBOARD_PID
}

# Main monitoring loop
main() {
    echo "[$(date)] 🚀 Starting unified manager watchdog..."
    
    # Check unified manager availability
    if ! check_unified_manager; then
        echo "[$(date)] ❌ Cannot start watchdog - unified manager not available"
        exit 1
    fi
    
    echo "[$(date)] ✅ Unified manager watchdog started"
    
    # Main monitoring loop
    while true; do
        echo "[$(date)] 🔄 Monitoring cycle started..."
        
        # Monitor services
        if ! monitor_services; then
            echo "[$(date)] ⚠️ Service health issues detected"
            auto_recovery
        fi
        
        # Check resources
        check_resources
        
        # Validate dashboard
        validate_dashboard
        
        echo "[$(date)] ✅ Monitoring cycle completed"
        
        # Wait for next cycle (1 minute)
        sleep 60
    done
}

# Command line interface
case "${1:-}" in
    "monitor")
        main
        ;;
    "test")
        echo "Testing unified manager watchdog..."
        check_unified_manager
        monitor_services
        check_resources
        validate_dashboard
        echo "Test completed"
        ;;
    "recover")
        echo "Manual recovery triggered..."
        auto_recovery
        ;;
    *)
        echo "Unified Manager Watchdog"
        echo "======================"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  monitor  - Start continuous monitoring"
        echo "  test     - Run one-time test"
        echo "  recover  - Trigger manual recovery"
        echo ""
        echo "Examples:"
        echo "  $0 monitor"
        echo "  $0 test"
        echo "  $0 recover"
        exit 1
        ;;
esac 