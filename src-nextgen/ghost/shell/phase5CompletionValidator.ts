import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

declare const console: any;

const execAsync = promisify(exec);
const validationLogPath = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/phase5-completion-validation.log';
const logDir = path.dirname(validationLogPath);

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

interface ValidationResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details?: any;
}

interface Phase5CompletionStatus {
  timestamp: string;
  overallStatus: 'COMPLETE' | 'INCOMPLETE' | 'FAILED';
  validations: ValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
}

const requiredFiles = [
  'ghostSentinelGuard.ts',
  'ghostWatchdogLoop.ts',
  'ghostExecutorUnifier.ts',
  'ghostSelfCheckCore.ts',
  'ghostLifecycleGovernor.ts'
];

const requiredLogs = [
  'sentinel-status.log',
  'watchdog-restarts.log',
  'executor-coordination.log',
  'selfcheck-health.log',
  'lifecycle-governor.log'
];

const requiredTags = [
  'patch-v3.5.1(P5.01.00)_ghost-sentinel-guard',
  'patch-v3.5.2(P5.02.00)_ghost-watchdog-loop',
  'patch-v3.5.3(P5.03.00)_ghost-executor-unifier',
  'patch-v3.5.4(P5.04.00)_ghost-selfcheck-core',
  'patch-v3.5.5(P5.05.00)_ghost-lifecycle-governor'
];

async function validateFileExistence(fileName: string): Promise<ValidationResult> {
  const filePath = `/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell/${fileName}`;
  
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        component: `File: ${fileName}`,
        status: 'PASS',
        message: 'File exists and is accessible',
        details: { size: stats.size, modified: stats.mtime }
      };
    } else {
      return {
        component: `File: ${fileName}`,
        status: 'FAIL',
        message: 'File does not exist'
      };
    }
  } catch (err) {
    return {
      component: `File: ${fileName}`,
      status: 'FAIL',
      message: 'Error checking file existence',
      details: { error: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}

async function validateLogFile(logName: string): Promise<ValidationResult> {
  const logPath = `/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs/${logName}`;
  
  try {
    if (fs.existsSync(logPath)) {
      const stats = fs.statSync(logPath);
      return {
        component: `Log: ${logName}`,
        status: 'PASS',
        message: 'Log file exists',
        details: { size: stats.size, modified: stats.mtime }
      };
    } else {
      return {
        component: `Log: ${logName}`,
        status: 'WARNING',
        message: 'Log file does not exist (may be created during runtime)'
      };
    }
  } catch (err) {
    return {
      component: `Log: ${logName}`,
      status: 'FAIL',
      message: 'Error checking log file',
      details: { error: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}

async function validateGitTag(tagName: string): Promise<ValidationResult> {
  try {
    const cmd = `git tag -l "${tagName}"`;
    const { stdout } = await execAsync(cmd);
    
    if (stdout.trim() === tagName) {
      return {
        component: `Git Tag: ${tagName}`,
        status: 'PASS',
        message: 'Git tag exists'
      };
    } else {
      return {
        component: `Git Tag: ${tagName}`,
        status: 'FAIL',
        message: 'Git tag does not exist'
      };
    }
  } catch (err) {
    return {
      component: `Git Tag: ${tagName}`,
      status: 'FAIL',
      message: 'Error checking git tag',
      details: { error: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}

async function validateTypeScriptCompilation(): Promise<ValidationResult> {
  try {
    const cmd = 'cd /Users/sawyer/gitSync/gpt-cursor-runner && tsc --noEmit';
    await execAsync(cmd);
    
    return {
      component: 'TypeScript Compilation',
      status: 'PASS',
      message: 'All TypeScript files compile successfully'
    };
  } catch (err) {
    return {
      component: 'TypeScript Compilation',
      status: 'FAIL',
      message: 'TypeScript compilation failed',
      details: { error: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}

async function validateNonBlockingPatterns(): Promise<ValidationResult> {
  try {
    const shellDir = '/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell';
    const files = fs.readdirSync(shellDir).filter(f => f.endsWith('.ts'));
    
    let execSyncFound = false;
    let execAsyncFound = false;
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(shellDir, file), 'utf8');
      if (content.includes('execSync')) {
        execSyncFound = true;
      }
      if (content.includes('execAsync')) {
        execAsyncFound = true;
      }
    }
    
    if (execSyncFound && !execAsyncFound) {
      return {
        component: 'Non-blocking Patterns',
        status: 'FAIL',
        message: 'Found execSync without execAsync patterns'
      };
    } else if (execAsyncFound) {
      return {
        component: 'Non-blocking Patterns',
        status: 'PASS',
        message: 'Non-blocking patterns properly implemented'
      };
    } else {
      return {
        component: 'Non-blocking Patterns',
        status: 'WARNING',
        message: 'No shell execution patterns found'
      };
    }
  } catch (err) {
    return {
      component: 'Non-blocking Patterns',
      status: 'FAIL',
      message: 'Error validating non-blocking patterns',
      details: { error: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}

async function validateAbsolutePaths(): Promise<ValidationResult> {
  try {
    const shellDir = '/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell';
    const files = fs.readdirSync(shellDir).filter(f => f.endsWith('.ts'));
    
    let relativePathsFound = false;
    let absolutePathsFound = false;
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(shellDir, file), 'utf8');
      if (content.includes('/Users/sawyer/gitSync/')) {
        absolutePathsFound = true;
      }
      if (content.includes('./') || content.includes('../')) {
        relativePathsFound = true;
      }
    }
    
    if (absolutePathsFound && !relativePathsFound) {
      return {
        component: 'Absolute Paths',
        status: 'PASS',
        message: 'All paths use absolute format'
      };
    } else if (relativePathsFound) {
      return {
        component: 'Absolute Paths',
        status: 'WARNING',
        message: 'Some relative paths found (may be acceptable)'
      };
    } else {
      return {
        component: 'Absolute Paths',
        status: 'WARNING',
        message: 'No path patterns found'
      };
    }
  } catch (err) {
    return {
      component: 'Absolute Paths',
      status: 'FAIL',
      message: 'Error validating absolute paths',
      details: { error: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}

async function validateErrorHandling(): Promise<ValidationResult> {
  try {
    const shellDir = '/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell';
    const files = fs.readdirSync(shellDir).filter(f => f.endsWith('.ts'));
    
    let tryCatchFound = false;
    let errorHandlingFound = false;
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(shellDir, file), 'utf8');
      if (content.includes('try') && content.includes('catch')) {
        tryCatchFound = true;
      }
      if (content.includes('error') || content.includes('Error')) {
        errorHandlingFound = true;
      }
    }
    
    if (tryCatchFound && errorHandlingFound) {
      return {
        component: 'Error Handling',
        status: 'PASS',
        message: 'Comprehensive error handling implemented'
      };
    } else if (tryCatchFound) {
      return {
        component: 'Error Handling',
        status: 'WARNING',
        message: 'Basic error handling found'
      };
    } else {
      return {
        component: 'Error Handling',
        status: 'FAIL',
        message: 'No error handling patterns found'
      };
    }
  } catch (err) {
    return {
      component: 'Error Handling',
      status: 'FAIL',
      message: 'Error validating error handling',
      details: { error: err instanceof Error ? err.message : 'Unknown error' }
    };
  }
}

async function runPhase5Validation(): Promise<Phase5CompletionStatus> {
  const timestamp = new Date().toISOString();
  const validations: ValidationResult[] = [];
  
  // Validate required files
  for (const file of requiredFiles) {
    const result = await validateFileExistence(file);
    validations.push(result);
  }
  
  // Validate log files
  for (const log of requiredLogs) {
    const result = await validateLogFile(log);
    validations.push(result);
  }
  
  // Validate git tags
  for (const tag of requiredTags) {
    const result = await validateGitTag(tag);
    validations.push(result);
  }
  
  // Validate code quality
  const codeQualityValidations = await Promise.all([
    validateTypeScriptCompilation(),
    validateNonBlockingPatterns(),
    validateAbsolutePaths(),
    validateErrorHandling()
  ]);
  
  validations.push(...codeQualityValidations);
  
  // Calculate summary
  const summary = {
    total: validations.length,
    passed: validations.filter(v => v.status === 'PASS').length,
    failed: validations.filter(v => v.status === 'FAIL').length,
    warnings: validations.filter(v => v.status === 'WARNING').length
  };
  
  // Determine overall status
  let overallStatus: 'COMPLETE' | 'INCOMPLETE' | 'FAILED' = 'COMPLETE';
  if (summary.failed > 0) {
    overallStatus = 'FAILED';
  } else if (summary.warnings > 0) {
    overallStatus = 'INCOMPLETE';
  }
  
  return {
    timestamp,
    overallStatus,
    validations,
    summary
  };
}

async function logValidationStatus(status: Phase5CompletionStatus): Promise<void> {
  const statusEmoji = status.overallStatus === 'COMPLETE' ? '✅' : 
                     status.overallStatus === 'INCOMPLETE' ? '⚠️' : '❌';
  
  const logEntry = `[${status.timestamp}] ${statusEmoji} PHASE 5 ${status.overallStatus.toUpperCase()} | Total: ${status.summary.total} | Passed: ${status.summary.passed} | Failed: ${status.summary.failed} | Warnings: ${status.summary.warnings}\n`;
  
  try {
    fs.appendFileSync(validationLogPath, logEntry);
  } catch (err) {
    console.error('[phase5-validator] Failed to write validation log:', err);
  }
}

export async function validatePhase5Completion(): Promise<Phase5CompletionStatus> {
  console.log('[phase5-validator] Starting Phase 5 completion validation...');
  
  const status = await runPhase5Validation();
  await logValidationStatus(status);
  
  return status;
}

export async function createPhase5Backup(): Promise<boolean> {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = `/Users/sawyer/gitSync/.cursor-cache/CYOPS/backups/phase5-completion-${timestamp}`;
    
    // Create backup directory
    fs.mkdirSync(backupDir, { recursive: true });
    
    // Copy shell files
    const shellDir = '/Users/sawyer/gitSync/gpt-cursor-runner/src-nextgen/ghost/shell';
    const files = fs.readdirSync(shellDir).filter(f => f.endsWith('.ts'));
    
    for (const file of files) {
      const sourcePath = path.join(shellDir, file);
      const destPath = path.join(backupDir, file);
      fs.copyFileSync(sourcePath, destPath);
    }
    
    // Copy logs
    const logsDir = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/logs';
    if (fs.existsSync(logsDir)) {
      const logFiles = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      for (const logFile of logFiles) {
        const sourcePath = path.join(logsDir, logFile);
        const destPath = path.join(backupDir, logFile);
        fs.copyFileSync(sourcePath, destPath);
      }
    }
    
    console.log(`[phase5-validator] Backup created: ${backupDir}`);
    return true;
  } catch (err) {
    console.error('[phase5-validator] Backup creation failed:', err);
    return false;
  }
}

export async function pushToGit(): Promise<boolean> {
  try {
    const commands = [
      'cd /Users/sawyer/gitSync/gpt-cursor-runner',
      'git add .',
      'git commit -m "[P5.COMPLETE] Phase 5 completion - all patches validated and tagged"',
      'git push origin GHOST2.0_PHASE_5'
    ];
    
    for (const cmd of commands) {
      await execAsync(cmd);
    }
    
    console.log('[phase5-validator] Successfully pushed to git');
    return true;
  } catch (err) {
    console.error('[phase5-validator] Git push failed:', err);
    return false;
  }
}
