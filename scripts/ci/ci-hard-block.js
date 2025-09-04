#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CYOPS_ARTIFACTS = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/artifacts/reports';
const MAIN_ARTIFACTS = '/Users/sawyer/gitSync/.cursor-cache/MAIN/artifacts/reports';

// Ensure directories exist
[CYOPS_ARTIFACTS, MAIN_ARTIFACTS].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

function runWrapperAudit() {
  console.log('Running wrapper audit...');
  try {
    execSync('node scripts/ci/wrapper-audit.js', { encoding: 'utf8', stdio: 'pipe' });
    console.log('Wrapper audit completed successfully');
    return true;
  } catch (error) {
    console.error('Wrapper audit failed:', error.message);
    return false;
  }
}

function runFilenameGuard() {
  console.log('Running filename guard...');
  try {
    execSync('node scripts/ci/filename-guard.js', { encoding: 'utf8', stdio: 'pipe' });
    console.log('Filename guard completed successfully');
    return true;
  } catch (error) {
    console.error('Filename guard failed:', error.message);
    return false;
  }
}

function checkCompliance() {
  console.log('Checking CI compliance...');
  
  let allPassed = true;
  const results = {};
  
  // Check wrapper audit
  const wrapperAuditPassed = runWrapperAudit();
  results.wrapperAudit = wrapperAuditPassed;
  if (!wrapperAuditPassed) allPassed = false;
  
  // Check filename guard
  const filenameGuardPassed = runFilenameGuard();
  results.filenameGuard = filenameGuardPassed;
  if (!filenameGuardPassed) allPassed = false;
  
  // Check if reports exist and show compliance
  const checkReport = (reportPath, name) => {
    if (fs.existsSync(reportPath)) {
      try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const status = report.status || 'UNKNOWN';
        const violations = report.violations || 0;
        console.log(`${name}: ${status} (${violations} violations)`);
        
        if (status === 'FAIL' || violations > 0) {
          allPassed = false;
          results[name] = false;
        } else {
          results[name] = true;
        }
      } catch (err) {
        console.error(`Error reading ${name} report:`, err.message);
        allPassed = false;
        results[name] = false;
      }
    } else {
      console.log(`${name}: Report not found`);
      allPassed = false;
      results[name] = false;
    }
  };
  
  // Check CYOPS reports
  console.log('\nCYOPS Reports:');
  checkReport(path.join(CYOPS_ARTIFACTS, 'wrapper-audit.json'), 'CYOPS Wrapper Audit');
  checkReport(path.join(CYOPS_ARTIFACTS, 'filename-guard.json'), 'CYOPS Filename Guard');
  
  // Check MAIN reports
  console.log('\nMAIN Reports:');
  checkReport(path.join(MAIN_ARTIFACTS, 'wrapper-audit.json'), 'MAIN Wrapper Audit');
  checkReport(path.join(MAIN_ARTIFACTS, 'filename-guard.json'), 'MAIN Filename Guard');
  
  return { allPassed, results };
}

function main() {
  console.log('🚨 CI Hard-Block Enforcement');
  console.log('=============================\n');
  
  const { allPassed, results } = checkCompliance();
  
  console.log('\n=============================');
  console.log('CI Compliance Summary:');
  console.log('=============================');
  
  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${name}: ${status}`);
  });
  
  console.log('\n=============================');
  
  if (allPassed) {
    console.log('🎉 All CI checks passed! Build can proceed.');
    console.log('CI checks completed successfully');
  } else {
    console.log('🚨 CI checks failed! Build blocked.');
    console.log('\nTo fix:');
    console.log('1. Fix wrapper audit violations (use nb.cjs)');
    console.log('2. Fix filename guard violations (max 200 chars)');
    console.log('3. Re-run CI checks');
    throw new Error('CI hard block failed');
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkCompliance };
