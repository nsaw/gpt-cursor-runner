const { spawnSafe } = require('./utils/spawnSafe');

spawnSafe('node', ['scripts/patch-executor.js']);
spawnSafe('node', ['scripts/ghost-bridge.js']);