import React from 'react';
import { useDaemonHealth, useLogStream } from '../hooks';
import './DaemonStatusPanel.css';

interface DaemonStatusPanelProps {
  className?: string;
  showLogs?: boolean;
  refreshInterval?: number;
}

export const DaemonStatusPanel: React.FC<DaemonStatusPanelProps> = ({
  className = '',
  showLogs = true,
  refreshInterval = 5000
}) => {
  const { data, loading, error } = useDaemonHealth({ pollingInterval: refreshInterval });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'critical': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className={`daemon-status-panel loading ${className}`}>
        <div className="panel-header">
          <h3>Daemon Status</h3>
        </div>
        <div className="loading-message">
          Loading daemon status...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`daemon-status-panel error ${className}`}>
        <div className="panel-header">
          <h3>Daemon Status</h3>
          <span className="error-indicator">❌</span>
        </div>
        <div className="error-message">
          Failed to load daemon status: {error.message}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`daemon-status-panel error ${className}`}>
        <div className="panel-header">
          <h3>Daemon Status</h3>
        </div>
        <div className="error-message">
          No daemon data available
        </div>
      </div>
    );
  }

  const { daemons, overallHealth, lastUpdate } = data;
  const runningCount = daemons.filter(d => d.running).length;
  const totalCount = daemons.length;

  return (
    <div className={`daemon-status-panel ${className}`}>
      <div className="panel-header">
        <h3>Daemon Status</h3>
        <div className="health-summary">
          <span className="health-icon">{getHealthIcon(overallHealth)}</span>
          <span className="health-text" style={{ color: getHealthColor(overallHealth) }}>
            {overallHealth.toUpperCase()}
          </span>
          <span className="daemon-count">
            {runningCount}/{totalCount} running
          </span>
        </div>
      </div>

      <div className="daemon-grid">
        {daemons.map((daemon) => (
          <DaemonCard key={daemon.name} daemon={daemon} />
        ))}
      </div>

      {showLogs && (
        <div className="recent-logs">
          <h4>Recent Activity</h4>
          <LogStream />
        </div>
      )}

      <div className="panel-footer">
        <span className="last-update">
          Last updated: {new Date(lastUpdate).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
};

interface DaemonCardProps {
  daemon: {
    name: string;
    running: boolean;
    pid?: string;
    error?: string;
    lastCheck: string;
  };
}

const DaemonCard: React.FC<DaemonCardProps> = ({ daemon }) => {
  return (
    <div className={`daemon-card ${daemon.running ? 'running' : 'stopped'}`}>
      <div className="daemon-header">
        <span className="status-indicator">
          {daemon.running ? '🟢' : '🔴'}
        </span>
        <h4 className="daemon-name">{daemon.name}</h4>
      </div>

      <div className="daemon-details">
        <div className="detail-row">
          <span className="label">Status:</span>
          <span className="value">
            {daemon.running ? 'Running' : 'Stopped'}
          </span>
        </div>

        {daemon.running && daemon.pid && (
          <div className="detail-row">
            <span className="label">PID:</span>
            <span className="value">{daemon.pid}</span>
          </div>
        )}

        {daemon.error && (
          <div className="detail-row error">
            <span className="label">Error:</span>
            <span className="value">{daemon.error}</span>
          </div>
        )}

        <div className="detail-row">
          <span className="label">Last Check:</span>
          <span className="value">
            {new Date(daemon.lastCheck).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};

const LogStream: React.FC = () => {
  const { logs, error } = useLogStream();

  if (error) {
    return (
      <div className="log-stream error">
        Failed to load logs: {error.message}
      </div>
    );
  }

  return (
    <div className="log-stream">
      {logs.length === 0 ? (
        <div className="no-logs">No recent activity</div>
      ) : (
        <div className="log-entries">
          {logs.slice(0, 5).map((log, index) => (
            <div key={index} className={`log-entry ${log.level === 'error' ? 'error' : ''}`}>
              <span className="log-timestamp">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="log-type">[{log.daemon || 'system'}]</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DaemonStatusPanel; 