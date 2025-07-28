const { exec } = require('child_process');
exec('ngrok http 7474 --log=stdout', (err, stdout, stderr) => {
  if (err) return console.error('[Tunnel Fail]', err);
  console.log('[Tunnel Output]', stdout);
}); 