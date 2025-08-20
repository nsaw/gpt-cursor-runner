/* eslint-disable */
const { test, expect, request } = require('@playwright/test');
test('health endpoint responds 200', async ({ }) => {
  const ctx = await request.newContext();
  const res = await ctx.get('/health');
  expect(res.status()).toBeGreaterThanOrEqual(200);
  expect(res.status()).toBeLessThan(400);
});
