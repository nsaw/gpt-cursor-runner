import React from "react";
import { useSystemHealth, useDaemonStats } from "../hooks";
import "./SystemHealthPanel.css";

interface SystemHealthPanelProps {
  className?: string;
  showMetrics?: boolean;
  refreshInterval?: number;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({
  className = "",
  showMetrics = true,
  refreshInterval = 5000,
}) => {
  const { health, loading, error } = useSystemHealth({
    pollingInterval: refreshInterval,
  });
  const { stats } = useDaemonStats({ pollingInterval: refreshInterval });

  const getHealthColor = (health: string) => {
    switch (health) {
      case "healthy":
        return "#10B981";
      case "warning":
        return "#F59E0B";
      case "critical":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case "healthy":
        return "🟢";
      case "warning":
        return "🟡";
      case "critical":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const getHealthPercentage = () => {
    if (!stats) return 0;
    if (stats.total === 0) return 0;
    return Math.round((stats.running / stats.total) * 100);
  };

  if (loading) {
    return (
      <div className={`system-health-panel loading ${className}`}>
        <div className="panel-header">
          <h3>System Health</h3>
        </div>
        <div className="loading-message">Loading system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`system-health-panel error ${className}`}>
        <div className="panel-header">
          <h3>System Health</h3>
          <span className="error-indicator">❌</span>
        </div>
        <div className="error-message">
          Failed to load system health: {error.message}
        </div>
      </div>
    );
  }

  if (!health || !stats) {
    return (
      <div className={`system-health-panel error ${className}`}>
        <div className="panel-header">
          <h3>System Health</h3>
        </div>
        <div className="error-message">No system health data available</div>
      </div>
    );
  }

  return (
    <div className={`system-health-panel ${className}`}>
      <div className="panel-header">
        <h3>System Health</h3>
        <div className="health-indicator">
          <span className="health-icon">{getHealthIcon(health)}</span>
          <span
            className="health-text"
            style={{ color: getHealthColor(health) }}
          >
            {health.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="health-overview">
        <div className="health-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${getHealthPercentage()}%`,
                backgroundColor: getHealthColor(health),
              }}
            />
          </div>
          <div className="progress-text">
            {stats.running} of {stats.total} daemons running (
            {getHealthPercentage()}%)
          </div>
        </div>

        {showMetrics && (
          <div className="health-metrics">
            <div className="metric-grid">
              <div className="metric-item healthy">
                <span className="metric-icon">🟢</span>
                <span className="metric-label">Running</span>
                <span className="metric-value">{stats.running}</span>
              </div>
              <div className="metric-item critical">
                <span className="metric-icon">🔴</span>
                <span className="metric-label">Failed</span>
                <span className="metric-value">{stats.failed}</span>
              </div>
              <div className="metric-item total">
                <span className="metric-icon">📊</span>
                <span className="metric-label">Total</span>
                <span className="metric-value">{stats.total}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="system-status">
        <div className="status-item">
          <span className="status-label">Overall Status:</span>
          <span
            className="status-value"
            style={{ color: getHealthColor(health) }}
          >
            {health.toUpperCase()}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Active Daemons:</span>
          <span className="status-value">{stats.running}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Total Daemons:</span>
          <span className="status-value">{stats.total}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Health Score:</span>
          <span className="status-value">{getHealthPercentage()}%</span>
        </div>
      </div>

      <div className="panel-footer">
        <span className="refresh-info">
          Auto-refreshing every {refreshInterval / 1000}s
        </span>
      </div>
    </div>
  );
};

export default SystemHealthPanel;
