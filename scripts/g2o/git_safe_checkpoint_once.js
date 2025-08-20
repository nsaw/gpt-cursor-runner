/* eslint-disable */
const { spawnSync } = require('child_process');
const msg = (process.argv.includes('--message')) ? process.argv[process.argv.indexOf('--message')+1] : '[checkpoint] NB2.0';
const run = (bin, args)=> spawnSync(bin, args, { stdio: 'inherit' });
run('git', ['add', '-A']);
run('git', ['commit', '-m', msg, '--no-verify']);
process.exit(0);
