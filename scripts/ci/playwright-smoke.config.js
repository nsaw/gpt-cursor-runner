/* eslint-disable */
// Minimal API smoke: verifies a 200 on the health endpoint using Playwright APIRequest
// Adjust endpoint if needed to the unified 5051 proxy when available.
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  timeout: 25000,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.PW_BASE_URL || 'http://127.0.0.1:5051' },
  projects: [{ name: 'api-smoke' }],
  testDir: '/Users/sawyer/gitSync/gpt-cursor-runner/scripts/ci/tests',
});
