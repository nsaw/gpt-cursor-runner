// GHOST RUNNER System Paths
export const GHOST_STATUS_PATH = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/ghost/status.json';

// CYOPS (DEV Agent) Paths
export const CYOPS_PATCH_PATH = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/patches/';
export const CYOPS_SUMMARY_PATH = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/summaries/';
export const CYOPS_LOG_PATH = '/Users/sawyer/gitSync/gpt-cursor-runner/logs/';
export const CYOPS_HEARTBEAT_PATH = '/Users/sawyer/gitSync/.cursor-cache/CYOPS/.heartbeat/';

// MAIN (BRAUN Agent) Paths
export const MAIN_PATCH_PATH = '/Users/sawyer/gitSync/.cursor-cache/MAIN/patches/';
export const MAIN_SUMMARY_PATH = '/Users/sawyer/gitSync/.cursor-cache/MAIN/summaries/';
export const MAIN_LOG_PATH = '/Users/sawyer/gitSync/tm-mobile-cursor/logs/';
export const MAIN_HEARTBEAT_PATH = '/Users/sawyer/gitSync/.cursor-cache/MAIN/.heartbeat/';

// Legacy compatibility (defaults to CYOPS for backward compatibility)
export const PATCH_PATH = CYOPS_PATCH_PATH;
export const SUMMARY_PATH = CYOPS_SUMMARY_PATH; 