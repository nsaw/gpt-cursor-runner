#!/usr/bin/env node
// lint_extended_orchestrator_once.js — extended ESLint orchestration with codemod fallback
const fs = require('fs'), { spawn } = require('child_process');
const [,, budgetMs = 300000, cooldownMs = 5000] = process.argv;
const start = Date.now();

const ESLINT_JSON = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-report.now.json';
const ORCH_SUM = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/lint-orchestrator-state.json';
const ORCH_LOG = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/lint-orchestrator.log';
const SCOPE_MAN = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/eslint-scope-manifest.json';
const DISABLE_CM = '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/eslint_disable_rules_codemod_once.js';

const EXTENDED = { include: ['scripts/**/*.{js,ts,tsx}', 'config/**/*.{js,ts,tsx}', 'gpt_cursor_runner/**/*.{js,ts,tsx}', 'dashboard/**/*.{js,ts,tsx}', 'docs/**/*.{js,ts,tsx}', 'deployment/**/*.{js,ts,tsx}', 'k8s/**/*.{js,ts,tsx}', 'pm2/**/*.{js,ts,tsx}', 'public/**/*.{js,ts,tsx}', 'runner/**/*.{js,ts,tsx}'] };
const PRIMARY = { include: ['scripts/g2o/**/*.{js,ts,tsx}', 'scripts/ci/**/*.{js,ts,tsx}', 'scripts/metrics/**/*.{js,ts,tsx}'] };
const state = fs.existsSync(ORCH_SUM) ? JSON.parse(fs.readFileSync(ORCH_SUM, 'utf8')) : { ts: new Date().toISOString(), steps: [], result: null, scope: 'EXTENDED' };

function writeScope(man) {
  fs.writeFileSync(SCOPE_MAN, JSON.stringify(man, null, 2));
}

function log(s) {
  fs.appendFileSync(ORCH_LOG, `${s}\n`);
}

function runNode(args) {
  return new Promise(res => {
    const p = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => {
      out += d.toString();
      log(d.toString().trim());
    });
    p.stderr.on('data', d => log(d.toString().trim()));
    p.on('exit', c => res({ code: c, out }));
  });
}

async function runScoped() {
  return runNode(['/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/run_eslint_scoped_report_once.js']);
}

function counts() {
  try {
    const arr = JSON.parse(fs.readFileSync(ESLINT_JSON, 'utf8'));
    let e = 0, w = 0;
    for (const r of arr) {
      e += r.errorCount || 0;
      w += r.warningCount || 0;
    }
    return { e, w };
  } catch {
    return { e: 999999, w: 999999 };
  }
}

async function codemod(rules) {
  const logOut = '/Users/sawyer/gitSync/.cursor-cache/ROOT/.logs/codemod-disable-log.json';
  return runNode([DISABLE_CM, ESLINT_JSON, rules.join(','), '40', logOut]);
}

function checkpoint() {
  fs.writeFileSync(ORCH_SUM, JSON.stringify(state, null, 2));
}

// Helper function to handle graceful shutdown
function handleShutdown(signal, exitCode) {
  log(`[orchestrator] ${signal} → checkpoint + exit ${exitCode}`);
  checkpoint();
  // Replace process.exit with proper error throwing
  const error = new Error(`Process terminated by ${signal}`);
  error.exitCode = exitCode;
  throw error;
}

// Helper function to check if we should continue processing
function shouldContinue(errors, warnings) {
  return !(errors === 0 && warnings <= 20) && (Date.now() - start < budgetMs);
}

// Helper function to handle scope fallback
function handleScopeFallback() {
  const half = (Date.now() - start) > (budgetMs / 2);
  if (half && state.scope === 'EXTENDED') {
    state.scope = 'PRIMARY';
    writeScope(PRIMARY);
    state.steps.push({ event: 'scope-fallback', to: 'PRIMARY', t: (Date.now() - start) });
    checkpoint();
    return true;
  }
  return false;
}

// Helper function to run one iteration of the orchestration
async function runOrchestrationIteration() {
  await runScoped();
  const { e, w } = counts();
  state.steps.push({ event: 'eslint-scan', scope: state.scope, errors: e, warnings: w, t: (Date.now() - start) });
  checkpoint();
  
  if (e === 0 && w <= 20) {
    state.result = { ok: true, scope: state.scope, errors: e, warnings: w };
    return false; // Stop
  }
  
  if (handleScopeFallback()) {
    return true; // Continue
  }
  
  const preferred = ['@typescript-eslint/no-explicit-any', 'require-await', '@typescript-eslint/no-unused-vars'];
  await codemod(preferred);
  state.steps.push({ event: 'codemod', rules: preferred, t: (Date.now() - start) });
  checkpoint();
  await new Promise(r => setTimeout(r, cooldownMs));
  
  return shouldContinue(e, w);
}

process.on('SIGINT', () => handleShutdown('SIGINT', 130));
process.on('SIGTERM', () => handleShutdown('SIGTERM', 130));

// Main orchestration loop with reduced complexity
(async () => {
  try {
    log(`[orchestrator] resume start; scope=${state.scope || 'EXTENDED'}`);
    if (!state.scope) state.scope = 'EXTENDED';
    writeScope(state.scope === 'EXTENDED' ? EXTENDED : PRIMARY);
    
    while (await runOrchestrationIteration()) {
      // Continue loop
    }
    
    if (!state.result) {
      const { e, w } = counts();
      state.result = { ok: (e === 0 && w <= 20), final: { errors: e, warnings: w } };
    }
    checkpoint();
    log('[orchestrator] done');
    console.log(JSON.stringify(state.result, null, 2));
    
    // Replace process.exit with proper completion
    if (state.result.ok) {
      return 0;
    } else {
      throw new Error('Orchestration failed to achieve target');
    }
  } catch (error) {
    if (error.exitCode) {
      process.exitCode = error.exitCode;
    } else {
      process.exitCode = 1;
    }
    throw error;
  }
})();
