import { useState, useEffect, useCallback } from 'react';

export interface DaemonStatus {
  name: string;
  running: boolean;
  pid?: string;
  error?: string;
  lastCheck: string;
}

export interface DaemonHealthData {
  daemons: DaemonStatus[];
  overallHealth: 'healthy' | 'warning' | 'critical';
  lastUpdate: string;
  error?: string;
}

export interface UseDaemonHealthOptions {
  pollingInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: Required<UseDaemonHealthOptions> = {
  pollingInterval: 5000,
  retryAttempts: 3,
  retryDelay: 1000,
  onError: (error) => console.error('[useDaemonHealth] Error:', error)
};

function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

async function fetchWithTimeout(url: string, timeout: number = 5000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export function useDaemonHealth(options: UseDaemonHealthOptions = {}): {
  data: DaemonHealthData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [data, setData] = useState<DaemonHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchDaemonHealth = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTimeout('/api/daemon-status', 5000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const healthData: DaemonHealthData = await response.json();
      
      setData(healthData);
      setRetryCount(0);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (retryCount < config.retryAttempts) {
        const delay = calculateBackoffDelay(retryCount, config.retryDelay);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchDaemonHealth();
        }, delay);
      } else {
        config.onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [config, retryCount]);

  const refetch = useCallback(async (): Promise<void> => {
    setRetryCount(0);
    await fetchDaemonHealth();
  }, [fetchDaemonHealth]);

  useEffect(() => {
    fetchDaemonHealth();

    const intervalId = setInterval(() => {
      fetchDaemonHealth();
    }, config.pollingInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchDaemonHealth, config.pollingInterval]);

  return { data, loading, error, refetch };
}

export function useDaemonStatus(daemonName: string, options: UseDaemonHealthOptions = {}): {
  status: DaemonStatus | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { data, loading, error, refetch } = useDaemonHealth(options);
  
  const status = data?.daemons.find(daemon => daemon.name === daemonName) || null;
  
  return { status, loading, error, refetch };
}

export function useSystemHealth(options: UseDaemonHealthOptions = {}): {
  health: 'healthy' | 'warning' | 'critical' | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { data, loading, error, refetch } = useDaemonHealth(options);
  
  return {
    health: data?.overallHealth || null,
    loading,
    error,
    refetch
  };
}

export function useDaemonStats(options: UseDaemonHealthOptions = {}): {
  stats: {
    total: number;
    running: number;
    failed: number;
  } | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { data, loading, error, refetch } = useDaemonHealth(options);
  
  const stats = data?.daemons ? {
    total: data.daemons.length,
    running: data.daemons.filter(d => d.running).length,
    failed: data.daemons.filter(d => !d.running).length
  } : null;
  
  return { stats, loading, error, refetch };
}