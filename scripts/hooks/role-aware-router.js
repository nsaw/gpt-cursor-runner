// Dispatch slash commands to appropriate processor
module.exports = function route(cmd) {
  const map = { '/phase8': 'phase8-handler', '/patch': 'patch-runner' };
  return map[cmd] || 'default-handler';
}; 