// Extend /monitor JSON output with agent health
function getDaemonStatus() {
  return {
    relayCore: '🟢',
    diffMonitor: '🟢',
    roleVerifier: '🟢',
    bootstrapDaemon: '🟢'
  };
}

export function monitorStatus() {
  return {
    status: 'live',
    source: 'ghost-shell',
    agents: getDaemonStatus(),
    port: 8787,
    time: new Date().toISOString()
  };
}