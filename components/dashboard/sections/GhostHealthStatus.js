// ✅ GhostHealthStatus.js - Ghost health status component
import React, { useState, useEffect } from 'react';

export default function GhostHealthStatus() {
  const [daemonStatus, setDaemonStatus] = useState({
    summaryMonitor: 'unknown',
    patchExecutor: 'unknown',
    docDaemon: 'unknown'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDaemonStatus();
    const interval = setInterval(fetchDaemonStatus, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDaemonStatus = async () => {
    try {
      const response = await fetch('/api/daemon-status');
      if (!response.ok) throw new Error('Failed to fetch daemon status');
      const data = await response.json();
      
      // Enhanced validation - check for actual process existence
      const validatedData = {};
      for (const [key, value] of Object.entries(data)) {
        if (value === 'running') {
          // Double-check with process validation
          const isValid = await validateProcessRunning(key);
          validatedData[key] = isValid ? 'running' : 'stopped';
        } else {
          validatedData[key] = value;
        }
      }
      
      setDaemonStatus(validatedData);
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const validateProcessRunning = async (processName) => {
    try {
      const response = await fetch(`/api/validate-process?name=${processName}`);
      const result = await response.json();
      return result.running;
    } catch (error) {
      console.warn(`Process validation failed for ${processName}:`, error);
      return false;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
    case 'running':
      return '✅';
    case 'stopped':
      return '❌';
    default:
      return '⏳';
    }
  };

  const getStatusClass = (status) => {
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
