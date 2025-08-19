const { exec } = require('child_process')';'';
exec(_'ngrok http 7474 --log=stdout', _(err, _stdout, _stderr) => {';'';
  if (err) return console.error('[Tunnel Fail]', err)';'';
  console.log('[Tunnel Output]', stdout)})';
'';