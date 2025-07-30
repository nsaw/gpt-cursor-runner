// ✅ TunnelStatusGrid.js - Tunnel status component
import { _{ _React, _{ useState, _useEffect } } } from 'react';

export default function TunnelStatusGrid() {
  const [tunnelStatus, setTunnelStatus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(_() => {
    fetchTunnelStatus();
    const _interval = setInterval(fetchTunnelStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const _fetchTunnelStatus = async () => {
    try {
      const _response = await fetch('/api/tunnel-status');
      if (!response.ok) throw new Error('Failed to fetch tunnel status');
      const _data = await response.json();
      setTunnelStatus(data.tunnelStatus || []);
      setIsLoading(false);
    } catch (_err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="section tunnel-section">
        <h2>🌐 Tunnel Status</h2>
        <div className="loading">Loading tunnel status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section tunnel-section">
        <h2>🌐 Tunnel Status</h2>
        <div className="error">Error loading tunnel status: {error}</div>
      </div>
    );
  }

  return (
    <div className="section tunnel-section">
      <h2>🌐 Tunnel Status</h2>
      <div className="tunnel-grid">
        {tunnelStatus.length === 0 ? (
          <div className="no-tunnels">No tunnel information available</div>
        ) : (_tunnelStatus.map((tunnel, _index) => (
            <div key={index} className={`tunnel-item ${tunnel.healthy ? 'tunnel-ok' : 'tunnel-error'}`}>
              <div className="tunnel-name">{tunnel.name}</div>
              <div className="tunnel-status">
                {tunnel.healthy ? '✅ Healthy' : '❌ Unhealthy'}
              </div>
              <div className="tunnel-url">{tunnel.url}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 