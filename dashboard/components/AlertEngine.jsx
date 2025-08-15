import React, { useState, useEffect } from "react";
import "./alerts.css";

const AlertEngine = () => {
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedAlerts, setExpandedAlerts] = useState(new Set());

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/telemetry/alerts");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data.status === "success" && data.alerts) {
        setAlerts(data.alerts);
      } else {
        setAlerts([]);
      }
      setError(null);
    } catch (err) {
      setError(`Failed to fetch alerts: ${err.message}`);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "🔴";
      case "error":
        return "🟠";
      case "warning":
        return "🟡";
      case "info":
        return "🔵";
      case "success":
        return "🟢";
      default:
        return "⚪";
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case "critical":
        return "alert-critical";
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

  const toggleAlertExpansion = (alertId) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const renderAlertContent = (alert) => {
    const isExpanded = expandedAlerts.has(alert.id);

    return (
      <div
        key={alert.id}
        className={`alert-item ${getSeverityClass(alert.severity)} ${isExpanded ? "expanded" : ""}`}
      >
        <div
          className="alert-header"
          onClick={() => toggleAlertExpansion(alert.id)}
        >
          <div className="alert-icon">{getSeverityIcon(alert.severity)}</div>
          <div className="alert-title">
            <span className="alert-severity">
              {alert.severity || "Unknown"}
            </span>
            <span className="alert-message">
              {alert.message || alert.title || "No message provided"}
            </span>
          </div>
          <div className="alert-meta">
            <span className="alert-timestamp">
              {formatTimestamp(alert.timestamp)}
            </span>
            <span className="alert-toggle">{isExpanded ? "▼" : "▶"}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="alert-details">
            {alert.description && (
              <div className="alert-description">
                <strong>Description:</strong> {alert.description}
              </div>
            )}
            {alert.component && (
              <div className="alert-component">
                <strong>Component:</strong> {alert.component}
              </div>
            )}
            {alert.source && (
              <div className="alert-source">
                <strong>Source:</strong> {alert.source}
              </div>
            )}
            {alert.metadata && typeof alert.metadata === "object" && (
              <div className="alert-metadata">
                <strong>Details:</strong>
                <pre className="metadata-json">
                  {JSON.stringify(alert.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAlertHistory = () => {
    const recentAlerts = alerts.slice(0, 10); // Show last 10 alerts

    if (recentAlerts.length === 0) {
      return (
        <div className="no-alerts">
          <span className="no-alerts-icon">✅</span>
          <span className="no-alerts-text">No active alerts</span>
        </div>
      );
    }

    return (
      <div className="alert-history">
        <div className="alert-history-header">
          <h3>Recent Alerts ({recentAlerts.length})</h3>
          <button
            className="refresh-button"
            onClick={fetchAlerts}
            disabled={isLoading}
          >
            {isLoading ? "🔄" : "🔄"} Refresh
          </button>
        </div>
        <div className="alert-list">{recentAlerts.map(renderAlertContent)}</div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="alert-engine error">
        <div className="error-message">
          <span className="error-icon">❌</span>
          <span className="error-text">{error}</span>
          <button className="retry-button" onClick={fetchAlerts}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="alert-engine">
      <div className="alert-engine-header">
        <h2>Alert Engine</h2>
        <div className="alert-stats">
          <span className="stat-item">
            <span className="stat-label">Total:</span>
            <span className="stat-value">{alerts.length}</span>
          </span>
          <span className="stat-item">
            <span className="stat-label">Critical:</span>
            <span className="stat-value critical">
              {
                alerts.filter((a) => a.severity?.toLowerCase() === "critical")
                  .length
              }
            </span>
          </span>
          <span className="stat-item">
            <span className="stat-label">Errors:</span>
            <span className="stat-value error">
              {
                alerts.filter((a) => a.severity?.toLowerCase() === "error")
                  .length
              }
            </span>
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading">
          <span className="loading-spinner">🔄</span>
          <span className="loading-text">Loading alerts...</span>
        </div>
      ) : (
        renderAlertHistory()
      )}
    </div>
  );
};

export default AlertEngine;
