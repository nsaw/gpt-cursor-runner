const { buildStatus } = require('../status/dashboardStatusBuilder');

function loop() {
  buildStatus();
  setTimeout(loop, 10000); // every 10s
}

console.log('📡 Dashboard status daemon running...');
loop(); 