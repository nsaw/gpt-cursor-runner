import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

declare const console: any;

const execAsync = promisify(exec);
const governorLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/lifecycle-governor.log';
const logDir = path.dirname(governorLogPath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface DaemonConfig {
  name: string;
  priority: number;
  dependencies: string[];
  startupTimeout: number;
  healthCheckInterval: number;
  maxRestartAttempts: number;
  filePath: string;
}

interface DaemonStatus {
  name: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'failed';
  pid?: number;
  startTime?: number;
  restartCount: number;
  lastHealthCheck: number;
  error?: string;
}

interface LifecycleState {
  isInitializing: boolean;
  isShuttingDown: boolean;
  startupQueue: string[];
  runningDaemons: Set<string>;
  failedDaemons: Set<string>;
  lastGovernanceCheck: number;
}

const daemonConfigs: DaemonConfig[] = [
  {
    name: 'bootstrapDaemon',
    priority: 1,
    dependencies: [],
    startupTimeout: 10000,
    healthCheckInterval: 5000,
    maxRestartAttempts: 3,
    filePath: 'bootstrapDaemon.ts'
  },
  {
    name: 'relayCore',
    priority: 2,
    dependencies: ['bootstrapDaemon'],
    startupTimeout: 8000,
    healthCheckInterval: 5000,
    maxRestartAttempts: 3,
    filePath: 'relayCore.ts'
  },
  {
    name: 'diffMonitor',
    priority: 3,
    dependencies: ['bootstrapDaemon'],
    startupTimeout: 8000,
    healthCheckInterval: 5000,
    maxRestartAttempts: 3,
    filePath: 'diffMonitor.ts'
  },
  {
    name: 'roleVerifier',
    priority: 4,
    dependencies: ['relayCore'],
    startupTimeout: 6000,
    healthCheckInterval: 5000,
    maxRestartAttempts: 3,
    filePath: 'roleVerifier.ts'
  },
  {
    name: 'summarySyncValidator',
    priority: 5,
    dependencies: ['diffMonitor'],
    startupTimeout: 6000,
    healthCheckInterval: 5000,
    maxRestartAttempts: 3,
    filePath: 'summarySyncValidator.ts'
  },
  {
    name: 'monitorWatcher',
    priority: 6,
    dependencies: ['relayCore', 'diffMonitor'],
    startupTimeout: 6000,
    healthCheckInterval: 5000,
    maxRestartAttempts: 3,
    filePath: 'monitorWatcher.ts'
  },
  {
    name: 'executor',
    priority: 7,
    dependencies: ['roleVerifier', 'summarySyncValidator'],
    startupTimeout: 8000,
    healthCheckInterval: 5000,
    maxRestartAttempts: 3,
    filePath: 'executor.ts'
  }
];

const daemonStatuses = new Map<string, DaemonStatus>();
const lifecycleState: LifecycleState = {
  isInitializing: false,
  isShuttingDown: false,
  startupQueue: [],
  runningDaemons: new Set(),
  failedDaemons: new Set(),
  lastGovernanceCheck: 0
};

const governanceInterval = 5000; // 5 seconds

function initializeDaemonStatuses(): void {
  daemonConfigs.forEach(config => {
    daemonStatuses.set(config.name, {
      name: config.name,
      status: 'stopped',
      restartCount: 0,
      lastHealthCheck: 0
    });
  });
}

function buildStartupQueue(): string[] {
  const queue: string[] = [];
  const visited = new Set<string>();
  const inProgress = new Set<string>();
  
  function addToQueue(daemonName: string): void {
    if (visited.has(daemonName) || inProgress.has(daemonName)) {
      return;
    }
    
    inProgress.add(daemonName);
    
    const config = daemonConfigs.find(c => c.name === daemonName);
    if (!config) return;
    
    // Add dependencies first
    config.dependencies.forEach(dep => {
      addToQueue(dep);
    });
    
    inProgress.delete(daemonName);
    visited.add(daemonName);
    queue.push(daemonName);
  }
  
  // Sort by priority and add to queue
  const sortedConfigs = [...daemonConfigs].sort((a, b) => a.priority - b.priority);
  sortedConfigs.forEach(config => {
    addToQueue(config.name);
  });
  
  return queue;
}

async function checkDaemonHealth(daemonName: string): Promise<boolean> {
  try {
    const cmd = `ps aux | grep -E "${daemonName}\.ts|${daemonName}\.js" | grep -v grep | head -1`;
    const { stdout } = await execAsync(cmd);
    
    if (stdout.trim()) {
      const parts = stdout.trim().split(/\s+/);
      const pid = parseInt(parts[1]);
      
      const status = daemonStatuses.get(daemonName);
      if (status) {
        status.status = 'running';
        status.pid = pid;
        status.lastHealthCheck = Date.now();
        if (!status.startTime) {
          status.startTime = Date.now();
        }
      }
      
      return true;
    } else {
      const status = daemonStatuses.get(daemonName);
      if (status && status.status === 'running') {
        status.status = 'failed';
        status.error = 'Process not found';
      }
      return false;
    }
  } catch (err) {
    const status = daemonStatuses.get(daemonName);
    if (status) {
      status.status = 'failed';
      status.error = err instanceof Error ? err.message : 'Unknown error';
    }
    return false;
  }
}

async function startDaemon(daemonName: string): Promise<boolean> {
  try {
    const config = daemonConfigs.find(c => c.name === daemonName);
    if (!config) return false;
    
    const status = daemonStatuses.get(daemonName);
    if (!status) return false;
    
    // Check if dependencies are running
    for (const dep of config.dependencies) {
      const depStatus = daemonStatuses.get(dep);
      if (!depStatus || depStatus.status !== 'running') {
        logGovernanceEvent(`Cannot start ${daemonName}: dependency ${dep} not running`);
        return false;
      }
    }
    
    status.status = 'starting';
    status.restartCount++;
    
    logGovernanceEvent(`Starting daemon: ${daemonName} (attempt ${status.restartCount})`);
    
    // Start daemon using non-blocking pattern
    const cmd = `cd /Users/sawyer/gitSync/gpt-cursor-runner && node src-nextgen/ghost/shell/${config.filePath}`;
    const { stdout, stderr } = await execAsync(cmd);
    
    // Wait for startup timeout
    await new Promise(resolve => setTimeout(resolve, config.startupTimeout));
    
    // Check if daemon started successfully
    const isHealthy = await checkDaemonHealth(daemonName);
    
    if (isHealthy) {
      status.status = 'running';
      lifecycleState.runningDaemons.add(daemonName);
      lifecycleState.failedDaemons.delete(daemonName);
      logGovernanceEvent(`✅ Daemon started successfully: ${daemonName}`);
      return true;
    } else {
      status.status = 'failed';
      status.error = stderr || 'Startup timeout';
      lifecycleState.failedDaemons.add(daemonName);
      logGovernanceEvent(`❌ Daemon failed to start: ${daemonName} - ${status.error}`);
      return false;
    }
  } catch (err) {
    const status = daemonStatuses.get(daemonName);
    if (status) {
      status.status = 'failed';
      status.error = err instanceof Error ? err.message : 'Unknown error';
      lifecycleState.failedDaemons.add(daemonName);
    }
    logGovernanceEvent(`❌ Error starting daemon: ${daemonName} - ${err}`);
    return false;
  }
}

async function stopDaemon(daemonName: string): Promise<boolean> {
  try {
    const status = daemonStatuses.get(daemonName);
    if (!status || status.status !== 'running') return true;
    
    status.status = 'stopping';
    logGovernanceEvent(`Stopping daemon: ${daemonName}`);
    
    // Kill daemon process
    if (status.pid) {
      const cmd = `kill ${status.pid}`;
      await execAsync(cmd);
    }
    
    // Wait for process to stop
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verify process stopped
    const isRunning = await checkDaemonHealth(daemonName);
    
    if (!isRunning) {
      status.status = 'stopped';
      status.pid = undefined;
      status.startTime = undefined;
      lifecycleState.runningDaemons.delete(daemonName);
      logGovernanceEvent(`✅ Daemon stopped successfully: ${daemonName}`);
      return true;
    } else {
      status.status = 'running';
      logGovernanceEvent(`❌ Failed to stop daemon: ${daemonName}`);
      return false;
    }
  } catch (err) {
    const status = daemonStatuses.get(daemonName);
    if (status) {
      status.status = 'failed';
      status.error = err instanceof Error ? err.message : 'Unknown error';
    }
    logGovernanceEvent(`❌ Error stopping daemon: ${daemonName} - ${err}`);
    return false;
  }
}

async function restartDaemon(daemonName: string): Promise<boolean> {
  const config = daemonConfigs.find(c => c.name === daemonName);
  if (!config) return false;
  
  const status = daemonStatuses.get(daemonName);
  if (!status) return false;
  
  // Check restart attempts
  if (status.restartCount >= config.maxRestartAttempts) {
    logGovernanceEvent(`❌ Max restart attempts exceeded for daemon: ${daemonName}`);
    return false;
  }
  
  // Stop first
  await stopDaemon(daemonName);
  
  // Wait before restart
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Start again
  return await startDaemon(daemonName);
}

function logGovernanceEvent(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  try {
    fs.appendFileSync(governorLogPath, logEntry);
  } catch (err) {
    console.error('[lifecycle-governor] Failed to write governance log:', err);
  }
}

async function governLifecycle(): Promise<void> {
  try {
    const timestamp = new Date().toISOString();
    
    // Check health of all running daemons
    for (const [daemonName, status] of daemonStatuses) {
      if (status.status === 'running') {
        const isHealthy = await checkDaemonHealth(daemonName);
        if (!isHealthy) {
          logGovernanceEvent(`🔄 Daemon health check failed: ${daemonName}, attempting restart`);
          await restartDaemon(daemonName);
        }
      }
    }
    
    // Process startup queue if not initializing
    if (!lifecycleState.isInitializing && lifecycleState.startupQueue.length > 0) {
      const nextDaemon = lifecycleState.startupQueue[0];
      const status = daemonStatuses.get(nextDaemon);
      
      if (status && status.status === 'stopped') {
        const success = await startDaemon(nextDaemon);
        if (success) {
          lifecycleState.startupQueue.shift(); // Remove from queue
        }
      } else if (status && status.status === 'failed') {
        lifecycleState.startupQueue.shift(); // Remove failed daemon from queue
        logGovernanceEvent(`❌ Removed failed daemon from startup queue: ${nextDaemon}`);
      }
    }
    
    // Update governance state
    lifecycleState.lastGovernanceCheck = Date.now();
    
  } catch (err) {
    logGovernanceEvent(`❌ Error in lifecycle governance: ${err}`);
  }
}

export async function startGhostLifecycleGovernor(): Promise<void> {
  console.log('[lifecycle-governor] Starting daemon lifecycle governance...');
  
  // Initialize daemon statuses
  initializeDaemonStatuses();
  
  // Build startup queue
  lifecycleState.startupQueue = buildStartupQueue();
  
  logGovernanceEvent(`🚀 Lifecycle governor started. Startup queue: ${lifecycleState.startupQueue.join(', ')}`);
  
  // Set up governance loop
  setInterval(async () => {
    await governLifecycle();
  }, governanceInterval);
}

export async function shutdownAllDaemons(): Promise<void> {
  logGovernanceEvent(`🛑 Initiating shutdown sequence...`);
  
  lifecycleState.isShuttingDown = true;
  
  // Stop daemons in reverse dependency order
  const reverseQueue = [...lifecycleState.startupQueue].reverse();
  
  for (const daemonName of reverseQueue) {
    const status = daemonStatuses.get(daemonName);
    if (status && status.status === 'running') {
      await stopDaemon(daemonName);
    }
  }
  
  logGovernanceEvent(`✅ Shutdown sequence completed`);
}

export function getLifecycleState(): LifecycleState {
  return { ...lifecycleState };
}

export function getDaemonStatuses(): Map<string, DaemonStatus> {
  return new Map(daemonStatuses);
}

export async function restartDaemonByName(daemonName: string): Promise<boolean> {
  return await restartDaemon(daemonName);
}
