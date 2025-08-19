// Playwright config - headless by default
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  use: { headless: true },
  retries: 0,
  timeout: 60000,
});
