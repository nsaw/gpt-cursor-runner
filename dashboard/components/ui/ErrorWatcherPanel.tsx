import React, { useState, useEffect, useCallback } from "react";
import { useDaemonHealth, useOrchestratorHealth } from "../hooks";
import "./ErrorWatcherPanel.css";

export interface ErrorWatcherPanelProps {
  className?: string;
  refreshInterval?: number;
  maxAlerts?: number;
  showRestartCounters?: boolean;
  autoDismissAlerts?: boolean;
  alertTimeout?: number;
}

export interface Alert {
  id: string;
  type: "error" | "warning" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  daemon?: string;
  dismissible?: boolean;
}

export interface RestartCounter {
  daemon: string;
  count: number;
  lastRestart: string;
  reason?: string;
}

export const ErrorWatcherPanel: React.FC<ErrorWatcherPanelProps> = ({
  className = "",
  refreshInterval = 5000,
  maxAlerts = 10,
  showRestartCounters = true,
  autoDismissAlerts = true,
  alertTimeout = 30000,
}) => {
  const { data: daemonData } = useDaemonHealth({
    pollingInterval: refreshInterval,
  });
  const { data: orchestratorData, error: orchestratorError } =
    useOrchestratorHealth({ pollingInterval: refreshInterval });

  const daemons = daemonData?.daemons || [];
  const orchestratorStatus = orchestratorData;

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [restartCounters, setRestartCounters] = useState<RestartCounter[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate alerts based on daemon and orchestrator status
  useEffect(() => {
    const newAlerts: Alert[] = [];

    // Check for daemon errors
    daemons.forEach((daemon) => {
      if (daemon.error) {
        newAlerts.push({
          id: `daemon-${daemon.name}-${Date.now()}`,
          type: "error",
          title: `Daemon Error: ${daemon.name}`,
          message: daemon.error,
          timestamp: new Date().toISOString(),
          daemon: daemon.name,
          dismissible: true,
        });
      }
    });

    // Check for orchestrator errors
    if (orchestratorError) {
      newAlerts.push({
        id: `orchestrator-${Date.now()}`,
        type: "error",
        title: "Orchestrator Error",
        message: orchestratorError.message,
        timestamp: new Date().toISOString(),
        dismissible: true,
      });
    }

    // Check for system-wide issues
    const failedDaemons = daemons.filter((d) => !d.running);
    if (failedDaemons.length > 0) {
      newAlerts.push({
        id: `system-failed-${Date.now()}`,
        type: "warning",
        title: "System Health Warning",
        message: `${failedDaemons.length} daemon(s) are not running`,
        timestamp: new Date().toISOString(),
        dismissible: false,
      });
    }

    // Add new alerts to the list
    setAlerts((prev) => {
      const combined = [...newAlerts, ...prev];
      return combined.slice(0, maxAlerts);
    });
  }, [daemons, orchestratorError, maxAlerts]);

  // Auto-dismiss alerts after timeout
  useEffect(() => {
    if (!autoDismissAlerts) return;

    const timer = setTimeout(() => {
      setAlerts((prev) =>
        prev.filter(
          (alert) =>
            Date.now() - new Date(alert.timestamp).getTime() < alertTimeout,
        ),
      );
    }, alertTimeout);

    return () => clearTimeout(timer);
  }, [alerts, autoDismissAlerts, alertTimeout]);

  // Track restart counters
  useEffect(() => {
    const counters: RestartCounter[] = [];

    // This would typically come from the watchdog logs
    // For now, we'll simulate based on daemon status changes
    daemons.forEach((daemon) => {
      if (daemon.error && daemon.error.includes("restart")) {
        const existing = counters.find((c) => c.daemon === daemon.name);
        if (existing) {
          existing.count++;
          existing.lastRestart = new Date().toISOString();
          existing.reason = daemon.error;
        } else {
          counters.push({
            daemon: daemon.name,
            count: 1,
            lastRestart: new Date().toISOString(),
            reason: daemon.error,
          });
        }
      }
    });

    setRestartCounters(counters);
  }, [daemons]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
        return "ℹ️";
      case "success":
        return "✅";
      default:
        return "📝";
    }
  };

  const getAlertClass = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return "alert-error";
      case "warning":
        return "alert-warning";
      case "info":
        return "alert-info";
      case "success":
        return "alert-success";
      default:
        return "alert-default";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString();
    } catch {
      return timestamp;
    }
  };

  const hasActiveAlerts = alerts.length > 0;
  const hasRestartCounters = restartCounters.length > 0;

  return (
    <div className={`error-watcher-panel ${className}`}>
      {/* Header */}
      <div className="panel-header">
        <div className="header-left">
          <h3>Error Watcher</h3>
          {hasActiveAlerts && (
            <span className="alert-badge">{alerts.length}</span>
          )}
        </div>
        <div className="header-right">
          <button
            className="expand-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? "−" : "+"}
          </button>
          {hasActiveAlerts && (
            <button
              className="clear-button"
              onClick={clearAllAlerts}
              title="Clear all alerts"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Alerts Section */}
      {hasActiveAlerts && (
        <div className="alerts-section">
          <h4>Active Alerts</h4>
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-item ${getAlertClass(alert.type)}`}
              >
                <div className="alert-icon">{getAlertIcon(alert.type)}</div>
                <div className="alert-content">
                  <div className="alert-title">{alert.title}</div>
                  <div className="alert-message">{alert.message}</div>
                  <div className="alert-meta">
                    <span className="alert-time">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                    {alert.daemon && (
                      <span className="alert-daemon">{alert.daemon}</span>
                    )}
                  </div>
                </div>
                {alert.dismissible && (
                  <button
                    className="dismiss-button"
                    onClick={() => dismissAlert(alert.id)}
                    title="Dismiss alert"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restart Counters Section */}
      {showRestartCounters && hasRestartCounters && (
        <div className="restart-counters-section">
          <h4>Restart Counters</h4>
          <div className="counters-list">
            {restartCounters.map((counter) => (
              <div key={counter.daemon} className="counter-item">
                <div className="counter-header">
                  <span className="counter-daemon">{counter.daemon}</span>
                  <span className="counter-count">
                    {counter.count} restarts
                  </span>
                </div>
                <div className="counter-details">
                  <span className="counter-time">
                    Last: {formatTimestamp(counter.lastRestart)}
                  </span>
                  {counter.reason && (
                    <span className="counter-reason">{counter.reason}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts State */}
      {!hasActiveAlerts && !hasRestartCounters && (
        <div className="no-alerts">
          <div className="no-alerts-icon">✅</div>
          <div className="no-alerts-message">
            No active alerts or restart counters
          </div>
          <div className="no-alerts-subtitle">
            All systems are running normally
          </div>
        </div>
      )}

      {/* Expanded Details */}
      {isExpanded && (
        <div className="expanded-details">
          <div className="detail-section">
            <h5>System Status</h5>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Total Daemons:</span>
                <span className="status-value">{daemons.length}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Running:</span>
                <span className="status-value success">
                  {daemons.filter((d) => d.running).length}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Failed:</span>
                <span className="status-value error">
                  {daemons.filter((d) => !d.running).length}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Orchestrator:</span>
                <span
                  className={`status-value ${orchestratorStatus?.overallHealth === "healthy" ? "success" : "error"}`}
                >
                  {orchestratorStatus?.overallHealth === "healthy"
                    ? "Healthy"
                    : "Unhealthy"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
