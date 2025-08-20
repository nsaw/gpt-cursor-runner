/* eslint-disable */
// GHOST Dashboard smoke: verifies the dashboard responds on port 8787
// This tests the actual GHOST dashboard, not Expo/Metro
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  timeout: 25000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.PW_BASE_URL || 'http://127.0.0.1:8787' },
  projects: [{ name: 'ghost-dashboard' }],
  testDir: '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/tests',
});
