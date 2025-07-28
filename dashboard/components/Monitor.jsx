import React, { useEffect, useState } from 'react';

export default function Monitor() {
  const [state, setState] = useState(null);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('/state/systemState.json');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setState(json);
      } catch (e) {
        console.error('Hydration fetch failed:', e);
      }
    };
    fetchState();
    const interval = setInterval(fetchState, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!state) return <div>Loading system state...</div>;

  return (
    <div>
      <h2>🔍 Real Dual Monitor</h2>
      <p>MAIN System: {state.main.status}</p>
      <p>CYOPS System: {state.cyops.status}</p>
      <p>🚀 Fly.io Status: {state.flyio.status}</p>
    </div>
  );
}