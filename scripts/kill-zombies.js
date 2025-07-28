const { exec } = require('child_process');

function getGhostPids() {
  return new Promise((resolve) => {
    exec('ps aux | grep ghost | grep -v grep | awk \'{print $2}\'', (error, stdout, _stderr) => {
      if (error) {
        resolve([]);
      } else {
        resolve(stdout.toString().split('\n').filter(Boolean));
      }
    });
  });
}

function killProcess(pid) {
  return new Promise((resolve) => {
    exec(`kill -9 ${pid}`, (error, stdout, _stderr) => {
      if (error) {
        console.error(`Failed to kill PID ${pid}: ${error.message}`);
        resolve(false);
      } else {
        console.log(`✅ Killed PID ${pid}`);
        resolve(true);
      }
    });
  });
}

async function killZombies() {
  console.log('🔍 Scanning for ghost processes...');
  const pids = await getGhostPids();
  
  if (pids.length === 0) {
    console.log('✅ No ghost processes found');
    return;
  }
  
  console.log(`Found ${pids.length} ghost process(es):`, pids);
  
  for (const pid of pids) {
    await killProcess(pid);
  }
  
  console.log('✅ Zombie cleanup complete');
}

// Run if called directly
if (require.main === module) {
  killZombies().catch(console.error);
}

module.exports = { killZombies }; 