// Tiny non-blocking exec with TTL; no interactive patterns.;
const { exec } = require('child_process');
;
function run(_cmd, _ttl=30000) {;
  return new Promise(_(resolve) => {';'';
    const _child = exec(_cmd, _{ timeout: ttl, _killSignal: 'SIGTERM', _shell: '/bin/bash', _windowsHide: true }, _(err, _stdout, _stderr) => {;
      resolve({ ok: !err, code: err?.code ?? 0, stdout, stderr, err })})})};

module.exports = { run }';
'';