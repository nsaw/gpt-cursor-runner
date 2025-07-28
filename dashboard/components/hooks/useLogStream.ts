import { useState, useEffect, useCallback, useRef } from 'react';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  daemon?: string;
  metadata?: Record<string, any>;
}

export interface LogStreamOptions {
  daemon?: string;
  maxEntries?: number;
  pollingInterval?: number;
  autoScroll?: boolean;
  onNewLog?: (entry: LogEntry) => void;
}

const DEFAULT_OPTIONS: Required<Omit<LogStreamOptions, 'daemon' | 'onNewLog'>> = {
  maxEntries: 100,
  pollingInterval: 2000,
  autoScroll: true
};

export function useLogStream(options: LogStreamOptions = {}): {
  logs: LogEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  clearLogs: () => void;
} {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const lastLogTimestamp = useRef<string>('');

  const fetchLogs = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const url = config.daemon 
        ? `/api/recent-logs?daemon=${encodeURIComponent(config.daemon)}`
        : '/api/recent-logs';

      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const logData: LogEntry[] = await response.json();
      
      const newLogs = logData.filter(log => 
        log.timestamp > lastLogTimestamp.current
      );
      
      if (newLogs.length > 0) {
        setLogs(prevLogs => {
          const updatedLogs = [...prevLogs, ...newLogs];
          
          if (updatedLogs.length > config.maxEntries) {
            return updatedLogs.slice(-config.maxEntries);
          }
          
          return updatedLogs;
        });
        
        lastLogTimestamp.current = newLogs[newLogs.length - 1].timestamp;
        
        newLogs.forEach(log => {
          config.onNewLog?.(log);
        });
      }
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[useLogStream] Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [config]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchLogs();
  }, [fetchLogs]);

  const clearLogs = useCallback((): void => {
    setLogs([]);
    lastLogTimestamp.current = '';
  }, []);

  useEffect(() => {
    fetchLogs();

    const intervalId = setInterval(() => {
      fetchLogs();
    }, config.pollingInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchLogs, config.pollingInterval]);

  return {
    logs,
    loading,
    error,
    refetch,
    clearLogs
  };
}

export function useErrorLogs(options: LogStreamOptions = {}): {
  errorLogs: LogEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { logs, loading, error, refetch } = useLogStream(options);
  
  const errorLogs = logs.filter(log => log.level === 'error');
  
  return {
    errorLogs,
    loading,
    error,
    refetch
  };
}

export function useDaemonLogs(daemonName: string, options: Omit<LogStreamOptions, 'daemon'> = {}): {
  logs: LogEntry[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  return useLogStream({ ...options, daemon: daemonName });
}