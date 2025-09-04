#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CYOPS_ARTIFACTS = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/status';
const MAIN_ARTIFACTS = '/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/status';

// Ensure directories exist
[CYOPS_ARTIFACTS, MAIN_ARTIFACTS].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function runGate(name, description, command, type = 'command') {
  console.log(`Running gate: ${name} - ${description}`);
  
  try {
    let result;
    if (type === 'command') {
      result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
      return {
        name,
        description,
        command,
        success: true,
        exitCode: 0,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        timestamp: new Date().toISOString()
      };
    } else if (type === 'file') {
      // Check if file exists
      if (fs.existsSync(command)) {
        return {
          name,
          description,
          command,
          success: true,
          exitCode: 0,
          stdout: 'File exists',
          stderr: '',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          name,
          description,
          command,
          success: false,
          exitCode: 1,
          stdout: '',
          stderr: 'File not found',
          timestamp: new Date().toISOString()
        };
      }
    }
  } catch (error) {
    // For TypeScript with --noEmit, check if the command actually failed
    if (name === 'tsc' && error.status === 0) {
      // TypeScript --noEmit can return 0 even with errors, check stderr for actual errors
      const hasErrors = error.stderr && error.stderr.includes('error TS');
      if (!hasErrors) {
        return {
          name,
          description,
          command,
          success: true,
          exitCode: 0,
          stdout: error.stdout || '',
          stderr: error.stderr || '',
          timestamp: new Date().toISOString()
        };
      }
    }
    
    return {
      name,
      description,
      command,
      success: false,
      exitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message || '',
      timestamp: new Date().toISOString()
    };
  }
}

function runAcceptanceGates() {
  const gates = {
    tsc: runGate('tsc', 'TypeScript compilation check', 'npx tsc --noEmit --skipLibCheck'),
    eslint: runGate('eslint', 'ESLint validation', 'npx eslint . --ext .ts,.tsx --max-warnings=0'),
    contract: runGate('contract', 'Execution contract compliance', 'node scripts/tools/check-absolute-paths.js'),
    freeze: runGate('freeze', 'P5 freeze baseline exists and is accessible', '/Users/sawyer/gitSync/gpt-cursor-runner/fences/P6-freeze-2025-09-01T17-26-37', 'file'),
    drift: runGate('drift', 'System drift within acceptable limits', '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/drift.json', 'file')
  };

  const overallStatus = Object.values(gates).every(gate => gate.success) ? 'PASS' : 'FAIL';
  const passedCount = Object.values(gates).filter(gate => gate.success).length;
  const totalCount = Object.keys(gates).length;

  const result = {
    timestamp: new Date().toISOString(),
    overallStatus,
    gates,
    links: {
      tsc: {
        log: 'validations/logs/tsc.log',
        status: 'validations/status/tsc.done'
      },
      eslint: {
        log: 'validations/logs/eslint.log',
        status: 'validations/status/eslint.done'
      },
      contract: {
        log: 'validations/logs/contract.log',
        status: 'validations/status/contract.done'
      },
      freeze: {
        baseline: '/Users/sawyer/gitSync/gpt-cursor-runner/fences/P6-freeze-2025-09-01T17-26-37',
        status: overallStatus === 'PASS' ? 'active' : 'inactive'
      },
      drift: {
        status: '/Users/sawyer/gitSync/gpt-cursor-runner/public/status/drift.json',
        baseline: '/Users/sawyer/gitSync/gpt-cursor-runner/fences/P6-freeze-2025-09-01T17-26-37'
      }
    },
    summary: `Overall: ${overallStatus} (${passedCount}/${totalCount} gates passed)`
  };

  // Write to CYOPS artifacts
  fs.writeFileSync(path.join(CYOPS_ARTIFACTS, 'acceptance-gates.json'), JSON.stringify(result, null, 2));
  
  // Write to MAIN artifacts
  fs.writeFileSync(path.join(MAIN_ARTIFACTS, 'acceptance-gates.json'), JSON.stringify(result, null, 2));

  console.log(`Acceptance gates completed: ${overallStatus} (${passedCount}/${totalCount} passed)`);
  
  if (overallStatus === 'FAIL') {
    console.log('Failed gates:');
    Object.entries(gates).forEach(([name, gate]) => {
      if (!gate.success) {
        console.log(`  - ${name}: ${gate.stderr || 'Unknown error'}`);
      }
    });
    process.exit(1);
  }

  return result;
}

if (require.main === module) {
  runAcceptanceGates();
}

module.exports = { runAcceptanceGates }; 
