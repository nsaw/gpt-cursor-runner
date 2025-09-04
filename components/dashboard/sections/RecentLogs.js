// ✅ RecentLogs.js - Real-time log tailing component
import React, { useState, useEffect } from 'react';

export default function RecentLogs() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/recent-logs');
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="section recent-logs-section">
        <h2>📋 Recent Logs</h2>
        <div className="loading">Loading recent logs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section recent-logs-section">
        <h2>📋 Recent Logs</h2>
        <div className="error">Error loading logs: {error}</div>
      </div>
    );
  }

  return (
    <div className="section recent-logs-section">
      <h2>📋 Recent Logs</h2>
      <div className="logs-container">
        {logs.length === 0 ? (
          <div className="no-logs">No recent log activity</div>
        ) : (_logs.map((log, _index) => (
            <div key={index} className={`log-entry ${log.level}`}>
              <span className="log-timestamp">{log.timestamp}</span>
              <span className="log-level">{log.level}</span>
              <span className="log-message">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 
