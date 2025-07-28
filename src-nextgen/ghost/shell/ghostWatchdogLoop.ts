import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

declare const console: any;

const execAsync = promisify(exec);
const sentinelLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/sentinel-status.log';
const watchdogLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/watchdog-restarts.log';
const logDir = path.dirname(watchdogLogPath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface RestartAttempt {
  daemon: string;
  timestamp: string;
  attempt: number;
  success: boolean;
  error?: string;
}

const restartCooldowns = new Map<string, number>();
const maxRestartAttempts = 3;
const baseCooldownMs = 30000; // 30 seconds

async function restartDaemon(daemonName: string): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString();
    const attempt = (restartCooldowns.get(daemonName) || 0) + 1;
    
    if (attempt > maxRestartAttempts) {
      logRestartAttempt({
        daemon: daemonName,
        timestamp,
        attempt,
        success: false,
        error: 'Max restart attempts exceeded'
      });
      return false;
    }
    
    // Calculate exponential backoff
    const cooldownMs = baseCooldownMs * Math.pow(2, attempt - 1);
    const lastRestart = restartCooldowns.get(daemonName) || 0;
    
    if (Date.now() - lastRestart < cooldownMs) {
      return false; // Still in cooldown
    }
    
    // Attempt restart using non-blocking pattern
    const cmd = `cd /Users/sawyer/gitSync/gpt-cursor-runner && node src-nextgen/ghost/shell/${daemonName}.ts`;
    const { stdout, stderr } = await execAsync(cmd);
    
    restartCooldowns.set(daemonName, Date.now());
    
    const success = !stderr || stderr.length === 0;
    
    logRestartAttempt({
      daemon: daemonName,
      timestamp,
      attempt,
      success,
      error: success ? undefined : stderr
    });
    
    return success;
  } catch (err) {
    const timestamp = new Date().toISOString();
    const attempt = (restartCooldowns.get(daemonName) || 0) + 1;
    
    logRestartAttempt({
      daemon: daemonName,
      timestamp,
      attempt,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    });
    
    return false;
  }
}

function logRestartAttempt(attempt: RestartAttempt): void {
  const logEntry = `[${attempt.timestamp}] ${attempt.success ? '✅' : '❌'} ${attempt.daemon} restart attempt ${attempt.attempt}${attempt.error ? ` - ${attempt.error}` : ''}\n`;
  
  try {
    fs.appendFileSync(watchdogLogPath, logEntry);
  } catch (err) {
    console.error('[watchdog] Failed to write restart log:', err);
  }
}

async function checkForFailedDaemons(): Promise<void> {
  try {
    if (!fs.existsSync(sentinelLogPath)) {
      return; // No sentinel log yet
    }
    
    // Read last 10 lines of sentinel log
    const content = fs.readFileSync(sentinelLogPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim()).slice(-10);
    
    const failedDaemons = new Set<string>();
    
    lines.forEach(line => {
      if (line.includes('🔴') && line.includes('NOT running')) {
        const match = line.match(/🔴 (\w+) NOT running/);
        if (match) {
          failedDaemons.add(match[1]);
        }
      }
    });
    
    // Attempt restart for failed daemons
    for (const daemon of failedDaemons) {
      await restartDaemon(daemon);
    }
  } catch (err) {
    console.error('[watchdog] Error checking for failed daemons:', err);
  }
}

export async function startGhostWatchdogLoop(): Promise<void> {
  console.log('[watchdog] Starting daemon restart monitoring...');
  
  // Check for failed daemons every 30 seconds
  setInterval(async () => {
    await checkForFailedDaemons();
  }, 30000);
}

export function getRestartStats(): Map<string, number> {
  return new Map(restartCooldowns);
}
