// ✅ GhostHealthStatus.js - Ghost health status component
import { _{ _React, _{ useState, _useEffect } } } from 'react';

export default function GhostHealthStatus() {
  const [daemonStatus, setDaemonStatus] = useState({
    summaryMonitor: 'unknown',
    patchExecutor: 'unknown',
    docDaemon: 'unknown'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(_() => {
    fetchDaemonStatus();
    const _interval = setInterval(fetchDaemonStatus, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const _fetchDaemonStatus = async () => {
    try {
      const _response = await fetch('/api/daemon-status');
      if (!response.ok) throw new Error('Failed to fetch daemon status');
      const _data = await response.json();
      
      // Enhanced validation - check for actual process existence
      const _validatedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === 'running') {
          // Double-check with process validation
          const _isValid = await validateProcessRunning(key);
          validatedData[key] = isValid ? 'running' : 'stopped';
        } else {
          validatedData[key] = value;
        }
      }
      
      setDaemonStatus(validatedData);
      setIsLoading(false);
    } catch (_err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const _validateProcessRunning = async (_processName) => {
    try {
      const _response = await fetch(`/api/validate-process?name=${processName}`);
      const _result = await response.json();
      return result.running;
    } catch (_error) {
      console.warn(`Process validation failed for ${processName}:`, error);
      return false;
    }
  };

  const _getStatusIcon = (_status) => {
    switch (status) {
    case 'running':
      return '✅';
    case 'stopped':
      return '❌';
    default:
      return '⏳';
    }
  };

  const _getStatusClass = (_status) => {
    switch (status) {
    case 'running':
      return 'status-ok';
    case 'stopped':
      return 'status-error';
    default:
      return 'status-unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="section ghost-monitor-section">
        <h2>👻 Ghost Monitor Status</h2>
        <div className="loading">Loading daemon status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section ghost-monitor-section">
        <h2>👻 Ghost Monitor Status</h2>
        <div className="error">Error loading daemon status: {error}</div>
      </div>
    );
  }

  return (
    <div className="section ghost-monitor-section">
      <h2>👻 Ghost Monitor Status</h2>
      <div className="status-grid">
        <div className="status-card">
          <h3>Summary Monitor</h3>
          <div className={`status-indicator ${getStatusClass(daemonStatus.summaryMonitor)}`}>
            {getStatusIcon(daemonStatus.summaryMonitor)} {daemonStatus.summaryMonitor === 'running' ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div className="status-card">
          <h3>Patch Executor</h3>
          <div className={`status-indicator ${getStatusClass(daemonStatus.patchExecutor)}`}>
            {getStatusIcon(daemonStatus.patchExecutor)} {daemonStatus.patchExecutor === 'running' ? 'Running' : 'Stopped'}
          </div>
        </div>
        <div className="status-card">
          <h3>Doc Daemon</h3>
          <div className={`status-indicator ${getStatusClass(daemonStatus.docDaemon)}`}>
            {getStatusIcon(daemonStatus.docDaemon)} {daemonStatus.docDaemon === 'running' ? 'Running' : 'Stopped'}
          </div>
        </div>
      </div>
    </div>
  );
} 
