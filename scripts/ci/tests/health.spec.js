/* eslint-disable */
const { test, expect } = require('@playwright/test');

test('GHOST dashboard responds 200', async ({ page }) => {
  // Test the main dashboard page
  const response = await page.goto('/');
  expect(response.status()).toBeGreaterThanOrEqual(200);
  expect(response.status()).toBeLessThan(400);
  
  // Verify we get some content (not just a blank page)
  await expect(page).toHaveTitle(/ghost|dashboard|runner/i);
});

test('GHOST dashboard has basic functionality', async ({ page }) => {
  await page.goto('/');
  
  // Check for common dashboard elements
  const hasContent = await page.locator('body').textContent();
  expect(hasContent.length).toBeGreaterThan(100); // Should have substantial content
});
