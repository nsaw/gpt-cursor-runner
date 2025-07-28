// ✅ PatchQueue.js - Patch queue status component
import React, { useState, useEffect } from 'react';

export default function PatchQueue() {
  const [patchStatus, setPatchStatus] = useState({ main: [], cyops: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPatchStatus();
    const interval = setInterval(fetchPatchStatus, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPatchStatus = async () => {
    try {
      const response = await fetch('/api/patch-status');
      if (!response.ok) throw new Error('Failed to fetch patch status');
      const data = await response.json();
      setPatchStatus(data.patchStatus || { main: [], cyops: [] });
      setIsLoading(false);
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const renderPatchList = (patches) => {
    if (!patches || patches.length === 0) {
      return <div className="no-patches">No pending patches</div>;
    }

    return patches.map((patch, index) => (
      <div key={index} className={`patch-item ${patch.status}`}>
        <div className="patch-name">{patch.name}</div>
        <div className="patch-status">{patch.status}</div>
        <div className="patch-time">{patch.timestamp}</div>
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="section patch-section">
        <h2>📦 Patch Queue</h2>
        <div className="loading">Loading patch status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section patch-section">
        <h2>📦 Patch Queue</h2>
        <div className="error">Error loading patch status: {error}</div>
      </div>
    );
  }

  return (
    <div className="section patch-section">
      <h2>📦 Patch Queue</h2>
      <div className="patch-grid">
        <div className="patch-column">
          <h3>MAIN</h3>
          <div className="patch-list">
            {renderPatchList(patchStatus.main)}
          </div>
        </div>
        <div className="patch-column">
          <h3>CYOPS</h3>
          <div className="patch-list">
            {renderPatchList(patchStatus.cyops)}
          </div>
        </div>
      </div>
    </div>
  );
} 