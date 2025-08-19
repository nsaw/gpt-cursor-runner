# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
# Company Confidential
#!/usr/bin/env python3
"""
Dashboard for GPT-Cursor Runner.

Provides web dashboard and statistics endpoints.
"""

from typing import Dict, List, Any
import json
import os
import glob
from datetime import datetime, timedelta
from flask import Flask, jsonify, Response


# Import dependencies
try:
    from .event_logger import event_logger
except ImportError:
    event_logger = None  # type: ignore[assignment]

try:
    from .slack_proxy import create_slack_proxy

    slack_proxy = create_slack_proxy()
except ImportError:
    slack_proxy = None  # type: ignore[assignment]


def _read_nextgen_dashboard_html() -> str:
    """Load NextGen dashboard HTML from dashboard/templates/dashboard.html.
    Falls back to embedded HTML if file not found or unreadable.
    """
    try:
        base_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
        tpl_path = os.path.join(base_dir, "dashboard", "templates", "dashboard.html")
        with open(tpl_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return DASHBOARD_HTML


def create_dashboard_routes(app: Flask) -> None:
    """Create dashboard routes for Flask app."""

    @app.route("/dashboard")
    def dashboard() -> Any:
        """Serve NextGen dashboard HTML (file-based if available)."""
        return Response(
            _read_nextgen_dashboard_html(), mimetype="text/html; charset=utf-8"
        )

    # Alias used by external monitors
    @app.route("/monitor")
    def monitor() -> Any:
        return Response(
            _read_nextgen_dashboard_html(), mimetype="text/html; charset=utf-8"
        )

    @app.route("/api/dashboard/stats")
    def dashboard_stats() -> Any:
        """Get dashboard statistics."""
        try:
            stats = get_dashboard_stats()
            return jsonify(stats)
        except Exception as e:
            error_msg = f"Error getting dashboard stats: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/stats")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route("/api/dashboard/events")
    def dashboard_events() -> Any:
        """Get recent events."""
        try:
            if event_logger:
                events = event_logger.get_recent_events(50)
                return jsonify({"events": events})
            else:
                return jsonify({"error": "Event logger not available"}), 500
        except Exception as e:
            error_msg = f"Error getting events: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/events")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route("/api/dashboard/patches")
    def dashboard_patches() -> Any:
        """Get recent patches."""
        try:
            patches = get_recent_patches(20)
            return jsonify({"patches": patches})
        except Exception as e:
            error_msg = f"Error getting patches: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/patches"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route("/api/dashboard/metrics")
    def dashboard_metrics() -> Any:
        """Get system metrics."""
        try:
            metrics = {
                "uptime": get_uptime(),
                "memory": get_memory_usage(),
                "disk": get_disk_usage(),
            }
            return jsonify(metrics)
        except Exception as e:
            error_msg = f"Error getting metrics: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/metrics"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route("/api/dashboard/tunnels")
    def dashboard_tunnels() -> Any:
        """Get tunnel status."""
        try:
            tunnels = get_tunnel_status()
            return jsonify(tunnels)
        except Exception as e:
            error_msg = f"Error getting tunnel status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/tunnels"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route("/api/dashboard/agents")
    def dashboard_agents() -> Any:
        """Get agent status."""
        try:
            agents = get_agent_status()
            return jsonify(agents)
        except Exception as e:
            error_msg = f"Error getting agent status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/agents")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route("/api/dashboard/queues")
    def dashboard_queues() -> Any:
        """Get queue status."""
        try:
            queues = get_queue_status()
            return jsonify(queues)
        except Exception as e:
            error_msg = f"Error getting queue status: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(error_msg, context="/api/dashboard/queues")
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500

    @app.route("/api/dashboard/slack-commands")
    def dashboard_slack_commands() -> Any:
        """Get Slack command statistics."""
        try:
            stats = get_slack_command_stats()
            return jsonify(stats)
        except Exception as e:
            error_msg = f"Error getting Slack command stats: {str(e)}"
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        error_msg, context="/api/dashboard/slack-commands"
                    )
            except Exception:
                pass
            return jsonify({"error": error_msg}), 500


def get_dashboard_stats() -> Dict[str, Any]:
    """Get comprehensive dashboard statistics."""
    stats = {
        "timestamp": datetime.now().isoformat(),
        "patches": {},
        "events": {},
        "slack": {},
    }

    # Event statistics
    if event_logger:
        try:
            events = event_logger.get_recent_events(1000)
            event_counts: Dict[str, int] = {}
            for event in events:
                event_type = event.get("type", "unknown")
                event_counts[event_type] = event_counts.get(event_type, 0) + 1

            stats["events"] = {
                "total": len(events),
                "by_type": event_counts,
                "recent_24h": len([e for e in events if is_recent_event(e, 24)]),
                "recent_7d": len([e for e in events if is_recent_event(e, 7 * 24)]),
            }
        except Exception as e:
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        f"Error getting event stats: {e}", context="get_dashboard_stats"
                    )
            except Exception:
                pass

    # Slack statistics
    if event_logger:
        try:
            slack_events = event_logger.get_slack_events(1000)
            slack_counts: Dict[str, int] = {}
            for event in slack_events:
                event_type = event.get("event_type", "unknown")
                slack_counts[event_type] = slack_counts.get(event_type, 0) + 1

            stats["slack"] = {
                "total_events": len(slack_events),
                "by_type": slack_counts,
                "recent_24h": len([e for e in slack_events if is_recent_event(e, 24)]),
            }
        except Exception as e:
            try:
                if slack_proxy:
                    slack_proxy.notify_error(
                        f"Error getting Slack stats: {e}", context="get_dashboard_stats"
                    )
            except Exception:
                pass

    return stats


def get_recent_patches(limit: int = 20) -> List[Dict[str, Any]]:
    """Get recent patches from the patches directory."""
    patches = []
    patches_dir = os.getenv("PATCHES_DIRECTORY", "patches")

    if os.path.exists(patches_dir):
        patch_files = glob.glob(os.path.join(patches_dir, "*.json"))
        patch_files.sort(key=os.path.getmtime, reverse=True)

        for patch_file in patch_files[:limit]:
            try:
                with open(patch_file, "r") as f:
                    patch_data = json.load(f)
                    patch_data["filepath"] = patch_file
                    patch_data["modified"] = datetime.fromtimestamp(
                        os.path.getmtime(patch_file)
                    ).isoformat()
                    patches.append(patch_data)
            except Exception as e:
                print(f"Error reading patch file {patch_file}: {e}")

    return patches


def get_uptime() -> Dict[str, Any]:
    """Get system uptime information."""
    try:
        import psutil

        boot_time = datetime.fromtimestamp(psutil.boot_time())
        uptime = datetime.now() - boot_time

        return {
            "boot_time": boot_time.isoformat(),
            "uptime_seconds": int(uptime.total_seconds()),
            "uptime_days": uptime.days,
            "uptime_hours": uptime.seconds // 3600,
            "uptime_minutes": (uptime.seconds % 3600) // 60,
        }
    except ImportError:
        return {"error": "psutil not available"}


def get_memory_usage() -> Dict[str, Any]:
    """Get memory usage information."""
    try:
        import psutil

        memory = psutil.virtual_memory()

        return {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "percent": memory.percent,
            "free": memory.free,
        }
    except ImportError:
        return {"error": "psutil not available"}


def get_disk_usage() -> Dict[str, Any]:
    """Get disk usage information."""
    try:
        import psutil

        disk = psutil.disk_usage("/")

        return {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": (disk.used / disk.total) * 100,
        }
    except ImportError:
        return {"error": "psutil not available"}


def get_tunnel_status() -> Dict[str, Any]:
    """Get tunnel status information."""
    # Placeholder for tunnel status
    return {
        "status": "unknown",
        "tunnels": [],
    }


def get_agent_status() -> Dict[str, Any]:
    """Get agent status information."""
    # Placeholder for agent status
    return {
        "status": "unknown",
        "agents": [],
    }


def get_queue_status() -> Dict[str, Any]:
    """Get queue status information."""
    # Placeholder for queue status
    return {
        "status": "unknown",
        "queues": [],
    }


def get_slack_command_stats() -> Dict[str, Any]:
    """Get Slack command statistics."""
    if event_logger:
        try:
            slack_events = event_logger.get_slack_events(1000)
            command_counts: Dict[str, int] = {}

            for event in slack_events:
                if event.get("event_type") == "slash_command":
                    command = event.get("command", "unknown")
                    command_counts[command] = command_counts.get(command, 0) + 1

            return {
                "total_commands": len(
                    [e for e in slack_events if e.get("event_type") == "slash_command"]
                ),
                "by_command": command_counts,
                "recent_24h": len(
                    [
                        e
                        for e in slack_events
                        if e.get("event_type") == "slash_command"
                        and is_recent_event(e, 24)
                    ]
                ),
            }
        except Exception as e:
            return {"error": f"Error getting Slack command stats: {e}"}

    return {"error": "Event logger not available"}


def is_recent_event(event: Dict[str, Any], hours: int) -> bool:
    """Check if an event is within the specified hours."""
    try:
        event_time = datetime.fromisoformat(event.get("timestamp", ""))
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return event_time > cutoff_time
    except Exception:
        return False


# Dashboard HTML template (no leading newline; first line is DOCTYPE)
DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>***REMOVED*** RUNNER — NextGen Dashboard</title>
  <!-- Cache busting for development -->
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Ubuntu:ital,wght@0,300;0,400;0,500;0,700;1,300&display=swap" rel="stylesheet" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;900&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg:#232529; --pnl:#19233153; --brd:#a5a5d64e;
      --txt:#3e9fe4f5; --sub:#d3dce7; --sub2:#818181; --head1:#babad3c0; --head2:#c2c2ff;
      --ok:#14936693; --warn:#f8a3249d; --err:#df131379;
      --grad:linear-gradient(135deg,#153d2f 0%,#1b637b 100%);
      --glass-shadow:0 8px 32px 0 rgba(1, 2, 16, 0.569);
      --alert-info:#2196f3; --alert-warning:#f8a324; --alert-error:#e35b6b; --alert-critical:#ff5353;
    }
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Ubuntu,sans-serif;background:var(--bg);color:var(--txt);line-height:1.75}
    h1{font-size:clamp(1.2rem,4vw,1.5rem);font-weight:900;text-align:center;
       margin:6px 0;background:var(--grad);-webkit-background-clip:text;color:transparent}
    h3{font-size:clamp(1rem,3vw,0.9rem);color:var(--sub);text-align:center;text-transform:lowercase;font-weight:400;margin-bottom:16px}
    .wrap{max-width:430px;margin:auto;padding:clamp(10px,3vw,28px)}
    .grid{display:grid;gap:clamp(14px,2vw,24px)}
    .card{background:var(--pnl);backdrop-filter:blur(14px);border:1px solid var(--brd);
          border-radius:14px;padding:20px;box-shadow:var(--glass-shadow);
          transition:transform .25s ease}
    .card:hover{transform:translateY(-4px)}
    .card h2{font-size:1.05rem;margin-bottom:.9rem;text-transform:uppercase;color:var(--head2);font-weight:600}
    .metric{display:flex;justify-content:space-between;align-items:center;
            padding:6px 0;border-bottom:1px solid var(--brd);font-size:.83rem}
    .metric:last-child{border:none}
    .dot{width:10px;height:10px;border-radius:50%;display:inline-block;background:var(--sub)}
    .ok{background:var(--ok)}.warn{background:var(--warn)}.err{background:var(--err)}
    pre{font-family:monospace;font-size:.75rem;white-space:pre-wrap;
        max-height:200px;overflow:auto;margin-top:.6rem;padding:8px;
        background:var(--pnl);border:1px solid var(--brd);border-radius:10px}
    button{all:unset;cursor:pointer;padding:.5rem 1rem;background:var(--grad);
           border-radius:8px;font-weight:600;color:#000;display:inline-block;margin-top:.8rem}
    .section-title{margin:24px 0 12px;color:var(--sub);font-size:.9rem;letter-spacing:.5px;text-align:center}
    ul.generic-list { list-style:none; padding:0; margin:0; }
    .generic-list li { padding:6px 0; border-bottom:1px solid var(--brd); font-size:.85rem;
      display:flex; justify-content:space-between; align-items:center; white-space:nowrap; }
    .generic-list li:last-child { border:none; }
    .list-id { font-family:monospace; color:var(--txt); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%; }
    .list-time { color:var(--sub); font-size:.75rem; flex-shrink:0; }
    .status-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-top:10px; }
    .status-card { background:var(--pnl); border-radius:8px; padding:10px; border:1px solid var(--brd); text-align:center; }
    .telemetry-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; margin-top:10px; }
    .telemetry-card { background:var(--pnl); border-radius:8px; padding:12px; border:1px solid var(--brd); }
    .telemetry-card h4 { margin:0 0 8px 0; color:var(--head2); font-size:0.8rem; text-transform:uppercase; }
    .telemetry-metric { display:flex; justify-content:space-between; align-items:center; padding:4px 0; font-size:0.75rem; }
    .telemetry-value { font-weight:bold; color:var(--txt); }
    .telemetry-label { color:var(--sub); }
    .status-card h3 { margin-bottom:8px; color:var(--txt); font-size:.8rem; }
    .status-indicator { font-size:1rem; font-weight:bold; padding:6px; border-radius:4px; transition:all .3s ease; }
    .status-indicator.status-ok { background:var(--ok); color:#0cea4f; }
    .status-indicator.status-error { background:var(--err); color:#fff; }
    .status-indicator.status-unknown { background:var(--warn); color:#000; }
    .agent-section { background:var(--pnl); border-radius:8px; padding:15px; border:1px solid var(--brd); margin-bottom:15px; }
    .agent-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .agent-name { font-weight:bold; color:var(--ok); font-size:1rem; }
    .agent-status { padding:4px 8px; border-radius:4px; font-size:.75rem; font-weight:600; }
    .agent-status.healthy { background:var(--ok); color:#09e04a; }
    .agent-status.pending { background:var(--warn); color:#000; }
    .agent-status.stopped { background:var(--err); color:#fff; }
    .agent-metrics { display:grid; grid-template-columns:repeat(auto-fit,minmax(80px,1fr)); gap:8px; margin-bottom:10px; }
    .agent-metric { text-align:center; padding:6px; background:var(--bg); border-radius:4px; }
    .agent-metric-label { font-size:.7rem; color:var(--sub); margin-bottom:2px; }
    .agent-metric-value { font-size:1rem; font-weight:bold; color:var(--txt); }
    .loading { text-align:center; padding:20px; color:var(--sub); }
    .error-message { background:var(--err); color:#fff; padding:10px; border-radius:5px; margin:10px 0; }
    .agent-subsection { margin-top: 15px; }
    .agent-subsection h4 { color: var(--head1); font-weight: 400; font-size: 0.75rem; text-transform: uppercase; margin-bottom: 8px; }
    /* Modern Alert Styles */
    .alert-list { list-style:none; padding:0; margin:0; }
    .alert-item {
      display:flex; align-items:flex-start; gap:10px; margin-bottom:10px;
      background:rgba(44,46,63,0.82); border:1px solid var(--brd); border-radius:8px;
      box-shadow:0 2px 10px #1c243a1a; padding:9px 10px; font-size:0.92em;
      position:relative;
    }
    .alert-icon { font-size:1.15em; margin-right:6px; }
    .alert-content { flex:1; }
    .alert-title { font-family:monospace; font-size:.99em; color:var(--head2); font-weight:500; }
    .alert-message { color:var(--txt); font-size:.91em; }
    .alert-time { color:var(--sub2); font-size:.78em; margin-top:2px; }
    .alert-badge { border-radius:4px; padding:3px 9px; font-weight:600; font-size:.81em; text-align:center; margin-left:auto; }
    .alert-badge.info { color:var(--alert-info); background:#243e56a1; }
    .alert-badge.warning { color:var(--alert-warning); background:#3b2a1c65; }
    .alert-badge.error { color:var(--alert-error); background:#50213265; }
    .alert-badge.critical { color:#fff; background:var(--alert-critical); }
    .alert-section-title { color:var(--head1); font-size:.80em; font-weight:600; text-transform:uppercase; margin:16px 0 8px; }
    /* Responsive tweak */
    @media (max-width: 700px) { .wrap { max-width: 98vw; padding: 7vw 2vw; } .card { padding: 10px; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>***REMOVED*** RUNNER</h1>
    <h3>[ dual-agent dashboard ]</h3>
    <div style="text-align: center; font-size: 0.7rem; color: var(--sub); margin-bottom: 10px;">
      Updated: 2025-08-06 05:03:00 UTC |
      <button onclick="location.reload(true)" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 2px 6px; border-radius: 3px; font-size: 0.6rem;">🔄 Force Refresh</button>
    </div>

    <!-- Overall health -->
    <div class="metric" style="margin-bottom:2px">
      <span>Overall</span><span id="overallDot" class="dot sub"></span>
    </div>

    <!-- CYOPS / DEV -->
    <div class="section-title">CYOPS / DEV [ HEALTH + STATUS ]</div>
    <div class="grid" id="cyopsGrid"></div>

    <!-- MAIN / BRAUN -->
    <div class="section-title">MAIN / BRAUN [ HEALTH + STATUS ]</div>
    <div class="grid" id="mainGrid"></div>

    <!-- Shared Services -->
    <div class="section-title">***REMOVED*** | SYSTEMS | METRICS | STATUS</div>
    <div class="grid">
      <!-- Component Health -->
      <div class="card">
        <h2>⚙️ Component Health</h2>
        <div class="status-grid">
          <div class="status-card">
            <h3>Fly.io</h3>
            <div id="health-fly" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Webhook Tunnel</h3>
            <div id="health-tunnel-webhook" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Dashboard Tunnel</h3>
            <div id="health-tunnel-dashboard" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Flask</h3>
            <div id="health-flask" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>BRAUN DAEMON</h3>
            <div id="health-braun" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Ghost Runner</h3>
            <div id="health-ghost" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Patch Executor</h3>
            <div id="health-executor" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Dashboard Uplink</h3>
            <div id="health-uplink" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Summary Watcher</h3>
            <div id="health-watcher" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>Comprehensive Dashboard</h3>
            <div id="health-comprehensive" class="status-indicator">…</div>
          </div>
          <!-- Ghost 2.0 Advanced Capabilities -->
          <div class="status-card">
            <h3>🤖 Autonomous Decision</h3>
            <div id="health-autonomous-decision-daemon" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>📊 Telemetry Orchestrator</h3>
            <div id="health-telemetry-orchestrator-daemon" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>📈 Metrics Aggregator</h3>
            <div id="health-metrics-aggregator-daemon" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>🚨 Alert Engine</h3>
            <div id="health-alert-engine-daemon" class="status-indicator">…</div>
          </div>
          <div class="status-card">
            <h3>📝 Enhanced Doc Daemon</h3>
            <div id="health-enhanced-doc-daemon" class="status-indicator">…</div>
          </div>
        </div>
      </div>

      <!-- Unified Manager Status (Collapsible) -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleSection('unified-manager')">
          <h2>🔧 Unified Manager Status</h2>
          <span id="unified-manager-toggle" style="font-size: 1.2rem; transition: transform 0.3s ease;">▼</span>
        </div>
        <div id="unified-manager-content" style="display: none;">
          <div style="margin-bottom: 15px;">
            <button onclick="updateUnifiedManager()" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px;">🔄 Refresh</button>
            <button onclick="startAllServices()" style="background: var(--ok); border: 1px solid var(--brd); color: #000; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem; margin-right: 5px;">▶️ Start All</button>
            <button onclick="stopAllServices()" style="background: var(--err); border: 1px solid var(--brd); color: #fff; padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">⏹️ Stop All</button>
          </div>

          <!-- Service Orchestration Summary -->
          <div class="metric">
            <span>🔧 Manager Status</span>
            <span id="manager-status">Loading…</span>
          </div>
          <div class="metric">
            <span>📊 Total Services</span>
            <span id="total-services">Loading…</span>
          </div>
          <div class="metric">
            <span>✅ Healthy Services</span>
            <span id="healthy-services" style="color: #14936693;">Loading…</span>
          </div>
          <div class="metric">
            <span>❌ Unhealthy Services</span>
            <span id="unhealthy-services" style="color: #df131379;">Loading…</span>
          </div>

          <!-- Critical Services Status -->
          <div style="margin-top: 15px;">
            <div class="alert-section-title">🚨 Critical Services Status</div>
            <div id="critical-services-grid" class="status-grid"></div>
          </div>

          <!-- Service Actions -->
          <div style="margin-top: 15px;">
            <div class="alert-section-title">⚡ Quick Actions</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 8px;">
              <button onclick="serviceAction('MAIN-backend-api', 'start')" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem;">▶️ MAIN Backend</button>
              <button onclick="serviceAction('expo-dev', 'start')" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem;">▶️ Expo Dev</button>
              <button onclick="serviceAction('expo-web', 'start')" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem;">▶️ Expo Web</button>
              <button onclick="serviceAction('ngrok-tunnel', 'start')" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 4px 8px; border-radius: 4px; font-size: 0.7rem;">▶️ Ngrok</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Service Logs Section (Collapsible) -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="toggleSection('service-logs')">
          <h2>📋 Service Logs</h2>
          <span id="service-logs-toggle" style="font-size: 1.2rem; transition: transform 0.3s ease;">▼</span>
        </div>
        <div id="service-logs-content" style="display: none;">
          <div style="margin-bottom: 15px;">
            <button onclick="updateServiceLogs()" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">🔄 Refresh Logs</button>
          </div>
          <div id="service-logs-container" style="max-height: 400px; overflow-y: auto;">
            <div style="text-align: center; color: var(--sub); padding: 20px;">Loading service logs...</div>
          </div>
        </div>
      </div>

      <!-- Telemetry Dashboard -->
      <div class="card">
        <h2>📊 Telemetry Dashboard</h2>
        <div style="margin-bottom: 10px;">
          <button onclick="updateTelemetryDashboard()" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">🔄 Refresh Telemetry</button>
        </div>
        <div class="telemetry-grid" id="telemetry-dashboard">
          <!-- Telemetry cards will be populated here -->
        </div>
      </div>

      <!-- Alert Engine Dashboard (Modernized) -->
      <div class="card">
        <h2>🚨 Alert Engine Dashboard</h2>
        <div style="margin-bottom: 10px;">
          <button onclick="updateAlertDashboard()" style="background: var(--pnl); border: 1px solid var(--brd); color: var(--txt); padding: 5px 10px; border-radius: 4px; font-size: 0.8rem;">🔄 Refresh Alerts</button>
        </div>
        <div class="metric">
          <span>Active Alerts</span>
          <span id="active-alerts-count">Loading…</span>
        </div>
        <div class="metric">
          <span>Critical Alerts</span>
          <span id="critical-alerts-count">Loading…</span>
        </div>
        <div class="metric">
          <span>Alert Engine Status</span>
          <span id="alert-engine-status">Loading…</span>
        </div>
        <div style="margin-top: 15px;">
          <div class="alert-section-title">Active Alerts</div>
          <ul id="active-alerts-list" class="alert-list"></ul>
        </div>
        <div style="margin-top: 15px;">
          <div class="alert-section-title">Recent Alert History</div>
          <ul id="alert-history-list" class="alert-list"></ul>
        </div>
      </div>

      <!-- System Resources -->
      <div class="card">
        <h2>SYSTEM RESOURCES [ CPU, MEMORY, DISK, UPTIME ]</h2>
        <div class="metric">
          <span>Memory Usage</span>
          <span id="memory-usage">Loading…</span>
        </div>
        <div class="metric">
          <span>CPU Usage</span>
          <span id="cpu-usage">Loading…</span>
        </div>
        <div class="metric">
          <span>Disk Usage</span>
          <span id="disk-usage">Loading…</span>
        </div>
        <div class="metric">
          <span>Uptime</span>
          <span id="uptime">Loading…</span>
        </div>
      </div>
    </div>
  </div>

  <script>
    let data = {};
    let updateInterval;

    function concatenateFilename(filename, maxLength = 35) {
      if (!filename || filename.length <= maxLength) {
        return filename;
      }

      // Extract file extension
      const lastDotIndex = filename.lastIndexOf('.');
      if (lastDotIndex === -1) {
        // No extension, just truncate
        return `${filename.substring(0, maxLength - 3)}...`;
      }

      const name = filename.substring(0, lastDotIndex);
      const extension = filename.substring(lastDotIndex);

      // If name is already short enough, return as is
      if (name.length <= maxLength - 3) {
        return filename;
      }

      // Truncate name and add ellipsis
      const truncatedName = `${name.substring(0, maxLength - 6)}...`;
      return truncatedName + extension;
    }

    function formatTimestamp(timestamp) {
      if (!timestamp) return 'Never';
      const date = new Date(timestamp);
      return date.toLocaleString();
    }

    function formatUptime(seconds) {
      if (!seconds) return 'Unknown';
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }

    function updateOverallHealth() {
      const dot = document.getElementById('overallDot');
      if (!data.agent_status) return;

      const mainHealthy = data.agent_status.MAIN?.pending === 0;
      const cyopsHealthy = data.agent_status.CYOPS?.pending === 0;
      const allHealthy = mainHealthy && cyopsHealthy;

      dot.className = `dot ${allHealthy ? 'ok' : 'warn'}`;
    }

    function updateAgentGrid(agentName, agentData) {
      console.log(`[dashboard] Updating ${agentName} grid with data:`, agentData);
      const grid = document.getElementById(agentName.toLowerCase() + 'Grid');
      console.log(`[dashboard] Found grid element:`, grid);
      if (!grid || !agentData) {
        console.log(`[dashboard] Missing grid or data for ${agentName}`);
        return;
      }

      const statusClass = agentData.pending > 0 ? 'pending' : 'healthy';
      const statusText = agentData.pending > 0 ? `${agentData.pending} Pending` : 'Healthy';

      // Get agent-specific data
      const patches = data.patch_status?.[agentName] || {};
      const summaries = patches.summaries || [];
      const executions = patches.patches || [];
      const logs = data.recent_logs || [];

      console.log(`[dashboard] ${agentName} patch data:`, {
        pending: agentData.pending,
        completed: agentData.completed,
        summariesCount: summaries.length,
        executionsCount: executions.length,
        patchData: patches
      });

      grid.innerHTML = `
        <div class="card">
          <h2>${agentName} Agent</h2>
          <div class="metric">
            <span>Status</span>
            <span class="agent-status ${statusClass}">${statusText}</span>
          </div>
          <div class="metric">
            <span>Pending</span>
            <span>${agentData.pending}</span>
          </div>
          <div class="metric">
            <span>Completed</span>
            <span>${agentData.completed}</span>
          </div>
          <div class="metric">
            <span>Summary Monitor</span>
            <span>${agentData.processes?.['summary-monitor'] || 'Unknown'}</span>
          </div>
          <div class="metric">
            <span>Patch Executor</span>
            <span>${agentData.processes?.['patch-executor'] || 'Unknown'}</span>
          </div>

          <!-- Patch Delivery Section -->
          <div class="agent-subsection">
            <h4>🚚 Patch Delivery</h4>
            <ul class="generic-list">
              ${executions.length > 0 ? executions.slice(0, 3).map(exec => {
                const name = exec.name || 'Unknown';
                const concatenatedName = concatenateFilename(name, 35);
                return `<li>
                  <span class="list-id" title="${name}">${concatenatedName}</span>
                  <span class="list-time">${new Date(exec.timestamp || Date.now()).toLocaleTimeString()}</span>
                  <span class="dot ${exec.status === 'completed' ? 'ok' : exec.status === 'failed' ? 'err' : 'warn'}"></span>
                </li>`;
              }).join('') : `<li>${agentData.completed || 0} patches completed</li>`}
            </ul>
          </div>

          <!-- Execution History Section -->
          <div class="agent-subsection">
            <h4>🏃 Execution History</h4>
            <ul class="generic-list">
              ${executions.length > 0 ? executions.slice(0, 3).map(exec => {
                const name = exec.name || 'Unknown';
                const concatenatedName = concatenateFilename(name, 35);
                return `<li>
                  <span class="list-id" title="${name}">${concatenatedName}</span>
                  <span class="list-time">${new Date(exec.timestamp || Date.now()).toLocaleTimeString()}</span>
                  <span class="dot ${exec.status === 'completed' ? 'ok' : exec.status === 'failed' ? 'err' : 'warn'}"></span>
                </li>`;
              }).join('') : `<li>${agentData.completed || 0} executions completed</li>`}
            </ul>
          </div>

          <!-- Recent Summaries Section -->
          <div class="agent-subsection">
            <h4>📰 Recent Summaries</h4>
            <ul class="generic-list">
              ${summaries.slice(0, 3).map(summary => {
                const name = summary || 'Unknown';
                const concatenatedName = concatenateFilename(name, 35);
                return `<li>
                  <span class="list-id" title="${name}">${concatenatedName}</span>
                  <span class="list-time">${new Date().toLocaleTimeString()}</span>
                </li>`;
              }).join('') || '<li>No recent summaries</li>'}
            </ul>
          </div>

          <!-- Recent Logs Section -->
          <div class="agent-subsection">
            <h4>📝 Recent Logs</h4>
            <div style="font-size:.75rem;max-height:100px;overflow-y:auto;">
              ${logs.slice(0, 3).map(log => {
                return `<div style="margin:2px 0;color:var(--txt);">
                  <span style="color:var(--sub);">${new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span style="color:var(--ok);">${log.level || 'INFO'}</span>
                  <span>${(log.message || 'No message').substring(0, 50)}...</span>
                </div>`;
              }).join('') || '<div style="color:var(--sub);">No recent logs</div>'}
            </div>
          </div>
        </div>
      `;
    }

    function updateComponentHealth() {
      const health = data.process_health || {};
      const daemonStatus = data.daemon_status || {};
      const processHealth = health.daemons || {};
      const telemetryComponents = data.telemetry?.components?.components || {};

      console.log('[health] Debug - Data structure:', {
        hasProcessHealth: !!data.process_health,
        hasDaemonStatus: !!data.daemon_status,
        hasTelemetryComponents: !!data.telemetry?.components?.components,
        processHealthKeys: Object.keys(processHealth),
        daemonStatusKeys: Object.keys(daemonStatus),
        telemetryComponentKeys: Object.keys(telemetryComponents)
      });

      // Map frontend component IDs to telemetry component keys
      const components = [
        ['fly', 'Fly.io', 'fly'],
        ['tunnel-webhook', 'Webhook Tunnel', 'webhook-tunnel'],
        ['tunnel-dashboard', 'Dashboard Tunnel', 'dashboard-tunnel'],
        ['flask', 'Flask App', 'flask'],
        ['braun', 'BRAUN Daemon', 'braun-daemon'],
        ['ghost', 'Ghost Runner', 'ghost-runner'],
        ['executor', 'Patch Executor', 'patch-executor'],
        ['uplink', 'Dashboard Uplink', 'dashboard-uplink'],
        ['watcher', 'Summary Watcher', 'summary-watcher'],
        ['comprehensive', 'Comprehensive Dashboard', 'comprehensive-dashboard'],
        // Ghost 2.0 Advanced Capabilities
        ['autonomous-decision-daemon', 'Autonomous Decision Engine', 'autonomous-decision'],
        ['telemetry-orchestrator-daemon', 'Telemetry Orchestrator', 'telemetry-orchestrator'],
        ['metrics-aggregator-daemon', 'Metrics Aggregator', 'metrics-aggregator'],
        ['alert-engine-daemon', 'Alert Engine', 'alert-engine'],
        ['enhanced-doc-daemon', 'Enhanced Document Daemon', 'enhanced-doc-daemon']
      ];

      components.forEach(([key, label, telemetryKey]) => {
        const el = document.getElementById('health-' + key);
        if (!el) {
          console.warn(`[health] Element not found: health-${key}`);
          return;
        }

        // Check telemetry components first (this is the primary source)
        let status = 'unknown';
        let source = 'none';

        if (telemetryComponents[telemetryKey]) {
          const component = telemetryComponents[telemetryKey];
          status = component.status || component.health || 'unknown';
          source = 'telemetry_components';
          console.log(`[health] Found ${telemetryKey} in telemetry:`, component);
        }
        // Fallback to daemon_status
        else if (daemonStatus[telemetryKey]) {
          status = daemonStatus[telemetryKey];
          source = 'daemon_status';
        }
        // Fallback to process_health.daemons
        else if (processHealth[telemetryKey]) {
          status = processHealth[telemetryKey].status || processHealth[telemetryKey];
          source = 'process_health.daemons';
        }
        // Fallback to process_health
        else if (health[telemetryKey]) {
          status = health[telemetryKey].status || health[telemetryKey];
          source = 'process_health';
        }
        // Fallback to agent_status processes
        else if (data.agent_status) {
          if (data.agent_status.CYOPS?.processes?.[telemetryKey]) {
            status = data.agent_status.CYOPS.processes[telemetryKey];
            source = 'agent_status.CYOPS';
          } else if (data.agent_status.MAIN?.processes?.[telemetryKey]) {
            status = data.agent_status.MAIN.processes[telemetryKey];
            source = 'agent_status.MAIN';
          }
        }

        // Normalize status to lowercase for comparison
        status = (status || 'unknown').toLowerCase();

        const isHealthy = status === 'healthy' || status === 'running' || status === 'active' || status === 'ok' || status === 'online';
        const isError = status === 'stopped' || status === 'error' || status === 'failed';

        el.className = `status-indicator ${
          isHealthy ? 'status-ok' : isError ? 'status-error' : 'status-unknown'
        }`;
        el.textContent = isHealthy ? '✅' : isError ? '❌' : '⚠️';

        // Debug logging
        console.log(`[health] ${key} (${telemetryKey}): ${status} -> ${isHealthy ? '✅' : isError ? '❌' : '⚠️'} [source: ${source}]`);
      });
    }

    function updateTelemetryDashboard() {
      const telemetryContainer = document.getElementById('telemetry-dashboard');
      if (!telemetryContainer) {
        console.error('[telemetry] Container not found');
        return;
      }
      if (!data.telemetry) {
        console.error('[telemetry] No telemetry data available');
        telemetryContainer.innerHTML = `
          <div class="telemetry-card">
            <h4>📊 Telemetry Status</h4>
            <div class="telemetry-metric">
              <span class="telemetry-label">Status</span>
              <span class="telemetry-value">No Data Available</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Last Check</span>
              <span class="telemetry-value">${new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        `;
        return;
      }

      const telemetry = data.telemetry;
      console.log('[telemetry] Data received:', telemetry);

      // Create telemetry cards
      let telemetryHTML = '';

      // System Health Card
      if (telemetry.systemHealth) {
        const health = telemetry.systemHealth;
        telemetryHTML += `
          <div class="telemetry-card">
            <h4>🏥 System Health</h4>
            <div class="telemetry-metric">
              <span class="telemetry-label">Overall Status</span>
              <span class="telemetry-value">${health.overall || 'unknown'}</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Uptime</span>
              <span class="telemetry-value">${Math.round((health.uptime || 0) / 1000)}s</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Health Score</span>
              <span class="telemetry-value">${health.score || 0}%</span>
            </div>
          </div>
        `;
      }

      // Component Metrics Card
      if (telemetry.metrics?.metrics) {
        const metrics = telemetry.metrics.metrics;
        telemetryHTML += `
          <div class="telemetry-card">
            <h4>🔧 Component Metrics</h4>
            <div class="telemetry-metric">
              <span class="telemetry-label">Total Components</span>
              <span class="telemetry-value">${metrics.totalComponents}</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Healthy</span>
              <span class="telemetry-value" style="color: #14936693;">${metrics.healthyComponents}</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Degraded</span>
              <span class="telemetry-value" style="color: #f8a3249d;">${metrics.degradedComponents}</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Unhealthy</span>
              <span class="telemetry-value" style="color: #df131379;">${metrics.unhealthyComponents + metrics.criticalComponents}</span>
            </div>
          </div>
        `;
      }

      // Recent Events Card
      if (telemetry.recentEvents && telemetry.recentEvents.length > 0) {
        telemetryHTML += `
          <div class="telemetry-card">
            <h4>📋 Recent Events</h4>
            ${telemetry.recentEvents.slice(0, 5).map(event => `
              <div class="telemetry-metric">
                <span class="telemetry-label">${event.componentName || 'System'}</span>
                <span class="telemetry-value" style="color: ${event.severity === 'error' ? '#df131379' : event.severity === 'warning' ? '#f8a3249d' : '#14936693'};">${event.eventType}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // Component Status Card
      if (telemetry.components && telemetry.components.length > 0) {
        const healthyComps = telemetry.components.filter(c => c.health === 'healthy').length;
        const totalComps = telemetry.components.length;

        telemetryHTML += `
          <div class="telemetry-card">
            <h4>📊 Component Status</h4>
            <div class="telemetry-metric">
              <span class="telemetry-label">Health Ratio</span>
              <span class="telemetry-value">${healthyComps}/${totalComps}</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Last Update</span>
              <span class="telemetry-value">${new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        `;
      }

      // No Data Card
      if (!telemetryHTML) {
        telemetryHTML = `
          <div class="telemetry-card">
            <h4>📊 Telemetry Status</h4>
            <div class="telemetry-metric">
              <span class="telemetry-label">Status</span>
              <span class="telemetry-value">${telemetry.status || 'No Data'}</span>
            </div>
            <div class="telemetry-metric">
              <span class="telemetry-label">Message</span>
              <span class="telemetry-value">${telemetry.message || 'Telemetry not available'}</span>
            </div>
          </div>
        `;
      }

      // Add debug info
      telemetryHTML += `
        <div class="telemetry-card">
          <h4>🔍 Debug Info</h4>
          <div class="telemetry-metric">
            <span class="telemetry-label">Data Available</span>
            <span class="telemetry-value">${telemetry ? 'Yes' : 'No'}</span>
          </div>
          <div class="telemetry-metric">
            <span class="telemetry-label">Last Update</span>
            <span class="telemetry-value">${new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      `;

      telemetryContainer.innerHTML = telemetryHTML;
    }

    // --- ALERT DASHBOARD RENDERING ---
    function getSeverityClass(sev) {
      switch ((sev||'').toLowerCase()) {
        case "info": return "alert-badge info";
        case "warning": return "alert-badge warning";
        case "error": return "alert-badge error";
        case "critical": return "alert-badge critical";
        default: return "alert-badge";
      }
    }
    function getSeverityIcon(sev) {
      switch ((sev||'').toLowerCase()) {
        case "info": return "ℹ️";
        case "warning": return "⚠️";
        case "error": return "❌";
        case "critical": return "🔥";
        default: return "❔";
      }
    }
    function formatAlertTime(ts) {
      if (!ts) return '';
      let dt;
      if (typeof ts === 'number' || /^\\d+$/.test(ts)) dt = new Date(Number(ts));
      else dt = new Date(ts);
      return dt.toLocaleString();
    }
    function updateAlertDashboard() {
      const alertEngineStatusEl = document.getElementById('alert-engine-status');
      const activeAlertsCountEl = document.getElementById('active-alerts-count');
      const criticalAlertsCountEl = document.getElementById('critical-alerts-count');
      const activeAlertsListEl = document.getElementById('active-alerts-list');
      const alertHistoryListEl = document.getElementById('alert-history-list');

      const engine = (data.alert_engine_status) ? data.alert_engine_status : {};
      alertEngineStatusEl.textContent = engine.status || "Unknown";
      let actives = Array.isArray(engine.active) ? engine.active : [];
      let criticals = actives.filter(a => String(a.severity).toLowerCase() === "critical");
      let history = Array.isArray(engine.history) ? engine.history : [];
      activeAlertsCountEl.textContent = actives.length;
      criticalAlertsCountEl.textContent = criticals.length;
      // ACTIVE ALERTS
      if (actives.length === 0) {
        activeAlertsListEl.innerHTML = `<li style="color:var(--sub2);font-style:italic;">No active alerts</li>`;
      } else {
        activeAlertsListEl.innerHTML = actives.map(alert => `
          <li class="alert-item">
            <span class="alert-icon">${getSeverityIcon(alert.severity)}</span>
            <div class="alert-content">
              <div class="alert-title">${alert.title || alert.id || 'Untitled Alert'}</div>
              <div class="alert-message">${alert.message || '[no message]'}</div>
              <div class="alert-time">${formatAlertTime(alert.timestamp)}</div>
            </div>
            <span class="${getSeverityClass(alert.severity)}">${(String(alert.severity).charAt(0).toUpperCase() + String(alert.severity).slice(1))}</span>
          </li>
        `).join('');
      }
      // RECENT HISTORY
      if (history.length === 0) {
        alertHistoryListEl.innerHTML = `<li style="color:var(--sub2);font-style:italic;">No recent alert history</li>`;
      } else {
        alertHistoryListEl.innerHTML = history.slice(0,10).map(alert => `
          <li class="alert-item">
            <span class="alert-icon">${getSeverityIcon(alert.severity)}</span>
            <div class="alert-content">
              <div class="alert-title">${alert.title || alert.id || 'Untitled Alert'}</div>
              <div class="alert-message">${alert.message || '[no message]'}</div>
              <div class="alert-time">${formatAlertTime(alert.timestamp)}</div>
            </div>
            <span class="${getSeverityClass(alert.severity)}">${(String(alert.severity).charAt(0).toUpperCase() + String(alert.severity).slice(1))}</span>
          </li>
        `).join('');
      }
    }

    function updateSystemResources() {
      const monitor = data.unified_monitor;
      if (!monitor) return;

      document.getElementById('uptime').textContent = formatUptime(monitor.uptime);

      // Since resources data is not available, show system status instead
      const systems = monitor.systems;
      if (systems) {
        const activeSystems = Object.keys(systems).filter(key => systems[key].status === 'ACTIVE').length;
        const totalSystems = Object.keys(systems).length;

        document.getElementById('memory-usage').textContent = `${activeSystems}/${totalSystems} systems active`;
        document.getElementById('cpu-usage').textContent = `${monitor.processes?.total_ghost_processes || 0} processes`;
        document.getElementById('disk-usage').textContent = `${monitor.processes?.active_ports?.length || 0} ports active`;
      } else {
        document.getElementById('memory-usage').textContent = 'System data unavailable';
        document.getElementById('cpu-usage').textContent = 'System data unavailable';
        document.getElementById('disk-usage').textContent = 'System data unavailable';
      }
    }

    function updateDashboard() {
      console.log('[dashboard] Updating dashboard with data:', data);
      console.log('[dashboard] Agent status:', data.agent_status);
      console.log('[dashboard] Patch status:', data.patch_status);

      updateOverallHealth();
      // Combine agent status and patch status data for agent grids
      console.log('[DEBUG] Raw patch_status data:', data.patch_status);
      console.log('[DEBUG] Raw agent_status data:', data.agent_status);

      const cyopsData = {
        ...data.agent_status?.CYOPS,
        pending: data.patch_status?.CYOPS?.pending || 0,
        completed: data.patch_status?.CYOPS?.completed || 0
      };
      const mainData = {
        ...data.agent_status?.MAIN,
        pending: data.patch_status?.MAIN?.pending || 0,
        completed: data.patch_status?.MAIN?.completed || 0
      };

      console.log('[DEBUG] Combined cyopsData:', cyopsData);
      console.log('[DEBUG] Combined mainData:', mainData);

      updateAgentGrid('CYOPS', cyopsData);
      updateAgentGrid('MAIN', mainData);
      updateComponentHealth();
      updateTelemetryDashboard();
      updateAlertDashboard(); // Added this line
      updateSystemResources();
      updateUnifiedManager(); // Add unified manager update
    }

    // --- UNIFIED MANAGER FUNCTIONS ---

    function toggleSection(sectionId) {
      const content = document.getElementById(sectionId + '-content');
      const toggle = document.getElementById(sectionId + '-toggle');

      if (content.style.display === 'none') {
        content.style.display = 'block';
        toggle.style.transform = 'rotate(180deg)';
        toggle.textContent = '▲';
      } else {
        content.style.display = 'none';
        toggle.style.transform = 'rotate(0deg)';
        toggle.textContent = '▼';
      }
    }

    async function updateUnifiedManager() {
      try {
        const response = await fetch('/api/manager-status');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const managerData = await response.json();

        console.log('[unified-manager] Manager data received:', managerData);

        // Fix data mapping: API returns nested structure
        const cyopsStatus = managerData.manager_status?.CYOPS?.status || 'Unknown';
        const mainStatus = managerData.manager_status?.MAIN?.status || 'Unknown';
        const overallStatus = (cyopsStatus === 'healthy' && mainStatus === 'healthy') ? 'Healthy' : 'Mixed';

        // Update summary metrics with correct data paths
        document.getElementById('manager-status').textContent = overallStatus;
        document.getElementById('total-services').textContent = managerData.total_services || 0;
        document.getElementById('healthy-services').textContent = managerData.healthy_services || 0;
        document.getElementById('unhealthy-services').textContent = managerData.unhealthy_services || 0;

        // Update critical services grid using actual manager data
        const criticalServicesGrid = document.getElementById('critical-services-grid');
        if (criticalServicesGrid && managerData.manager_status) {
          let gridHTML = '';

          // Map critical services to actual manager data
          const criticalServices = [
            { name: 'MAIN Backend', key: 'ghost-relay', agent: 'MAIN' },
            { name: 'Expo Dev', key: 'expo-dev', agent: 'CYOPS' },
            { name: 'Expo Web', key: 'expo-web', agent: 'CYOPS' },
            { name: 'Ngrok', key: 'ngrok-tunnel', agent: 'CYOPS' }
          ];

          criticalServices.forEach(service => {
            const agentData = managerData.manager_status[service.agent];
            const manager = agentData?.managers?.[service.key];
            const isHealthy = manager?.status === 'online';
            const statusIcon = isHealthy ? '✅' : '❌';
            const statusColor = isHealthy ? 'color: #14936693;' : 'color: #df131379;';

            gridHTML += `
              <div class="status-card">
                <h3>${service.name}</h3>
                <div class="status-indicator ${isHealthy ? 'status-ok' : 'status-error'}" style="${statusColor}">
                  ${statusIcon}
                </div>
                <div style="margin-top: 5px; font-size: 0.6rem;">
                  <span style="color: var(--sub);">${service.agent}</span>
                </div>
              </div>
            `;
          });

          criticalServicesGrid.innerHTML = gridHTML;
        }

      } catch (error) {
        console.error('[unified-manager] Failed to update:', error);
        document.getElementById('manager-status').textContent = 'Error';
      }
    }

    async function serviceAction(serviceName, action) {
      try {
        const response = await fetch('/api/service-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: serviceName, action: action })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        console.log(`[service-action] ${action} ${serviceName}:`, result);

        // Refresh unified manager after action
        setTimeout(updateUnifiedManager, 1000);

      } catch (error) {
        console.error(`[service-action] Failed to ${action} ${serviceName}:`, error);
      }
    }

    async function startAllServices() {
      try {
        const response = await fetch('/api/service-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: 'all', action: 'start' })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        console.log('[service-action] Start all services:', result);

        // Refresh unified manager after action
        setTimeout(updateUnifiedManager, 2000);

      } catch (error) {
        console.error('[service-action] Failed to start all services:', error);
      }
    }

    async function stopAllServices() {
      try {
        const response = await fetch('/api/service-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: 'all', action: 'stop' })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();
        console.log('[service-action] Stop all services:', result);

        // Refresh unified manager after action
        setTimeout(updateUnifiedManager, 2000);

      } catch (error) {
        console.error('[service-action] Failed to stop all services:', error);
      }
    }

    async function updateServiceLogs() {
      try {
        const response = await fetch('/api/service-logs');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const logsData = await response.json();
        const container = document.getElementById('service-logs-container');

        if (!logsData.logs || Object.keys(logsData.logs).length === 0) {
          container.innerHTML = '<div style="text-align: center; color: var(--sub); padding: 20px;">No service logs available</div>';
          return;
        }

        let logsHTML = '';
        Object.entries(logsData.logs).forEach(([serviceName, logContent]) => {
          logsHTML += `
            <div style="margin-bottom: 15px; background: var(--pnl); border: 1px solid var(--brd); border-radius: 8px; padding: 10px;">
              <h4 style="color: var(--head2); font-size: 0.8rem; margin-bottom: 8px; text-transform: uppercase;">${serviceName}</h4>
              <pre style="font-size: 0.7rem; max-height: 150px; overflow-y: auto; margin: 0; padding: 8px; background: var(--bg); border-radius: 4px; border: 1px solid var(--brd);">${logContent || 'No logs available'}</pre>
            </div>
          `;
        });

        container.innerHTML = logsHTML;

      } catch (error) {
        console.error('[service-logs] Failed to update:', error);
        document.getElementById('service-logs-container').innerHTML =
          '<div style="text-align: center; color: var(--err); padding: 20px;">Failed to load service logs</div>';
      }
    }

    async function fetchData() {
      try {
        console.log('[dashboard] Fetching data...');

        const response = await fetch('/api/status');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        data = await response.json();

        // Use telemetry alerts data if available
        if (data.telemetry?.alerts?.alerts) {
          data.alert_engine_status = data.telemetry.alerts.alerts;
        } else {
          data.alert_engine_status = null;
        }

        updateDashboard();

      } catch (error) {
        console.error('[dashboard] Failed to fetch data:', error);
        document.getElementById('overallDot').className = 'dot err';
      }
    }

    // Initial load
    fetchData();

    // Auto-expand unified manager section on first load
    setTimeout(() => {
      toggleSection('unified-manager');
    }, 1000);

    // Poll every 30 seconds
    updateInterval = setInterval(fetchData, 30000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    });
  </script>
</body>
</html>
"""
