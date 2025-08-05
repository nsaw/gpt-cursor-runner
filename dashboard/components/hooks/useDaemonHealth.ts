    try {
      const response = await fetch('/api/daemon-status');
      const data = await response.json();
      
      // Transform API response to match frontend expectations
      // API returns: {daemon_status: {key: "running"}}
      // Frontend expects: array of objects with status property
      const daemonList = Object.entries(data.daemon_status || {}).map(([name, status]) => ({
        name,
        status: typeof status === 'string' ? status : 'UNKNOWN',
        timestamp: new Date().toISOString(),
        error: null
      }));
      
      setDaemonList(daemonList);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch daemon status:', error);
      setError(error.message);
      setLoading(false);
    }