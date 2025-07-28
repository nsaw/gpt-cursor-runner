const { exec } = require('child_process');

function checkExpoProcesses() {
  return new Promise((resolve) => {
    exec('ps aux | grep -i \'expo\' | grep -v grep', { encoding: 'utf8' }, (error, stdout, _stderr) => {
      if (error) {
        resolve({ running: false, error: error.message });
      } else {
        resolve({ running: stdout.trim().length > 0, output: stdout.trim() });
      }
    });
  });
}

async function expoGuard() {
  const result = await checkExpoProcesses();
  if (result.running) {
    console.log('⚠️  Expo process detected, blocking ghost runner startup');
    console.log('Expo processes found:', result.output);
    process.exit(1);
  }
  console.log('✅ No Expo processes detected, ghost runner can start');
}

module.exports = { expoGuard }; 