#!/usr/bin/env node

const { execSync } = require('child_process');
const __________fs = require('fs');
const __________path = require('path');

const MAX_ITERATIONS = 50; // Prevent infinite loops
const DELAY_BETWEEN_RUNS = 2000; // 2 seconds

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runESLint() {
  try {
    const output = execSync('npx eslint . --ext .js,.ts,.tsx --format json', {
      encoding: 'utf8',
      cwd: '/Users/sawyer/gitSync/gpt-cursor-runner',
      timeout: 30000,
    });
    return JSON.parse(output);
  } catch (error) {
    console.error('ESLint execution failed:', error.message);
    return [];
  }
}

function runESLintFix() {
  try {
    execSync('npx eslint . --ext .js,.ts,.tsx --fix', {
      encoding: 'utf8',
      cwd: '/Users/sawyer/gitSync/gpt-cursor-runner',
      timeout: 60000,
    });
    return true;
  } catch (error) {
    console.error('ESLint fix failed:', error.message);
    return false;
  }
}

function countErrors(results) {
  let totalErrors = 0;
  let totalWarnings = 0;

  results.forEach((file) => {
    totalErrors += file.errorCount || 0;
    totalWarnings += file.warningCount || 0;
  });

  return { errors: totalErrors, warnings: totalWarnings };
}

async function continuousFix() {
  console.log('🚀 Starting continuous ESLint fix loop...');
  console.log('This will run until all errors and warnings are resolved.');
  console.log('');

  let iteration = 0;
  let previousErrorCount = Infinity;
  let previousWarningCount = Infinity;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`\n🔄 Iteration ${iteration}/${MAX_ITERATIONS}`);

    // Run ESLint to get current status
    const results = runESLint();
    const { errors, warnings } = countErrors(results);

    console.log(`📊 Current status: ${errors} errors, ${warnings} warnings`);

    // Check if we've made progress
    if (errors === 0 && warnings === 0) {
      console.log('✅ All ESLint issues resolved!');
      break;
    }

    if (errors >= previousErrorCount && warnings >= previousWarningCount) {
      console.log('⚠️ No progress made in this iteration');
    }

    // Run auto-fix
    console.log('🔧 Running ESLint auto-fix...');
    const fixSuccess = runESLintFix();

    if (!fixSuccess) {
      console.log('❌ Auto-fix failed, continuing...');
    }

    // Wait before next iteration
    await sleep(DELAY_BETWEEN_RUNS);

    previousErrorCount = errors;
    previousWarningCount = warnings;
  }

  if (iteration >= MAX_ITERATIONS) {
    console.log('⚠️ Reached maximum iterations. Some issues may remain.');
  }

  // Final status check
  const finalResults = runESLint();
  const finalCounts = countErrors(finalResults);

  console.log('\n📊 Final Status:');
  console.log(`Errors: ${finalCounts.errors}`);
  console.log(`Warnings: ${finalCounts.warnings}`);

  if (finalCounts.errors === 0 && finalCounts.warnings === 0) {
    console.log('🎉 SUCCESS: All ESLint issues resolved!');
    process.exit(0);
  } else {
    console.log('⚠️ Some issues remain. Manual intervention may be needed.');
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹️ Continuous fix loop interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Continuous fix loop terminated');
  process.exit(0);
});

// Start the continuous fix loop
continuousFix().catch((error) => {
  console.error('❌ Continuous fix loop failed:', error);
  process.exit(1);
});
