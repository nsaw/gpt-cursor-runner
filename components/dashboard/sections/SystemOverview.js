// ✅ SystemOverview.js - System health overview component
import React, { useState, useEffect } from 'react';

export default function SystemOverview() {
  const [resourceHealth, setResourceHealth] = useState({
    memory: 0,
    cpu: 0,
    disk: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSystemHealth();
    const interval = setInterval(fetchSystemHealth, 20000); // Refresh every 20 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/system-health');
      if (!response.ok) throw new Error('Failed to fetch system health');
      const data = await response.json();
      setResourceHealth(data.resourceHealth || { memory: 0, cpu: 0, disk: 0 });
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const getHealthClass = (value) => {
    if (value < 60) return 'health-ok';
    if (value < 80) return 'health-warning';
    return 'health-error';
  };

  const getHealthIcon = (value) => {
    if (value < 60) return '✅';
    if (value < 80) return '⚠️';
    return '❌';
  };

  if (isLoading) {
    return (
      <div className="section system-section">
        <h2>💻 System Health</h2>
        <div className="loading">Loading system health...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section system-section">
        <h2>💻 System Health</h2>
        <div className="error">Error loading system health: {error}</div>
      </div>
    );
  }

  return (
    <div className="section system-section">
      <h2>💻 System Health</h2>
      <div className="health-grid">
        <div className="health-card">
          <h3>Memory</h3>
          <div className={`health-indicator ${getHealthClass(resourceHealth.memory)}`}>
            {getHealthIcon(resourceHealth.memory)} {resourceHealth.memory}%
          </div>
        </div>
        <div className="health-card">
          <h3>CPU</h3>
          <div className={`health-indicator ${getHealthClass(resourceHealth.cpu)}`}>
            {getHealthIcon(resourceHealth.cpu)} {resourceHealth.cpu}%
          </div>
        </div>
        <div className="health-card">
          <h3>Disk</h3>
          <div className={`health-indicator ${getHealthClass(resourceHealth.disk)}`}>
            {getHealthIcon(resourceHealth.disk)} {resourceHealth.disk}%
          </div>
        </div>
      </div>
    </div>
  );
} 