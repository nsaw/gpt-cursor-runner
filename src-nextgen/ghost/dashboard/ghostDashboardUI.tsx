// GHOST Dashboard UI — Phase 8A P8.05.00
// React-based dashboard SPA for comprehensive system monitoring

import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import "./ghostDashboardUI.css";

interface DashboardData {
  daemonHealth: DaemonHealth[];
  gptRelayTraces: GptRelayTrace[];
  patchQueueStatus: PatchQueueStatus;
  heartbeatStatus: HeartbeatStatus;
  anomalies: AnomalyReport[];
  systemMetrics: SystemMetrics;
  overallHealth: "excellent" | "good" | "degraded" | "critical";
  lastUpdate: string;
}

interface DaemonHealth {
  id: string;
  name: string;
  status: "running" | "failed" | "restarted" | "paused" | "unknown";
  uptime: number;
  restartCount: number;
  pid?: number;
  memoryUsage: number;
  cpuUsage: number;
  lastCheck: string;
  error?: string;
}

interface GptRelayTrace {
  id: string;
  timestamp: string;
  command: string;
  responseTime: number;
  success: boolean;
  sanitized: boolean;
  rateLimited: boolean;
  error?: string;
  handlerId: string;
  correlationId?: string;
}

interface PatchQueueStatus {
  pending: number;
  executing: number;
  completed: number;
  failed: number;
  totalProcessed: number;
  averageProcessingTime: number;
  lastUpdate: string;
}

interface HeartbeatStatus {
  systemTime: string;
  clockDrift: number;
  lastHeartbeat: string;
  daemonCount: number;
  healthyDaemons: number;
  systemUptime: number;
}

interface AnomalyReport {
  id: string;
  timestamp: string;
  type: "error" | "warning" | "info";
  component: string;
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  resolved: boolean;
  resolutionTime?: number;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    load: number;
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    usage: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connections: number;
  };
}

const GhostDashboardUI: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/state");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchDashboardData();
        setLastRefresh(new Date());
      }, refreshInterval);

      return () => clearInterval(interval);
    }

    return undefined;
  }, [fetchDashboardData, autoRefresh, refreshInterval]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case "running":
        return "#10B981";
      case "failed":
        return "#EF4444";
      case "restarted":
        return "#F59E0B";
      case "paused":
        return "#6B7280";
      default:
        return "#9CA3AF";
    }
  };

  const getOverallHealthColor = (health: string) => {
    switch (health) {
      case "excellent":
        return "#10B981";
      case "good":
        return "#3B82F6";
      case "degraded":
        return "#F59E0B";
      case "critical":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const formatBytes = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button onClick={fetchDashboardData}>Retry</button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="dashboard-error">
        <h2>No Dashboard Data</h2>
        <p>Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="ghost-dashboard">
      <header className="dashboard-header">
        <h1>GHOST 2.0 System Dashboard</h1>
        <div className="dashboard-controls">
          <div className="refresh-info">
            <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            <button onClick={fetchDashboardData}>Refresh</button>
          </div>
          <div className="auto-refresh">
            <label>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) =>
                  setAutoRefresh((e.target as HTMLInputElement).checked)
                }
              />
              Auto Refresh
            </label>
            <select
              value={refreshInterval}
              onChange={(e) =>
                setRefreshInterval(
                  Number((e.target as HTMLSelectElement).value),
                )
              }
            >
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={30000}>30s</option>
              <option value={60000}>1m</option>
            </select>
          </div>
        </div>
        <div className="overall-health">
          <span
            className="health-indicator"
            style={{
              backgroundColor: getOverallHealthColor(
                dashboardData.overallHealth,
              ),
            }}
          ></span>
          <span className="health-text">
            {dashboardData.overallHealth.toUpperCase()}
          </span>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="dashboard-grid">
          {/* Daemon Health Grid */}
          <section className="dashboard-panel daemon-health">
            <h2>🟢 Daemon Health Grid</h2>
            <div className="daemon-grid">
              {dashboardData.daemonHealth.map((daemon) => (
                <div key={daemon.id} className="daemon-card">
                  <div className="daemon-header">
                    <h3>{daemon.name}</h3>
                    <span
                      className="status-indicator"
                      style={{ backgroundColor: getHealthColor(daemon.status) }}
                    ></span>
                  </div>
                  <div className="daemon-details">
                    <p>
                      <strong>Status:</strong> {daemon.status}
                    </p>
                    <p>
                      <strong>Uptime:</strong> {formatUptime(daemon.uptime)}
                    </p>
                    <p>
                      <strong>PID:</strong> {daemon.pid || "N/A"}
                    </p>
                    <p>
                      <strong>Memory:</strong> {daemon.memoryUsage.toFixed(1)}%
                    </p>
                    <p>
                      <strong>CPU:</strong> {daemon.cpuUsage.toFixed(1)}%
                    </p>
                    {daemon.error && (
                      <p className="error">
                        <strong>Error:</strong> {daemon.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* GPT Relay Trace Log */}
          <section className="dashboard-panel gpt-relay-trace">
            <h2>📬 GPT Relay Trace Log</h2>
            <div className="trace-log">
              {dashboardData.gptRelayTraces.slice(-10).map((trace) => (
                <div
                  key={trace.id}
                  className={`trace-entry ${trace.success ? "success" : "error"}`}
                >
                  <div className="trace-header">
                    <span className="timestamp">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`status ${trace.success ? "success" : "error"}`}
                    >
                      {trace.success ? "✓" : "✗"}
                    </span>
                  </div>
                  <div className="trace-details">
                    <p>
                      <strong>Command:</strong> {trace.command}
                    </p>
                    <p>
                      <strong>Response Time:</strong> {trace.responseTime}ms
                    </p>
                    <p>
                      <strong>Handler:</strong> {trace.handlerId}
                    </p>
                    {trace.sanitized && (
                      <span className="badge sanitized">Sanitized</span>
                    )}
                    {trace.rateLimited && (
                      <span className="badge rate-limited">Rate Limited</span>
                    )}
                    {trace.error && (
                      <p className="error">
                        <strong>Error:</strong> {trace.error}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Patch Delivery Queue */}
          <section className="dashboard-panel patch-queue">
            <h2>📦 Patch Delivery Queue</h2>
            <div className="queue-status">
              <div className="queue-metrics">
                <div className="metric">
                  <span className="metric-value pending">
                    {dashboardData.patchQueueStatus.pending}
                  </span>
                  <span className="metric-label">Pending</span>
                </div>
                <div className="metric">
                  <span className="metric-value executing">
                    {dashboardData.patchQueueStatus.executing}
                  </span>
                  <span className="metric-label">Executing</span>
                </div>
                <div className="metric">
                  <span className="metric-value completed">
                    {dashboardData.patchQueueStatus.completed}
                  </span>
                  <span className="metric-label">Completed</span>
                </div>
                <div className="metric">
                  <span className="metric-value failed">
                    {dashboardData.patchQueueStatus.failed}
                  </span>
                  <span className="metric-label">Failed</span>
                </div>
              </div>
              <div className="queue-details">
                <p>
                  <strong>Total Processed:</strong>{" "}
                  {dashboardData.patchQueueStatus.totalProcessed}
                </p>
                <p>
                  <strong>Average Processing Time:</strong>{" "}
                  {dashboardData.patchQueueStatus.averageProcessingTime.toFixed(
                    2,
                  )}
                  ms
                </p>
                <p>
                  <strong>Last Update:</strong>{" "}
                  {new Date(
                    dashboardData.patchQueueStatus.lastUpdate,
                  ).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </section>

          {/* Heartbeat & System Time Sync */}
          <section className="dashboard-panel heartbeat-status">
            <h2>🫀 Heartbeat & System Time Sync</h2>
            <div className="heartbeat-info">
              <div className="heartbeat-metrics">
                <div className="metric">
                  <span className="metric-value">
                    {dashboardData.heartbeatStatus.daemonCount}
                  </span>
                  <span className="metric-label">Total Daemons</span>
                </div>
                <div className="metric">
                  <span className="metric-value healthy">
                    {dashboardData.heartbeatStatus.healthyDaemons}
                  </span>
                  <span className="metric-label">Healthy</span>
                </div>
                <div className="metric">
                  <span className="metric-value">
                    {Math.abs(dashboardData.heartbeatStatus.clockDrift)}s
                  </span>
                  <span className="metric-label">Clock Drift</span>
                </div>
              </div>
              <div className="heartbeat-details">
                <p>
                  <strong>System Time:</strong>{" "}
                  {new Date(
                    dashboardData.heartbeatStatus.systemTime,
                  ).toLocaleString()}
                </p>
                <p>
                  <strong>Last Heartbeat:</strong>{" "}
                  {new Date(
                    dashboardData.heartbeatStatus.lastHeartbeat,
                  ).toLocaleTimeString()}
                </p>
                <p>
                  <strong>System Uptime:</strong>{" "}
                  {formatUptime(dashboardData.heartbeatStatus.systemUptime)}
                </p>
              </div>
            </div>
          </section>

          {/* System Performance Metrics */}
          <section className="dashboard-panel system-metrics">
            <h2>📈 System Performance Metrics</h2>
            <div className="metrics-grid">
              <div className="metric-card">
                <h3>CPU</h3>
                <div className="metric-value">
                  {dashboardData.systemMetrics.cpu.usage.toFixed(1)}%
                </div>
                <div className="metric-details">
                  <p>Load: {dashboardData.systemMetrics.cpu.load.toFixed(2)}</p>
                  <p>Cores: {dashboardData.systemMetrics.cpu.cores}</p>
                </div>
              </div>
              <div className="metric-card">
                <h3>Memory</h3>
                <div className="metric-value">
                  {dashboardData.systemMetrics.memory.usage.toFixed(1)}%
                </div>
                <div className="metric-details">
                  <p>
                    Used: {formatBytes(dashboardData.systemMetrics.memory.used)}
                  </p>
                  <p>
                    Available:{" "}
                    {formatBytes(dashboardData.systemMetrics.memory.available)}
                  </p>
                </div>
              </div>
              <div className="metric-card">
                <h3>Disk</h3>
                <div className="metric-value">
                  {dashboardData.systemMetrics.disk.usage.toFixed(1)}%
                </div>
                <div className="metric-details">
                  <p>
                    Used: {formatBytes(dashboardData.systemMetrics.disk.used)}
                  </p>
                  <p>
                    Available:{" "}
                    {formatBytes(dashboardData.systemMetrics.disk.available)}
                  </p>
                </div>
              </div>
              <div className="metric-card">
                <h3>Network</h3>
                <div className="metric-value">
                  {dashboardData.systemMetrics.network.connections}
                </div>
                <div className="metric-details">
                  <p>
                    In:{" "}
                    {formatBytes(dashboardData.systemMetrics.network.bytesIn)}
                  </p>
                  <p>
                    Out:{" "}
                    {formatBytes(dashboardData.systemMetrics.network.bytesOut)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Feedback & Anomaly Feed */}
          <section className="dashboard-panel anomaly-feed">
            <h2>🚨 Feedback & Anomaly Feed</h2>
            <div className="anomaly-list">
              {dashboardData.anomalies.slice(-10).map((anomaly) => (
                <div
                  key={anomaly.id}
                  className={`anomaly-entry ${anomaly.severity}`}
                >
                  <div className="anomaly-header">
                    <span className="timestamp">
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`severity-badge ${anomaly.severity}`}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <div className="anomaly-content">
                    <p>
                      <strong>Component:</strong> {anomaly.component}
                    </p>
                    <p>
                      <strong>Message:</strong> {anomaly.message}
                    </p>
                    <p>
                      <strong>Type:</strong> {anomaly.type}
                    </p>
                    <p>
                      <strong>Resolved:</strong>{" "}
                      {anomaly.resolved ? "Yes" : "No"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

// Mount the dashboard to the DOM
const mountDashboard = () => {
  const container = document.getElementById("ghost-dashboard-root");
  if (container) {
    const root = createRoot(container);
    root.render(<GhostDashboardUI />);
  } else {
    console.error("Dashboard container not found");
  }
};

// Auto-mount when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountDashboard);
} else {
  mountDashboard();
}

export default GhostDashboardUI;
