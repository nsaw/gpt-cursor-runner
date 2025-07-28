import { useState, useEffect, useCallback } from 'react';

export interface OrchestrationComponent {
  status: 'active' | 'idle' | 'error' | 'unknown';
  lastCheck: string;
  error?: string;
}

export interface SentinelState extends OrchestrationComponent {
  monitoring: boolean;
  recentErrors: string[];
}

export interface WatchdogState extends OrchestrationComponent {
  restartCount: number;
  failedCount: number;
  lastRestart?: string;
}

export interface ExecutorState extends OrchestrationComponent {
  activeTasks: number;
  completedTasks: number;
}

export interface SelfCheckState extends OrchestrationComponent {
  healthChecks: number;
  lastHealthCheck?: string;
}

export interface LifecycleState extends OrchestrationComponent {
  managedDaemons: number;
  startupOrder: string[];
}

export interface OrchestrationData {
  sentinel: SentinelState;
  watchdog: WatchdogState;
  executor: ExecutorState;
  selfcheck: SelfCheckState;
  lifecycle: LifecycleState;
  overallHealth: 'healthy' | 'warning' | 'critical';
  activeComponents: number;
  errorComponents: number;
  totalComponents: number;
  lastUpdate: string;
}

export interface UseOrchestratorHealthOptions {
  pollingInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: Required<UseOrchestratorHealthOptions> = {
  pollingInterval: 10000, // 10 seconds for orchestration
  retryAttempts: 3,
  retryDelay: 2000,
  onError: (error) => console.error('[useOrchestratorHealth] Error:', error)
};

function calculateBackoffDelay(attempt: number, baseDelay: number): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}

async function fetchWithTimeout(url: string, timeout: number = 10000): Promise<Response> {
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

export function useOrchestratorHealth(options: UseOrchestratorHealthOptions = {}): {
  data: OrchestrationData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [data, setData] = useState<OrchestrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchOrchestratorHealth = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTimeout('/api/orchestrator/status', 10000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();
      
      if (responseData.status === 'success') {
        setData(responseData.data);
        setRetryCount(0);
      } else {
        throw new Error(responseData.error || 'Unknown orchestration error');
      }
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (retryCount < config.retryAttempts) {
        const delay = calculateBackoffDelay(retryCount, config.retryDelay);
        
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchOrchestratorHealth();
        }, delay);
      } else {
        config.onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [config, retryCount]);

  useEffect(() => {
    fetchOrchestratorHealth();

    const interval = setInterval(() => {
      fetchOrchestratorHealth();
    }, config.pollingInterval);

    return () => {
      clearInterval(interval);
    };
  }, [fetchOrchestratorHealth, config.pollingInterval]);

  const refetch = useCallback(async (): Promise<void> => {
    setRetryCount(0);
    await fetchOrchestratorHealth();
  }, [fetchOrchestratorHealth]);

  return {
    data,
    loading,
    error,
    refetch
  };
}

export function useComponentHealth(componentName: keyof OrchestrationData, options: UseOrchestratorHealthOptions = {}): {
  component: OrchestrationComponent | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { data, loading, error, refetch } = useOrchestratorHealth(options);
  
  const component = data && componentName in data ? data[componentName] as OrchestrationComponent : null;
  
  return {
    component,
    loading,
    error,
    refetch
  };
}

export function useOrchestrationHealth(options: UseOrchestratorHealthOptions = {}): {
  health: 'healthy' | 'warning' | 'critical' | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { data, loading, error, refetch } = useOrchestratorHealth(options);
  
  return {
    health: data?.overallHealth || null,
    loading,
    error,
    refetch
  };
}

export function useOrchestrationStats(options: UseOrchestratorHealthOptions = {}): {
  stats: {
    activeComponents: number;
    errorComponents: number;
    totalComponents: number;
    healthPercentage: number;
  } | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
} {
  const { data, loading, error, refetch } = useOrchestratorHealth(options);
  
  const stats = data ? {
    activeComponents: data.activeComponents,
    errorComponents: data.errorComponents,
    totalComponents: data.totalComponents,
    healthPercentage: Math.round((data.activeComponents / data.totalComponents) * 100)
  } : null;
  
  return {
    stats,
    loading,
    error,
    refetch
  };
} 